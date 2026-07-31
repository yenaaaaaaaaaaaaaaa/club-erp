import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'

export const roleService = {
  // 1. 역할 목록 조회 (members 수 포함)
  async getAll() {
    return query(() =>
      supabase.from('roles').select('*, members(count)').order('created_at')
    )
  },

  // 2. 역할 단건 조회 (보유 임원 포함)
  async getById(id) {
    return query(() =>
      supabase.from('roles').select('*, members(id, name, student_id, phone, department, role_id, created_at)').eq('id', id).single()
    )
  },

  // 3. 역할 생성 (is_president 강제 false)
  async create({ name, description, perm_members, perm_activities, perm_notices, perm_calendar, perm_finance }) {
    try {
      return await query(() =>
        supabase.from('roles').insert({
          name,
          description: description ?? null,
          is_president: false,
          perm_members: perm_members ?? false,
          perm_activities: perm_activities ?? false,
          perm_notices: perm_notices ?? false,
          perm_calendar: perm_calendar ?? false,
          perm_finance: perm_finance ?? false,
        }).select().single()
      )
    } catch (err) {
      if (err.code === '23505') throw new Error('이미 존재하는 역할 이름입니다')
      throw err
    }
  },

  // 4. 역할 수정 (is_president 수정 불가 — 허용 키만 필터링)
  async update(id, patch) {
    const ALLOWED_KEYS = ['name', 'description', 'perm_members', 'perm_activities', 'perm_notices', 'perm_calendar', 'perm_finance']
    const fields = Object.fromEntries(
      Object.entries(patch)
        .filter(([k]) => ALLOWED_KEYS.includes(k))
        .map(([k, v]) => [k, v === undefined ? null : v])
    )
    if (Object.keys(fields).length === 0) throw new Error('수정할 항목이 없습니다.')
    return query(() =>
      supabase.from('roles').update(fields).eq('id', id).select().single()
    )
  },

  // 5. 역할 삭제 (이중 차단: 서비스 레이어 + DB 트리거)
  async remove(id) {
    const role = await query(() =>
      supabase.from('roles').select('is_president').eq('id', id).single()
    )
    if (role.is_president) throw new Error('회장 역할은 삭제할 수 없습니다')
    await query(() =>
      supabase.from('members').update({ role_id: null }).eq('role_id', id)
    )
    return query(() =>
      supabase.from('roles').delete().eq('id', id)
    )
  },

  // 6. 임원 등록 + 초대 메일 발송 (members INSERT 먼저 → Edge Function 호출, 실패 시 롤백)
  async inviteOfficer({ name, student_id, email, role_id }) {
    let member
    try {
      member = await query(() =>
        supabase.from('members').insert({ name, student_id, email, role_id }).select('id').single()
      )
    } catch (err) {
      if (err.code === '23505') {
        if (err.message?.includes('email')) throw new Error('이미 초대된 이메일입니다')
        if (err.message?.includes('student_id')) throw new Error('이미 등록된 학번입니다')
      }
      throw err
    }
    const { error, data } = await supabase.functions.invoke('invite-officer', {
      body: { email },
    })
    if (error || data?.error) {
      await supabase.from('members').delete().eq('id', member.id)
      const msg = data?.error ?? ''
      if (msg.includes('이미 가입')) throw new Error('이미 가입된 이메일입니다')
      if (msg.includes('이미 초대') || msg.includes('already')) throw new Error('이미 초대된 이메일입니다')
      throw new Error('초대 메일 발송에 실패했습니다.')
    }
  },

  // 7. 회장 양도 (RPC 단일 트랜잭션)
  async transferPresident(newMemberId) {
    try {
      return await query(() =>
        supabase.rpc('transfer_president', { new_member_id: newMemberId })
      )
    } catch (err) {
      if (err.message?.includes('member_not_found')) throw new Error('존재하지 않는 임원입니다')
      if (err.message?.includes('already_president')) throw new Error('이미 회장입니다')
      throw new Error('양도 중 오류가 발생했습니다. 다시 시도해 주세요')
    }
  },

}
