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

  async remove(id) {
    return query(() =>
      supabase.from('members').delete().eq('id', id)
    )
  },

  async getOfficers() {
    return query(() =>
      supabase.from('members').select('*, roles(name, is_president)').order('created_at')
    )
  },
}
