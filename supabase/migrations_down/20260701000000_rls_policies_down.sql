-- 정책 제거

DROP POLICY IF EXISTS "app_settings_select" ON app_settings;
DROP POLICY IF EXISTS "app_settings_update" ON app_settings;

DROP POLICY IF EXISTS "roles_select" ON roles;
DROP POLICY IF EXISTS "roles_insert" ON roles;
DROP POLICY IF EXISTS "roles_update" ON roles;
DROP POLICY IF EXISTS "roles_delete" ON roles;

DROP POLICY IF EXISTS "members_select" ON members;
DROP POLICY IF EXISTS "members_insert" ON members;
DROP POLICY IF EXISTS "members_update" ON members;
DROP POLICY IF EXISTS "members_delete" ON members;

DROP POLICY IF EXISTS "activities_select" ON activities;
DROP POLICY IF EXISTS "activities_insert" ON activities;
DROP POLICY IF EXISTS "activities_update" ON activities;
DROP POLICY IF EXISTS "activities_delete" ON activities;

DROP POLICY IF EXISTS "activity_attendances_select" ON activity_attendances;
DROP POLICY IF EXISTS "activity_attendances_insert" ON activity_attendances;
DROP POLICY IF EXISTS "activity_attendances_update" ON activity_attendances;
DROP POLICY IF EXISTS "activity_attendances_delete" ON activity_attendances;

DROP POLICY IF EXISTS "notices_select" ON notices;
DROP POLICY IF EXISTS "notices_insert" ON notices;
DROP POLICY IF EXISTS "notices_update" ON notices;
DROP POLICY IF EXISTS "notices_delete" ON notices;

DROP POLICY IF EXISTS "notice_files_select" ON notice_files;
DROP POLICY IF EXISTS "notice_files_insert" ON notice_files;
DROP POLICY IF EXISTS "notice_files_delete" ON notice_files;

DROP POLICY IF EXISTS "events_select" ON events;
DROP POLICY IF EXISTS "events_insert" ON events;
DROP POLICY IF EXISTS "events_update" ON events;
DROP POLICY IF EXISTS "events_delete" ON events;

DROP POLICY IF EXISTS "finance_select" ON finance;
DROP POLICY IF EXISTS "finance_insert" ON finance;
DROP POLICY IF EXISTS "finance_update" ON finance;
DROP POLICY IF EXISTS "finance_delete" ON finance;

DROP POLICY IF EXISTS "finance_files_select" ON finance_files;
DROP POLICY IF EXISTS "finance_files_insert" ON finance_files;
DROP POLICY IF EXISTS "finance_files_delete" ON finance_files;

-- RLS 비활성화

ALTER TABLE finance_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE finance DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE notice_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE notices DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_attendances DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;

-- 헬퍼 함수 제거

DROP FUNCTION IF EXISTS can_manage_finance();
DROP FUNCTION IF EXISTS can_manage_calendar();
DROP FUNCTION IF EXISTS can_manage_notices();
DROP FUNCTION IF EXISTS can_manage_activities();
DROP FUNCTION IF EXISTS can_manage_members();
DROP FUNCTION IF EXISTS is_president();
