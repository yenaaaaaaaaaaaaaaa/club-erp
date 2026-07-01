import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'

export const settingsService = {
  getCurrentSemester: async () => {
    const data = await query(() => 
      supabase.from('app_settings')
        .select('value')
        .eq('key', 'current_semester')
        .single()
    )
    return data.value
  },

  setSemester: async (semester) => {
    return query(() => 
      supabase.from('app_settings')
        .upsert({ key: 'current_semester', value: semester })
    )
  }
}
