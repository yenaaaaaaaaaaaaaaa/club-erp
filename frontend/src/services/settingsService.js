import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'

export const settingsService = {
  getCurrentSemester: async () => {
    const data = await query(() =>
      supabase.from('app_settings')
        .select('value')
        .eq('key', 'current_semester')
        .maybeSingle()
    )
    return data?.value ?? null
  },

  setSemester: async (semester) => {
    if (!semester || typeof semester !== 'string' || !semester.trim()) {
      throw new Error('올바른 학기 값을 입력해주세요.')
    }
    return query(() =>
      supabase.from('app_settings')
        .upsert({ key: 'current_semester', value: semester.trim() })
    )
  }
}
