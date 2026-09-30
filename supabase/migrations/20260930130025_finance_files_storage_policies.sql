-- finance-files 버킷의 INSERT/DELETE 정책
-- (20260621000000_create_storage_buckets.sql의 "TODO: INSERT/DELETE 정책은 B-xx에서 추가 예정" 해소)
--
-- SELECT는 기존 정책대로 로그인 사용자 전체에게 열려 있으나,
-- 업로드와 삭제는 finance 테이블 정책과 동일하게 재정 관리 권한자로 제한한다.

DROP POLICY IF EXISTS "Allow finance managers to insert finance-files" ON storage.objects;
CREATE POLICY "Allow finance managers to insert finance-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'finance-files' AND (SELECT can_manage_finance()));

DROP POLICY IF EXISTS "Allow finance managers to delete finance-files" ON storage.objects;
CREATE POLICY "Allow finance managers to delete finance-files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'finance-files' AND (SELECT can_manage_finance()));
