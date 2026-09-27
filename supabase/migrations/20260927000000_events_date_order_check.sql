-- events: 종료일이 시작일보다 앞서는 데이터를 DB에서 차단
-- 서비스 레이어 검증(eventService)은 부분 수정 시 '읽기 → 쓰기' 사이의 동시 수정을 막지 못한다.
-- (예: A가 end_date만, B가 start_date만 동시에 수정하면 각자의 검증은 통과하고 역전된 행이 남는다)
--
-- 적용 전 위반 데이터 확인 — 결과가 있으면 먼저 정정해야 ALTER TABLE이 실패하지 않는다:
--   SELECT id, title, start_date, end_date FROM events WHERE end_date < start_date;

ALTER TABLE events
  ADD CONSTRAINT events_end_date_after_start_date
  CHECK (end_date IS NULL OR end_date >= start_date);
