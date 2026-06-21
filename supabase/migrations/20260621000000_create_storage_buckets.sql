-- Create storage buckets for notice-files and finance-files
-- notice-files: Max 50MB, allowed types: pdf/png/jpg/docx
-- finance-files: Max 20MB, allowed types: pdf/png/jpg
-- Both buckets are private (public = false) and will use signed URLs

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'notice-files', 
    'notice-files', 
    false, 
    52428800, -- 50MB (50 * 1024 * 1024)
    ARRAY[
      'application/pdf', 
      'image/png', 
      'image/jpeg', 
      'image/jpg', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'finance-files', 
    'finance-files', 
    false, 
    20971520, -- 20MB (20 * 1024 * 1024)
    ARRAY[
      'application/pdf', 
      'image/png', 
      'image/jpeg', 
      'image/jpg'
    ]
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =========================================================================
-- 보안 설정 (Row Level Security - RLS)
-- =========================================================================

-- storage.objects 테이블에 명시적으로 RLS를 활성화합니다.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 클라이언트(anon key)에서 signed URL을 생성하거나 파일을 읽으려면 SELECT 권한 정책이 필요합니다.

-- 1. 공지사항 첨부파일 (notice-files): 누구나 읽기 가능 정책 (조회)
DROP POLICY IF EXISTS "Allow public select for notice-files" ON storage.objects;
CREATE POLICY "Allow public select for notice-files"
ON storage.objects FOR SELECT
USING (bucket_id = 'notice-files');

-- 2. 재정 증빙 파일 (finance-files): 로그인한(authenticated) 사용자만 읽기 가능 정책 (조회)
DROP POLICY IF EXISTS "Allow authenticated select for finance-files" ON storage.objects;
CREATE POLICY "Allow authenticated select for finance-files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'finance-files');
