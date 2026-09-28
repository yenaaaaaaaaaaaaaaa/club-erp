import { useEffect, useRef, useState, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import koLocale from '@fullcalendar/core/locales/ko'
import { eventService } from '@/services/eventService'

const EMPTY_FORM = { title: '', start_date: '', end_date: '', notice_id: '', content: '' }

function pad(n) {
  return String(n).padStart(2, '0')
}
function toDateStr(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
// FullCalendar의 종일 일정 end는 배타적이므로 종료일 다음 날을 넘긴다.
function nextDay(str) {
  const [y, m, d] = str.split('-').map(Number)
  return toDateStr(new Date(y, m - 1, d + 1))
}
function formatDate(str) {
  return str ? str.replaceAll('-', '.') : ''
}
function formatRange(event) {
  if (!event.end_date || event.end_date === event.start_date) return formatDate(event.start_date)
  return `${formatDate(event.start_date)} ~ ${formatDate(event.end_date)}`
}

export default function CalendarPage() {
  const calendarRef = useRef(null)
  const requestRef = useRef(0)
  const [current, setCurrent] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [events, setEvents] = useState([])
  const [loadError, setLoadError] = useState('')
  const [notices, setNotices] = useState([])
  const [modal, setModal] = useState(null) // { type: 'form', event? , date? } | { type: 'detail', event }

  const loadEvents = useCallback(async (year, month) => {
    const requestId = ++requestRef.current
    try {
      const data = await eventService.getByMonth(year, month)
      if (requestId !== requestRef.current) return
      setEvents(data ?? [])
      setLoadError('')
    } catch (err) {
      if (requestId !== requestRef.current) return
      setEvents([])
      setLoadError(err.message || '일정을 불러오지 못했습니다')
    }
  }, [])

  useEffect(() => {
    eventService.getNoticeOptions()
      .then(data => setNotices(data ?? []))
      .catch(() => setNotices([]))
  }, [])

  const handleDatesSet = ({ view }) => {
    const start = view.currentStart
    const year = start.getFullYear()
    const month = start.getMonth() + 1
    setCurrent({ year, month })
    loadEvents(year, month)
  }

  const reload = () => loadEvents(current.year, current.month)

  const calendarEvents = events.map(ev => ({
    id: ev.id,
    title: ev.title,
    start: ev.start_date,
    end: ev.end_date ? nextDay(ev.end_date) : undefined,
    allDay: true,
    extendedProps: { raw: ev },
  }))

  return (
    <div className="flex flex-col gap-6">
      <style>{`
        .club-calendar .fc { --fc-border-color: #d1d5db; --fc-today-bg-color: #f9fafb; }
        .club-calendar .fc-theme-standard .fc-scrollgrid { border: 0; }
        .club-calendar .fc-scrollgrid-section > * { border-right: 0; border-bottom: 0; }
        .club-calendar .fc-col-header-cell:first-child, .club-calendar .fc-daygrid-day:first-child { border-left: 0; }
        .club-calendar .fc-col-header-cell:last-child, .club-calendar .fc-daygrid-day:last-child { border-right: 0; }
        .club-calendar .fc-col-header-cell { border-top: 0; }
        .club-calendar .fc-daygrid-body tr:last-child .fc-daygrid-day { border-bottom: 0; }
        .club-calendar .fc-col-header-cell { padding: 12px 0; font-weight: 600; font-size: 14px; color: #1f2937; }
        .club-calendar .fc-col-header-cell.fc-day-sun { color: #dc2626; }
        .club-calendar .fc-daygrid-day-frame { min-height: 112px; cursor: pointer; }
        .club-calendar .fc-daygrid-day:hover { background: #f9fafb; }
        .club-calendar .fc-daygrid-day-top { flex-direction: row; padding: 6px 8px 2px; }
        .club-calendar .fc-daygrid-day-number { font-size: 14px; color: #1f2937; padding: 0; }
        .club-calendar .fc-day-sun .fc-daygrid-day-number { color: #dc2626; }
        .club-calendar .fc-day-disabled { background: #f9fafb; cursor: default; }
        .club-calendar .fc-daygrid-event { margin: 2px 6px 0; border-radius: 6px; padding: 2px 6px; font-size: 12px; cursor: pointer; }
        .club-calendar .fc-event-title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; }
      `}</style>

      <div className="flex items-center justify-center gap-16 pt-2">
        <button
          onClick={() => calendarRef.current?.getApi().prev()}
          aria-label="이전 달"
          className="w-14 h-9 border border-gray-400 rounded-xl flex items-center justify-center text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition"
        >
          <ChevronIcon dir="left" />
        </button>
        <div className="text-center min-w-[140px]">
          <p className="text-3xl font-bold text-gray-900 leading-tight">{current.year}년</p>
          <p className="text-xl font-semibold text-gray-800 mt-1">{current.month}월</p>
        </div>
        <button
          onClick={() => calendarRef.current?.getApi().next()}
          aria-label="다음 달"
          className="w-14 h-9 border border-gray-400 rounded-xl flex items-center justify-center text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition"
        >
          <ChevronIcon dir="right" />
        </button>
      </div>

      {loadError && (
        <p className="text-sm text-red-500 text-center">{loadError}</p>
      )}

      <div className="club-calendar bg-white border border-gray-300 rounded-2xl overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={koLocale}
          headerToolbar={false}
          height="auto"
          fixedWeekCount={false}
          showNonCurrentDates={false}
          dayMaxEvents={3}
          dayHeaderFormat={{ weekday: 'short' }}
          dayCellContent={(arg) => arg.date.getDate()}
          events={calendarEvents}
          eventContent={(arg) => (
            // 주를 넘어가는 일정은 주마다 조각이 나뉘므로 시작 조각에만 제목을 표시한다.
            <div className="fc-event-title">{arg.isStart ? arg.event.title : '\u00a0'}</div>
          )}
          eventBackgroundColor="#e5e7eb"
          eventBorderColor="#e5e7eb"
          eventTextColor="#1f2937"
          datesSet={handleDatesSet}
          dateClick={(info) => {
            if (!info.dayEl.classList.contains('fc-day-disabled')) setModal({ type: 'form', date: info.dateStr })
          }}
          eventClick={(info) => setModal({ type: 'detail', event: info.event.extendedProps.raw })}
        />
      </div>

      {modal?.type === 'form' && (
        <EventFormModal
          event={modal.event}
          date={modal.date}
          notices={notices}
          onClose={() => setModal(null)}
          onSaved={(saved) => {
            reload()
            setModal(modal.event ? { type: 'detail', event: saved } : null)
          }}
        />
      )}
      {modal?.type === 'detail' && (
        <EventDetailModal
          event={modal.event}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: 'form', event: modal.event })}
          onDeleted={() => {
            reload()
            setModal(null)
          }}
        />
      )}
    </div>
  )
}

