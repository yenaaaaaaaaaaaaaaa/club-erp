import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'

export const storageService = {
  upload: async (bucket, path, file, options = {}) => {
    return query(() => supabase.storage.from(bucket).upload(path, file, options))
  },
  
  createSignedUrl: async (bucket, path, expiresIn) => {
    return query(() => supabase.storage.from(bucket).createSignedUrl(path, expiresIn))
  },
  
  remove: async (bucket, paths) => {
    return query(() => supabase.storage.from(bucket).remove(paths))
  }
}
