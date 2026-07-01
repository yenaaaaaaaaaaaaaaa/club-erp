-- 헬퍼 함수

CREATE OR REPLACE FUNCTION is_president()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM members m
    JOIN roles r ON r.id = m.role_id
    WHERE m.user_id = auth.uid()
      AND r.is_president = true
  )
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_manage_members()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM members m
    JOIN roles r ON r.id = m.role_id
    WHERE m.user_id = auth.uid()
      AND (r.perm_members = true OR r.is_president = true)
  )
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_manage_activities()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM members m
    JOIN roles r ON r.id = m.role_id
    WHERE m.user_id = auth.uid()
      AND (r.perm_activities = true OR r.is_president = true)
  )
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_manage_notices()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM members m
    JOIN roles r ON r.id = m.role_id
    WHERE m.user_id = auth.uid()
      AND (r.perm_notices = true OR r.is_president = true)
  )
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_manage_calendar()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM members m
    JOIN roles r ON r.id = m.role_id
    WHERE m.user_id = auth.uid()
      AND (r.perm_calendar = true OR r.is_president = true)
  )
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_manage_finance()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM members m
    JOIN roles r ON r.id = m.role_id
    WHERE m.user_id = auth.uid()
      AND (r.perm_finance = true OR r.is_president = true)
  )
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS 활성화

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_files ENABLE ROW LEVEL SECURITY;

-- app_settings 정책

CREATE POLICY "app_settings_select" ON app_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "app_settings_update" ON app_settings
  FOR UPDATE USING (is_president());

-- roles 정책

CREATE POLICY "roles_select" ON roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "roles_insert" ON roles
  FOR INSERT WITH CHECK (is_president());

CREATE POLICY "roles_update" ON roles
  FOR UPDATE USING (is_president());

CREATE POLICY "roles_delete" ON roles
  FOR DELETE USING (is_president());

-- members 정책

CREATE POLICY "members_select" ON members
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "members_insert" ON members
  FOR INSERT WITH CHECK (can_manage_members());

-- 초대받은 임원이 최초 비밀번호 설정 시 자신의 user_id를 연결하기 위한 정책
-- user_id가 null인 행에 한해, 이메일이 일치하는 경우에만 자기 자신의 uid로 업데이트 허용
CREATE POLICY "members_link_self" ON members
  FOR UPDATE
  USING (
    user_id IS NULL
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_update" ON members
  FOR UPDATE USING (can_manage_members());

CREATE POLICY "members_delete" ON members
  FOR DELETE USING (can_manage_members());

-- activities 정책

CREATE POLICY "activities_select" ON activities
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "activities_insert" ON activities
  FOR INSERT WITH CHECK (can_manage_activities());

CREATE POLICY "activities_update" ON activities
  FOR UPDATE USING (can_manage_activities());

CREATE POLICY "activities_delete" ON activities
  FOR DELETE USING (can_manage_activities());

-- activity_attendances 정책

CREATE POLICY "activity_attendances_select" ON activity_attendances
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "activity_attendances_insert" ON activity_attendances
  FOR INSERT WITH CHECK (can_manage_activities());

CREATE POLICY "activity_attendances_update" ON activity_attendances
  FOR UPDATE USING (can_manage_activities());

CREATE POLICY "activity_attendances_delete" ON activity_attendances
  FOR DELETE USING (can_manage_activities());

-- notices 정책

CREATE POLICY "notices_select" ON notices
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "notices_insert" ON notices
  FOR INSERT WITH CHECK (can_manage_notices());

CREATE POLICY "notices_update" ON notices
  FOR UPDATE USING (can_manage_notices());

CREATE POLICY "notices_delete" ON notices
  FOR DELETE USING (can_manage_notices());

-- notice_files 정책

CREATE POLICY "notice_files_select" ON notice_files
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "notice_files_insert" ON notice_files
  FOR INSERT WITH CHECK (can_manage_notices());

CREATE POLICY "notice_files_delete" ON notice_files
  FOR DELETE USING (can_manage_notices());

-- events 정책

CREATE POLICY "events_select" ON events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "events_insert" ON events
  FOR INSERT WITH CHECK (can_manage_calendar());

CREATE POLICY "events_update" ON events
  FOR UPDATE USING (can_manage_calendar());

CREATE POLICY "events_delete" ON events
  FOR DELETE USING (can_manage_calendar());

-- finance 정책

CREATE POLICY "finance_select" ON finance
  FOR SELECT USING (can_manage_finance());

CREATE POLICY "finance_insert" ON finance
  FOR INSERT WITH CHECK (can_manage_finance());

CREATE POLICY "finance_update" ON finance
  FOR UPDATE USING (can_manage_finance());

CREATE POLICY "finance_delete" ON finance
  FOR DELETE USING (can_manage_finance());

-- finance_files 정책

CREATE POLICY "finance_files_select" ON finance_files
  FOR SELECT USING (can_manage_finance());

CREATE POLICY "finance_files_insert" ON finance_files
  FOR INSERT WITH CHECK (can_manage_finance());

CREATE POLICY "finance_files_delete" ON finance_files
  FOR DELETE USING (can_manage_finance());
