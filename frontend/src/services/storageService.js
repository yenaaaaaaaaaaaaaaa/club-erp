import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'

export const storageService = {
  /**
   * @returns {Promise<{ id: string, path: string, fullPath: string }>}
   */
  upload: async (bucket, path, file, options = {}) => {
    return query(() => supabase.storage.from(bucket).upload(path, file, options))
  },
  
  createSignedUrl: async (bucket, path, expiresIn = 3600) => {
    return query(() => supabase.storage.from(bucket).createSignedUrl(path, expiresIn))
  },
  
  remove: async (bucket, paths) => {
    if (!paths || !paths.length) return []
    return query(() => supabase.storage.from(bucket).remove(paths))
  }
}
