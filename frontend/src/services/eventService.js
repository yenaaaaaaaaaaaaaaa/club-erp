import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'

export const eventService = {
  async getByMonth(year, month) {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`
    // Next month calculation for end date
    const nextMonthDate = new Date(year, month, 1)
    const endStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`

    return query(() => 
      supabase.from('events')
        .select('*')
        .gte('start_date', startStr)
        .lt('start_date', endStr)
        .order('start_date', { ascending: true })
    )
  }
}
