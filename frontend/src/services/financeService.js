import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'
import { storageService } from '@/services/storageService'

const BUCKET = 'finance-files'
const FINANCE_SELECT = '*, finance_files(*)'
const FINANCE_FIELDS = ['date', 'type', 'item', 'amount', 'note', 'semester']
const FINANCE_TYPES = ['수입', '지출']
const SEMESTER_PATTERN = /^\d{2}-[12]$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 집계는 전체 행을 훑어야 하므로 PostgREST 기본 응답 상한(1000행)에 맞춰 나눠 받는다.
const PAGE_SIZE = 1000

export const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
export const MAX_SIZE = 20 * 1024 * 1024 // 20MB

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

function validateSemester(value) {
  if (typeof value !== 'string' || !SEMESTER_PATTERN.test(value)) {
    throw new Error('학기는 26-1 형식이어야 합니다')
  }
}

function validateType(value) {
  if (!FINANCE_TYPES.includes(value)) {
    throw new Error('유형은 수입 또는 지출이어야 합니다')
  }
}

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('pdf, png, jpg 파일만 업로드 가능합니다')
  }
  if (file.size > MAX_SIZE) {
    throw new Error('파일 크기는 20MB 이하여야 합니다')
  }
}

function prepareFields(data, isCreate = false) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('올바른 재정 내역을 입력해 주세요')
  }
  // id, created_by 등 이슈의 요청 명세에 없는 필드는 쓰지 않는다.
  const fields = Object.fromEntries(FINANCE_FIELDS
    .filter(key => Object.hasOwn(data, key) && data[key] !== undefined)
    .map(key => [key, data[key]]))

  if (isCreate || Object.hasOwn(fields, 'date')) validateDate(fields.date, '날짜')
  if (isCreate || Object.hasOwn(fields, 'type')) validateType(fields.type)
  if (isCreate || Object.hasOwn(fields, 'semester')) validateSemester(fields.semester)
  if (isCreate || Object.hasOwn(fields, 'item')) {
    if (typeof fields.item !== 'string' || !fields.item.trim()) {
      throw new Error('항목명은 필수 입력 항목입니다')
    }
    fields.item = fields.item.trim()
  }
  // 지출도 양수로 저장한다(DB CHECK amount > 0). 화면의 "-" 표시는 프론트에서 처리한다.
  if (isCreate || Object.hasOwn(fields, 'amount')) {
    if (!Number.isInteger(fields.amount) || fields.amount < 1) {
      throw new Error('금액은 1원 이상이어야 합니다')
    }
  }
  if (Object.hasOwn(fields, 'note')) {
    if (fields.note === '' || fields.note === null) fields.note = null
    else if (typeof fields.note !== 'string') throw new Error('비고는 문자열이어야 합니다')
  }
  if (!Object.keys(fields).length) throw new Error('수정할 항목이 없습니다')
  return fields
}

