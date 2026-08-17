import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'
import { memberService } from './memberService'

// 엑셀 출석 인식 값: 대소문자 'O', 한글 출석/참석 표기, 체크마크, boolean/1 등을 모두 출석으로 인정
const ATTENDED_VALUES = new Set(['o', '출석', '참석', '✓', 'v', true, 1, '1', 'true'])

export const activityService = {
  // 1. 행사 CRUD
  async getAll() {
    // select 문자열 안에서 .filter()를 체인할 수 없어 attended=true만 임베드 카운트가 불가능하므로
    // 쿼리를 분리해 JS에서 activity_id별로 집계한다.
    const activities = await query(() =>
      supabase
        .from('activities')
        .select('*')
        .order('date', { ascending: false })
    )

    const attendedRows = await query(() =>
      supabase
        .from('activity_attendances')
        .select('activity_id')
        .eq('attended', true)
    )

    const attendedCountByActivityId = attendedRows.reduce((acc, row) => {
      acc[row.activity_id] = (acc[row.activity_id] || 0) + 1
      return acc
    }, {})

    return activities.map((activity) => ({
      ...activity,
      attended_count: attendedCountByActivityId[activity.id] || 0,
    }))
  },

  async create({ title, date }) {
    return query(() =>
      supabase
        .from('activities')
        .insert({ title, date })
        .select()
        .single()
    )
  },

  async remove(id) {
    return query(() =>
      supabase
        .from('activities')
        .delete()
        .eq('id', id)
    )
  },

  // 2. 출석 관리 로직
  async getAttendances(activityId) {
    // 방법 B: 쿼리 분리 후 프론트/서비스 레이어에서 병합
    // 1. 전체 회원 조회
    const members = await memberService.getAll()

    // 2. 해당 행사 attendance 조회
    const attendances = await query(() =>
      supabase
        .from('activity_attendances')
        .select('*')
        .eq('activity_id', activityId)
    )

    // 3. member_id 기준 매핑 (Left Join 구현)
    const mapped = members.map((member) => {
      const attendance = attendances.find((a) => a.member_id === member.id)
      return {
        member,
        attendance: attendance || {
          activity_id: activityId,
          member_id: member.id,
          attended: false, // 미체크 시 기본값 false
          note: ''
        }
      }
    })

    return mapped
  },

  async upsertAttendance(data) {
    // data: { activity_id, member_id, attended, note }
    return query(() =>
      supabase
        .from('activity_attendances')
        .upsert(data, { onConflict: 'activity_id,member_id' })
        .select()
        .single()
    )
  },

  async updateNote({ id, activity_id, member_id, attended = false, note }) {
    // getAttendances()가 반환하는 미체크 멤버의 기본 attendance 객체에는 id가 없다.
    // id 없이 .eq('id', id)를 호출하면 조건 없는 전체 행 업데이트로 이어지므로,
    // 이 경우엔 새 출석 행을 생성하는 upsertAttendance()로 위임한다.
    if (!id) {
      return activityService.upsertAttendance({ activity_id, member_id, attended, note })
    }

    return query(() =>
      supabase
        .from('activity_attendances')
        .update({ note })
        .eq('id', id)
        .select()
        .single()
    )
  },

  async removeAttendance(id) {
    return query(() =>
      supabase
        .from('activity_attendances')
        .delete()
        .eq('id', id)
    )
  },

  // 3. 엑셀 연동 유틸 (학번 기준 매핑)
  async upsertAttendancesFromExcel(activityId, excelRows) {
    if (!Array.isArray(excelRows) || excelRows.length === 0) {
      throw new Error('올바른 엑셀 데이터가 아닙니다.')
    }

    // 학번 컬럼이 아예 없는(형식이 다른) 파일을 올린 경우 원인을 알 수 있도록 먼저 검증한다.
    const hasStudentIdColumn = excelRows.some(
      (row) => '학번' in row || 'student_id' in row
    )
    if (!hasStudentIdColumn) {
      throw new Error('엑셀 파일에 "학번" 컬럼이 없습니다. 템플릿 형식을 확인해주세요.')
    }

    // 1. 전체 회원 목록 확보하여 학번 -> member_id 맵 생성
    const members = await memberService.getAll()
    const memberIdByStudentId = {}
    members.forEach((m) => {
      memberIdByStudentId[m.student_id] = m.id
    })

    // 2. 엑셀 데이터 파싱 및 유효성 검증
    const validAttendances = []
    let skippedCount = 0

    excelRows.forEach((row) => {
      // 엑셀 컬럼명: 학번, 출석(O/X 또는 true/false), 비고
      // 엑셀 파서에 따라 키가 다를 수 있으므로 일반적으로 들어오는 값을 파싱
      const studentId = String(row['학번'] || row.student_id || '').trim()
      const attendedRaw = row['출석여부'] ?? row['출석'] ?? row.attended
      const attendedText =
        typeof attendedRaw === 'string' ? attendedRaw.trim().toLowerCase() : attendedRaw
      const isAttended = ATTENDED_VALUES.has(attendedText)

      const note = row['비고'] || row.note || ''

      const memberId = memberIdByStudentId[studentId]
      if (memberId) {
        validAttendances.push({
          activity_id: activityId,
          member_id: memberId,
          attended: isAttended,
          note: note,
        })
      } else {
        // 존재하지 않는 학번인 경우 스킵
        skippedCount++
      }
    })

    if (validAttendances.length === 0) {
      throw new Error(`저장할 유효한 출석 데이터가 없습니다. (스킵됨: ${skippedCount}건)`)
    }

    // 3. 일괄 Upsert 실행
    const result = await query(() =>
      supabase
        .from('activity_attendances')
        .upsert(validAttendances, { onConflict: 'activity_id,member_id' })
        .select()
    )

    return {
      upsertedCount: result.length,
      skippedCount,
    }
  },

  // 4. 엑셀 추출 (getAttendances와 동일한 컬럼 형식으로 내보내기)
  async exportAttendancesToExcel(activityId, activityTitle = '출석부') {
    const attendances = await activityService.getAttendances(activityId)

    const rows = attendances.map(({ member, attendance }) => ({
      학번: member.student_id,
      이름: member.name,
      출석여부: attendance.attended ? 'O' : 'X',
      비고: attendance.note || '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '출석부')
    XLSX.writeFile(workbook, `${activityTitle}_출석부.xlsx`)
  }
}
