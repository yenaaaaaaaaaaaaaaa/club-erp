import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'

const EVENT_SELECT = '*, notices(id, title)'
const EVENT_FIELDS = ['title', 'start_date', 'end_date', 'content', 'notice_id']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function daysInMonth(year, month) {
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  return [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
}

function validateDate(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label}은 YYYY-MM-DD 형식의 올바른 날짜여야 합니다`)
  }
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new Error(`${label}은 YYYY-MM-DD 형식의 올바른 날짜여야 합니다`)
  }
}

function validateId(id, label) {
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    throw new Error(`올바른 ${label} ID가 필요합니다`)
  }
}

function validateDateRange(startDate, endDate) {
  if (endDate && endDate < startDate) {
    throw new Error('종료일은 시작일 이후여야 합니다')
  }
}

function prepareFields(data, isCreate = false) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('올바른 일정 정보를 입력해 주세요')
  }
  // id, created_by 등 이슈의 요청 명세에 없는 필드는 쓰지 않는다.
  const fields = Object.fromEntries(EVENT_FIELDS
    .filter(key => Object.hasOwn(data, key) && data[key] !== undefined)
    .map(key => [key, data[key]]))

  if (isCreate || Object.hasOwn(fields, 'title')) {
    if (typeof fields.title !== 'string' || !fields.title.trim()) {
      throw new Error('제목은 필수 입력 항목입니다')
    }
    fields.title = fields.title.trim()
  }
  if (isCreate || Object.hasOwn(fields, 'start_date')) validateDate(fields.start_date, '시작일')
  if (Object.hasOwn(fields, 'end_date')) {
    if (fields.end_date === '' || fields.end_date === null) fields.end_date = null
    else validateDate(fields.end_date, '종료일')
  }
  if (Object.hasOwn(fields, 'notice_id')) {
    if (fields.notice_id === '' || fields.notice_id === null) fields.notice_id = null
    else validateId(fields.notice_id, '공지')
  }
  if (Object.hasOwn(fields, 'content') && fields.content !== null && typeof fields.content !== 'string') {
    throw new Error('내용은 문자열이어야 합니다')
  }
  if (!Object.keys(fields).length) throw new Error('수정할 항목이 없습니다')
  return fields
}

// events의 외래키는 notice_id, created_by 두 개이므로 23503은 제약 이름으로 구분한다.
const ERROR_MESSAGES = [
  [(err) => err.code === '42501', '캘린더 관리 권한이 없습니다'],
  [(err) => err.code === 'PGRST116', '일정을 찾을 수 없거나 접근 권한이 없습니다'],
  [(err) => err.code === '23503' && err.message?.includes('notice_id'), '선택한 공지가 삭제되었습니다. 다시 선택해 주세요'],
  [(err) => err.code === '23514' && err.message?.includes('events_end_date_after_start_date'), '종료일은 시작일 이후여야 합니다'],
]

// 위 오류를 사용자 메시지로 바꾸되, 원인 파악을 위해 원본 코드와 오류를 보존한다.
async function run(fn) {
  try {
    return await query(fn)
  } catch (err) {
    if (!err?.code) throw err
    const matched = ERROR_MESSAGES.find(([isMatch]) => isMatch(err))
    if (!matched) throw err
    throw Object.assign(new Error(matched[1]), { code: err.code, cause: err })
  }
}

export const eventService = {
  // month는 1~12. 해당 월과 기간이 겹치는 일정을 모두 조회한다(8/30~9/2처럼 월 경계를 걸친 일정 포함).
  async getByMonth(year, month) {
    if (!Number.isInteger(year) || year < 1 || year > 9999 ||
      !Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('올바른 연도와 월(1~12)을 입력해 주세요')
    }
    const prefix = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
    const firstDay = `${prefix}-01`
    const lastDay = `${prefix}-${daysInMonth(year, month)}`
    return query(() => supabase.from('events')
      .select(EVENT_SELECT)
      .lte('start_date', lastDay)
      .or(`end_date.gte.${firstDay},and(end_date.is.null,start_date.gte.${firstDay})`)
      .order('start_date', { ascending: true })
      .order('id', { ascending: true }))
  },

  async create(data) {
    const fields = prepareFields(data, true)
    validateDateRange(fields.start_date, fields.end_date)
    return run(() => supabase.from('events').insert(fields).select(EVENT_SELECT).single())
  },

  // 부분 수정 지원: 날짜 한쪽만 바뀌어도 저장된 다른 날짜와 비교한다.
  async update(id, data) {
    validateId(id, '일정')
    const fields = prepareFields(data)
    if (Object.hasOwn(fields, 'start_date') || Object.hasOwn(fields, 'end_date')) {
      let startDate = fields.start_date
      let endDate = fields.end_date
      if (startDate === undefined || endDate === undefined) {
        const current = await run(() => supabase.from('events')
          .select('start_date, end_date').eq('id', id).single())
        if (startDate === undefined) startDate = current.start_date
        if (endDate === undefined) endDate = current.end_date
      }
      validateDateRange(startDate, endDate)
    }
    return run(() => supabase.from('events').update(fields).eq('id', id).select(EVENT_SELECT).single())
  },

  async remove(id) {
    validateId(id, '일정')
    // 공지는 삭제하지 않는다. 삭제된 행을 확인해 권한 부족/없는 ID의 무변경을 성공으로 처리하지 않는다.
    return run(() => supabase.from('events').delete().eq('id', id).select('id').single())
  },

  async getNoticeOptions() {
    return query(() => supabase.from('notices').select('id, title')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true }))
  },
}
