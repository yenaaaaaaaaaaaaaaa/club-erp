import { supabase } from '@/lib/supabase'
import { query } from '@/lib/supabaseQuery'
import { storageService } from '@/services/storageService'

const BUCKET = 'notice-files'
export const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
export const MAX_SIZE = 50 * 1024 * 1024 // 50MB

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('pdf, png, jpg, docx 파일만 첨부 가능합니다')
  }
  if (file.size > MAX_SIZE) {
    throw new Error('파일 크기는 50MB 이하여야 합니다')
  }
}

export const noticeService = {
  async getAll() {
    return query(() =>
      supabase.from('notices').select('id, title, created_at, author_id').order('created_at', { ascending: false })
    )
  },

  async getById(id) {
    return query(() =>
      supabase
        .from('notices')
        .select('*, notice_files(*), events(id, title, start_date)')
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
      try {
        await noticeService.uploadFiles(notice.id, files)
      } catch (err) {
        // 파일 업로드 실패 시 생성된 공지 롤백
        await query(() => supabase.from('notices').delete().eq('id', notice.id)).catch(() => {})
        throw err
      }
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
        console.error('storage 파일 삭제 실패:', paths, err)
      })
    }
  },

  async uploadFiles(noticeId, files) {
    for (const file of files) {
      validateFile(file)
      const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'bin'
      const path = `${noticeId}/${Date.now()}.${ext}`
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

  async removeFiles(fileIds) {
    const rows = await query(() =>
      supabase.from('notice_files').select('file_path').in('id', fileIds)
    )
    await query(() =>
      supabase.from('notice_files').delete().in('id', fileIds)
    )
    if (rows?.length > 0) {
      storageService.remove(BUCKET, rows.map(r => r.file_path)).catch(err =>
        console.error('storage 파일 삭제 실패:', err)
      )
    }
  },

  async getSignedUrl(filePath) {
    const result = await storageService.createSignedUrl(BUCKET, filePath, 3600)
    return result.signedUrl
  },
}
