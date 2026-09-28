-- [B-05] 활동/출석 조회 권한 제한
--
-- 기존 activities_select / activity_attendances_select 정책은 auth.uid() IS NOT NULL만
-- 확인했다. 화면은 PermissionRoute(perm_activities)로 막혀 있지만 anon key가 클라이언트에
-- 노출되어 있어, 활동 권한이 없는 회원도 API를 직접 호출해 출석·비고를 조회할 수 있었다.
-- INSERT/UPDATE/DELETE와 동일하게 can_manage_activities() 기준으로 맞춘다.
--
-- USING 절을 (SELECT ...)로 감싸는 이유: can_manage_activities()는 VOLATILE이라
-- 플래너가 결과를 캐싱하지 못하고 스캔하는 행마다 재실행된다. 서브쿼리로 감싸면
-- InitPlan으로 한 번만 평가된다. (함수 자체를 STABLE로 바꾸는 편이 근본적이지만
-- 다른 정책에도 영향이 있어 B-05 범위 밖으로 둔다.)
--
-- 정책 이름은 테이블 내에서 유일해야 하므로 DROP 후 재생성한다.

DROP POLICY IF EXISTS "activities_select" ON activities;

CREATE POLICY "activities_select" ON activities
  FOR SELECT USING ((SELECT can_manage_activities()));

DROP POLICY IF EXISTS "activity_attendances_select" ON activity_attendances;

CREATE POLICY "activity_attendances_select" ON activity_attendances
  FOR SELECT USING ((SELECT can_manage_activities()));