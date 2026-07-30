import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'
import { storageService } from '@/services/storageService'

const BUCKET = 'notice-files'
const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('PDF, PNG, JPG, DOCX 파일만 첨부할 수 있습니다')
  }
  if (file.size > MAX_SIZE) {
    throw new Error('파일 크기는 50MB를 초과할 수 없습니다')
  }
}

export const noticeService = {
  async getAll() {
    return query(() =>
      supabase.from('notices').select('*, notice_files(*)').order('created_at', { ascending: false })
    )
  },

  async getById(id) {
    return query(() =>
      supabase
        .from('notices')
        .select('*, notice_files(*), events(*)')
        .eq('id', id)
        .single()
    )
  },

  async create({ title, content, files = [] }) {
    for (const file of files) validateFile(file)

    const notice = await query(() =>
      supabase.from('notices').insert({ title, content }).select().single()
    )

    if (files.length > 0) {
      await noticeService.uploadFiles(notice.id, files)
    }

    return noticeService.getById(notice.id)
  },

  async update(id, { title, content }) {
    return query(() =>
      supabase
        .from('notices')
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    )
  },

  async remove(id) {
    // 1. storage 삭제를 위해 file_path 먼저 조회
    const files = await query(() =>
      supabase.from('notice_files').select('file_path').eq('notice_id', id)
    )

    // 2. notice_files DB 삭제
    await query(() =>
      supabase.from('notice_files').delete().eq('notice_id', id)
    )

    // 3. notices DB 삭제
    await query(() =>
      supabase.from('notices').delete().eq('id', id)
    )

    // 4. storage 삭제 (non-blocking — 실패해도 DB는 이미 삭제됨)
    if (files && files.length > 0) {
      const paths = files.map((f) => f.file_path)
      storageService.remove(BUCKET, paths).catch((err) => {
        console.error('storage 파일 삭제 실패 (무시):', err)
      })
    }
  },

  async uploadFiles(noticeId, files) {
    for (const file of files) {
      validateFile(file)
      const path = `${noticeId}/${Date.now()}_${file.name}`
      await storageService.upload(BUCKET, path, file)
      await query(() =>
        supabase.from('notice_files').insert({
          notice_id: noticeId,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
        })
      )
    }
  },

  async getSignedUrl(filePath) {
    const result = await storageService.createSignedUrl(BUCKET, filePath, 3600)
    return result.signedUrl
  },
}
