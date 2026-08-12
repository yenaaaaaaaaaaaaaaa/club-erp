import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'

export const memberService = {
  async assignRole(memberId, roleId) {
    return query(() =>
      supabase.from('members').update({ role_id: roleId }).eq('id', memberId)
    )
  },

  async removeRole(memberId) {
    return query(() =>
      supabase.from('members').update({ role_id: null }).eq('id', memberId)
    )
  },

  async getAll(filters = {}) {
    return query(() => {
      let q = supabase.from('members').select('*, roles(name, is_president)').order('created_at')
      if (filters.search) {
        q = q.or(`name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`)
      }
      if (filters.join_semester) {
        q = q.eq('join_semester', filters.join_semester)
      }
      if (filters.paid !== undefined && filters.paid !== '') {
        q = q.eq('paid', filters.paid === 'true')
      }
      return q
    })
  },

  async getById(id) {
    return query(() =>
      supabase.from('members').select('*, roles(name)').eq('id', id).single()
    )
  },

  async create(data) {
    try {
      const { user_id, role_id, ...safeData } = data
      return await query(() =>
        supabase.from('members').insert(safeData).select().single()
      )
    } catch (err) {
      if (err.code === '23505') {
        if (err.message?.includes('student_id')) throw new Error('이미 등록된 학번입니다')
      }
      throw err
    }
  },

  async update(id, data) {
    try {
      const { user_id, role_id, ...safeData } = data
      return await query(() =>
        supabase.from('members').update(safeData).eq('id', id).select().single()
      )
    } catch (err) {
      if (err.code === '23505') {
        if (err.message?.includes('student_id')) throw new Error('이미 등록된 학번입니다')
      }
      throw err
    }
  },

  async remove(id) {
    return query(() =>
      supabase.from('members').delete().eq('id', id)
    )
  },

  async upsertBulk(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('올바른 엑셀 형식이 아닙니다. 템플릿을 확인하세요')
    }
    rows.forEach((row, i) => {
      if (!row.name?.trim() || !row.student_id?.trim()) {
        throw new Error(`${i + 1}번째 행: 이름과 학번은 필수 입력 항목입니다`)
      }
    })
    const safeRows = rows.map(({ user_id, role_id, ...rest }) => rest)
    try {
      return await query(() =>
        supabase.from('members').upsert(safeRows, { onConflict: 'student_id' }).select()
      )
    } catch (err) {
      if (err.message?.includes('cannot affect row a second time')) {
        throw new Error('엑셀 내 중복된 학번이 있습니다. 확인 후 다시 시도해주세요')
      }
      throw err
    }
  },

  async getOfficers() {
    return query(() =>
      supabase.from('members').select('*, roles(name, is_president)').order('created_at')
    )
  },
}
