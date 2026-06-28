-- 1. 함수 및 트리거 삭제
DROP TRIGGER IF EXISTS no_delete_president_role ON roles;
DROP FUNCTION IF EXISTS prevent_president_role_delete();

DROP TRIGGER IF EXISTS notices_updated_at ON notices;
DROP FUNCTION IF EXISTS set_updated_at();

DROP FUNCTION IF EXISTS transfer_president(uuid);

-- 2. 테이블 삭제 (참조 무결성을 위해 역순으로 삭제)
DROP TABLE IF EXISTS finance_files;
DROP TABLE IF EXISTS finance;

DROP TABLE IF EXISTS events;

DROP TABLE IF EXISTS notice_files;
DROP TABLE IF EXISTS notices;

DROP TABLE IF EXISTS activity_attendances;
DROP TABLE IF EXISTS activities;

DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS roles;

DROP TABLE IF EXISTS app_settings;
