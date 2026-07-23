import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'

export const financeService = {
  async getSummary(semester) {
    if (!semester) return 0
    return query(async () => {
      const { data, error } = await supabase
        .from('finance')
        .select('type, amount')
        .eq('semester', semester)
      
      if (error) throw error

      let total = 0
      data.forEach(row => {
        if (row.type === '수입') total += row.amount
        if (row.type === '지출') total -= row.amount
      })
      
      return total
    })
  }
}