// ── 일정 등록/수정 모달 ────────────────────────────────────────
function EventFormModal({ event, date, notices, onClose, onSaved }) {
  const isEdit = !!event
  const [form, setForm] = useState(() => event
    ? {
      title: event.title ?? '',
      start_date: event.start_date ?? '',
      end_date: event.end_date ?? '',
      notice_id: event.notice_id ?? '',
      content: event.content ?? '',
    }
    : { ...EMPTY_FORM, start_date: date ?? '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // 연결된 공지가 목록에 없더라도(권한/정렬 등) 현재 선택값은 보여준다.
  const noticeOptions = event?.notices && !notices.some(n => n.id === event.notices.id)
    ? [event.notices, ...notices]
    : notices

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return setError('제목을 입력해 주세요')
    if (!form.start_date) return setError('날짜를 선택해 주세요')
    if (form.end_date && form.end_date < form.start_date) return setError('종료일은 시작일 이후여야 합니다')

    setSaving(true)
    setError('')
    try {
      const payload = {
        title: form.title.trim(),
        start_date: form.start_date,
        end_date: form.end_date || null,
        notice_id: form.notice_id || null,
        content: form.content.trim() || null,
      }
      const saved = isEdit
        ? await eventService.update(event.id, payload)
        : await eventService.create(payload)
      onSaved(saved)
    } catch (err) {
      setError(err.message || '저장에 실패했습니다')
      setSaving(false)
    }
  }

  const inputClass = 'w-full bg-neutral-700 border border-neutral-500 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-400 outline-none focus:border-neutral-300 transition-colors [color-scheme:dark]'

  return (
    <DarkModal title={isEdit ? '일정 수정' : '일정 등록'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="px-8 py-6 flex flex-col gap-4">
          <Field label="제목">
            <input value={form.title} onChange={set('title')} placeholder="일정 제목을 입력하세요" className={inputClass} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="시작일">
              <input type="date" value={form.start_date} onChange={set('start_date')} className={inputClass} />
            </Field>
            <Field label="종료일">
              <input type="date" value={form.end_date} min={form.start_date || undefined} onChange={set('end_date')} className={inputClass} />
            </Field>
          </div>
          <Field label="공지 연결">
            <select value={form.notice_id} onChange={set('notice_id')} className={`${inputClass} cursor-pointer`}>
              <option value="">연결 안 함</option>
              {noticeOptions.map(n => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
          </Field>
          <Field label="내용">
            <textarea value={form.content} onChange={set('content')} rows={4} placeholder="일정 내용을 입력하세요" className={`${inputClass} resize-none`} />
          </Field>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="mx-6 border-t border-neutral-500" />
        <div className="px-8 py-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving}
            className="px-4 py-2 border border-neutral-400 text-neutral-200 text-sm rounded-lg hover:bg-neutral-500 disabled:opacity-50 cursor-pointer transition-colors">취소</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 border border-neutral-200 bg-neutral-100 text-neutral-800 text-sm font-medium rounded-lg hover:bg-white disabled:opacity-50 cursor-pointer transition-colors">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </DarkModal>
  )
}

// ── 일정 상세 모달 ─────────────────────────────────────────────
function EventDetailModal({ event, onClose, onEdit, onDeleted }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      await eventService.remove(event.id)
      onDeleted()
    } catch (err) {
      setError(err.message || '삭제에 실패했습니다')
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <>
      <DarkModal title="일정 상세" onClose={() => !confirming && onClose()}>
        <div className="px-8 py-8 grid grid-cols-2 gap-x-8 gap-y-5 min-h-[200px] content-start">
          <DetailItem label="이벤트명" value={event.title} />
          <DetailItem label="날짜" value={formatRange(event)} />
          <DetailItem label="연관 공지" value={event.notices?.title} className="col-span-2" />
          <DetailItem label="내용" value={event.content} className="col-span-2" multiline />
          {error && <p className="col-span-2 text-sm text-red-400">{error}</p>}
        </div>
        <div className="mx-6 border-t border-neutral-500" />
        <div className="px-8 py-4 flex justify-end gap-3">
          <button onClick={onEdit}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-neutral-300 text-neutral-100 text-sm rounded-lg hover:bg-neutral-500 cursor-pointer transition-colors">
            <EditIcon />수정
          </button>
          <button onClick={() => setConfirming(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-red-400 text-red-400 text-sm rounded-lg hover:bg-red-900/30 cursor-pointer transition-colors">
            <TrashIcon />삭제
          </button>
        </div>
      </DarkModal>

      {confirming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30" onClick={() => !deleting && setConfirming(false)}>
          <div className="bg-neutral-600 rounded-2xl shadow-xl px-8 py-6 flex flex-col items-center gap-4 min-w-[260px]" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-medium text-white">일정을 삭제하겠습니까?</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="px-5 py-2 border border-red-400 text-red-400 text-sm rounded-xl hover:bg-red-900/30 disabled:opacity-50 cursor-pointer transition-colors">확인</button>
              <button onClick={() => setConfirming(false)} disabled={deleting}
                className="px-5 py-2 border border-neutral-400 text-neutral-200 text-sm rounded-xl hover:bg-neutral-500 disabled:opacity-50 cursor-pointer transition-colors">취소</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── 공통 다크 모달 ─────────────────────────────────────────────
function DarkModal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-[520px] bg-neutral-600 rounded-3xl shadow-2xl text-white" onClick={e => e.stopPropagation()}>
        <div className="mx-6 pt-5 pb-4 flex items-center justify-between border-b border-neutral-500">
          <h2 className="text-lg font-medium px-2">{title}</h2>
          <button onClick={onClose} aria-label="닫기" className="p-1 text-neutral-200 hover:text-white cursor-pointer transition-colors">
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-neutral-300">{label}</span>
      {children}
    </label>
  )
}

function DetailItem({ label, value, className = '', multiline = false }) {
  return (
    <div className={className}>
      <p className="text-xs text-neutral-300 mb-1">{label}</p>
      <p className={`text-sm ${value ? 'text-white' : 'text-neutral-400'} ${multiline ? 'whitespace-pre-wrap break-words' : 'break-words'}`}>
        {value || '-'}
      </p>
    </div>
  )
}

function ChevronIcon({ dir }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}
