-- 기존 찌꺼기 테이블 초기화 (트랜잭션 롤백 실패 잔재 제거)
DROP TABLE IF EXISTS finance_files CASCADE;
DROP TABLE IF EXISTS finance CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS notice_files CASCADE;
DROP TABLE IF EXISTS notices CASCADE;
DROP TABLE IF EXISTS activity_attendances CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

-- 앱 전역 설정
CREATE TABLE app_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO app_settings VALUES ('current_semester', '26-1');

-- 역할
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_president boolean NOT NULL DEFAULT false,
  perm_members boolean NOT NULL DEFAULT false,
  perm_activities boolean NOT NULL DEFAULT false,
  perm_notices boolean NOT NULL DEFAULT false,
  perm_calendar boolean NOT NULL DEFAULT false,
  perm_finance boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 회장 역할은 시스템 전체에서 단 1개만 존재
CREATE UNIQUE INDEX one_president_role ON roles (is_president)
WHERE is_president = true;

-- 동아리 회원
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  name text NOT NULL,
  student_id text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  phone text,
  department text,
  college text,
  join_semester text,
  join_type text,
  grade integer,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 행사
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 출석
CREATE TABLE activity_attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  attended boolean NOT NULL DEFAULT false,
  note text,
  UNIQUE (activity_id, member_id)
);

-- 공지
CREATE TABLE notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  author_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 공지 첨부파일
CREATE TABLE notice_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id uuid NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

-- 캘린더 일정
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  content text,
  notice_id uuid REFERENCES notices(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 재정
CREATE TABLE finance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('수입', '지출')),
  item text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  note text,
  semester text NOT NULL CHECK (semester ~ '^[0-9]{2}-[12]$'),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 재정 증빙파일
CREATE TABLE finance_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finance_id uuid NOT NULL REFERENCES finance(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- notices.updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notices_updated_at
BEFORE UPDATE ON notices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 회장 역할 삭제 방지 트리거
CREATE OR REPLACE FUNCTION prevent_president_role_delete()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_president = true THEN
    RAISE EXCEPTION 'president_role_cannot_be_deleted';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_delete_president_role
BEFORE DELETE ON roles
FOR EACH ROW EXECUTE FUNCTION prevent_president_role_delete();

-- 회장 양도 RPC
CREATE OR REPLACE FUNCTION transfer_president(new_member_id uuid)
RETURNS void AS $$
DECLARE
  president_role_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM members WHERE id = new_member_id
  ) THEN
    RAISE EXCEPTION 'member_not_found';
  END IF;

  SELECT id INTO president_role_id FROM roles WHERE is_president = true;

  IF EXISTS (
    SELECT 1 FROM members WHERE id = new_member_id AND role_id = president_role_id
  ) THEN
    RAISE EXCEPTION 'already_president';
  END IF;

  UPDATE members SET role_id = NULL WHERE role_id = president_role_id;
  UPDATE members SET role_id = president_role_id WHERE id = new_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
