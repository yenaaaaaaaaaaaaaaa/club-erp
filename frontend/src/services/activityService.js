import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'
import { memberService } from './memberService'

export const activityService = {
  // 1. 행사 CRUD
  async getAll() {
    return query(() =>
      supabase
        .from('activities')
        // PostgREST 문법: activity_attendances 의 attended=true 개수를 센다.
        .select('*, activity_attendances(count).filter("attended", "eq", true)')
        .order('date', { ascending: false })
    )
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

  async updateNote(id, note) {
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
      const isAttended =
        row['출석여부'] === 'O' ||
        row['출석'] === 'O' ||
        row.attended === true ||
        row.attended === 'true'

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
  }
}
