import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'

export const noticeService = {
  async getAll(limit = null) {
    return query(() => {
      let q = supabase.from('notices').select('*').order('created_at', { ascending: false })
      if (limit) q = q.limit(limit)
      return q
    })
  }
}
