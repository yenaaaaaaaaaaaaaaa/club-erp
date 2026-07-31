import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'

export const eventService = {
  async getNoticeOptions() {
    return query(() =>
      supabase.from('events').select('id, title, start_date').order('start_date', { ascending: false })
    )
  },

  async getByNoticeId(noticeId) {
    return query(() =>
      supabase.from('events').select('id, title, start_date').eq('notice_id', noticeId)
    )
  },
}