// CHECK 제약은 컬럼 인라인 정의라 이름이 finance_{컬럼}_check로 붙는다.
const ERROR_MESSAGES = [
  [(err) => err.code === '42501', '재정 관리 권한이 없습니다'],
  [(err) => err.code === 'PGRST116', '내역을 찾을 수 없거나 접근 권한이 없습니다'],
  [(err) => err.code === '23514' && err.message?.includes('finance_amount_check'), '금액은 1원 이상이어야 합니다'],
  [(err) => err.code === '23514' && err.message?.includes('finance_type_check'), '유형은 수입 또는 지출이어야 합니다'],
  [(err) => err.code === '23514' && err.message?.includes('finance_semester_check'), '학기는 26-1 형식이어야 합니다'],
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

export const financeService = {
  // filters: { semester, type('수입'|'지출'|'전체'), startDate, endDate, search }
  async getAll(filters = {}) {
    const { semester, type, startDate, endDate, search } = filters
    if (semester !== undefined && semester !== null) validateSemester(semester)
    if (type && type !== '전체') validateType(type)
    if (startDate) validateDate(startDate, '시작일')
    if (endDate) validateDate(endDate, '종료일')
    if (startDate && endDate && endDate < startDate) {
      throw new Error('종료일은 시작일 이후여야 합니다')
    }

    return run(() => {
      // 같은 날짜가 여러 건이면 순서가 매번 달라지므로 id로 2차 정렬한다.
      let q = supabase.from('finance')
        .select(FINANCE_SELECT)
        .order('date', { ascending: false })
        .order('id', { ascending: true })
      if (semester) q = q.eq('semester', semester)
      if (type && type !== '전체') q = q.eq('type', type)
      if (startDate) q = q.gte('date', startDate)
      if (endDate) q = q.lte('date', endDate)
      if (typeof search === 'string' && search.trim()) {
        q = q.ilike('item', `%${search.trim()}%`)
      }
      return q
    })
  },

  async getById(id) {
    validateId(id, '내역')
    return run(() =>
      supabase.from('finance').select(FINANCE_SELECT).eq('id', id).single()
    )
  },

  // 잔액은 수입 합계 - 지출 합계. amount는 항상 양수로 저장돼 있으므로 부호는 여기서 만든다.
  async getSummary(semester) {
    validateSemester(semester)

    let income = 0
    let expense = 0
    for (let from = 0; ; from += PAGE_SIZE) {
      const rows = await run(() =>
        supabase.from('finance')
          .select('type, amount')
          .eq('semester', semester)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)
      )
      for (const row of rows) {
        if (row.type === '수입') income += row.amount
        else expense += row.amount
      }
      if (rows.length < PAGE_SIZE) break
    }

    return { income, expense, balance: income - expense }
  },

  async create({ files = [], ...data }) {
    const fields = prepareFields(data, true)
    // 업로드 중간에 실패해 내역만 남는 일이 없도록 삽입 전에 전부 검사한다.
    for (const file of files) validateFile(file)

    const finance = await run(() =>
      supabase.from('finance').insert(fields).select().single()
    )

    if (files.length > 0) {
      try {
        await financeService.uploadFiles(finance.id, files)
      } catch (err) {
        // 파일 업로드 실패 시 생성된 내역 롤백
        await query(() => supabase.from('finance').delete().eq('id', finance.id)).catch(() => {})
        throw err
      }
    }

    return financeService.getById(finance.id)
  },

  async update(id, data) {
    validateId(id, '내역')
    const fields = prepareFields(data)
    return run(() =>
      supabase.from('finance').update(fields).eq('id', id).select(FINANCE_SELECT).single()
    )
  },

  // 삭제 순서: finance_files DB → finance DB → Storage.
  // Storage 삭제가 실패해도 DB는 이미 지워졌으므로 로그만 남기고 정상 반환한다.
  async remove(id) {
    validateId(id, '내역')

    const files = await run(() =>
      supabase.from('finance_files').select('file_path').eq('finance_id', id)
    )

    await run(() => supabase.from('finance_files').delete().eq('finance_id', id))
    await run(() => supabase.from('finance').delete().eq('id', id))

    if (files?.length > 0) {
      const paths = files.map(f => f.file_path)
      try {
        await storageService.remove(BUCKET, paths)
      } catch (err) {
        console.error('storage 파일 삭제 실패:', paths, err)
      }
    }
  },

  async uploadFiles(financeId, files) {
    validateId(financeId, '내역')
    for (const [index, file] of files.entries()) {
      validateFile(file)
      // 한글·공백이 섞인 원본 파일명은 Storage 키로 쓸 수 없어 확장자만 남긴다.
      // 같은 밀리초에 여러 건이 올라가도 겹치지 않도록 순번을 붙인다. 원본 이름은 file_name에 보관.
      const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'bin'
      const path = `${financeId}/${Date.now()}_${index}.${ext}`
      await storageService.upload(BUCKET, path, file)
      await run(() =>
        supabase.from('finance_files').insert({
          finance_id: financeId,
          file_name: file.name,
          file_path: path,
        })
      )
    }
  },

  async removeFiles(fileIds) {
    if (!fileIds?.length) return
    for (const fileId of fileIds) validateId(fileId, '파일')

    const rows = await run(() =>
      supabase.from('finance_files').select('file_path').in('id', fileIds)
    )
    await run(() => supabase.from('finance_files').delete().in('id', fileIds))

    if (rows?.length > 0) {
      const paths = rows.map(r => r.file_path)
      try {
        await storageService.remove(BUCKET, paths)
      } catch (err) {
        console.error('storage 파일 삭제 실패:', paths, err)
      }
    }
  },

  async getSignedUrl(filePath) {
    const result = await storageService.createSignedUrl(BUCKET, filePath, 3600)
    return result.signedUrl
  },
}
