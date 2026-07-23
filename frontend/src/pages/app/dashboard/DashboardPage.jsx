import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useSemesterStore from '@/store/semesterStore'
import { memberService } from '@/services/memberService'
import { financeService } from '@/services/financeService'
import { eventService } from '@/services/eventService'
import { noticeService } from '@/services/noticeService'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { role } = useAuthStore()
  const semester = useSemesterStore((s) => s.semester)

  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState({
    memberCount: 0,
    balance: 0,
    events: [],
    notices: [],
  })

  useEffect(() => {
    if (!semester) return

    const fetchData = async () => {
      setIsLoading(true)
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      try {
        const [membersRes, financeRes, eventsRes, noticesRes] = await Promise.all([
          memberService.getAll(),
          role?.perm_finance ? financeService.getSummary(semester) : Promise.resolve(null),
          eventService.getByMonth(year, month),
          noticeService.getAll(5)
        ])

        setData({
          memberCount: membersRes.data?.length || 0,
          balance: financeRes ?? null,
          events: eventsRes.data || [],
          notices: noticesRes.data || [],
        })
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [semester, role])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 animate-pulse">
        <div className="flex gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 h-60 rounded-3xl border border-black bg-gray-200" />
          ))}
        </div>
        <div className="flex gap-5">
          <div className="flex-1 h-96 rounded-3xl border border-black bg-gray-200" />
          <div className="flex-1 h-96 rounded-3xl border border-black bg-gray-200" />
        </div>
        <div className="h-96 rounded-3xl border border-black bg-gray-200" />
      </div>
    )
  }

  // 잔액 표시 로직
  const displayBalance = role?.perm_finance 
    ? (data.balance !== null ? `${data.balance.toLocaleString()}원` : '데이터 없음')
    : '권한 없음'

  return (
    <div className="flex flex-col gap-5">
      {/* 1. 요약 카드 4개 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="h-60 p-5 rounded-3xl border border-black flex flex-col justify-center items-center bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xl text-zinc-500 mb-2 font-['Inter']">현재 학기</div>
          <div className="text-4xl font-semibold text-black font-['Inter']">{semester || '설정 안됨'}</div>
        </div>
        <div className="h-60 p-5 rounded-3xl border border-black flex flex-col justify-center items-center bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xl text-zinc-500 mb-2 font-['Inter']">현재 역할</div>
          <div className="text-4xl font-semibold text-black font-['Inter']">{role?.name || '권한 없음'}</div>
        </div>
        <div className="h-60 p-5 rounded-3xl border border-black flex flex-col justify-center items-center bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xl text-zinc-500 mb-2 font-['Inter']">현재 잔액</div>
          <div className="text-4xl font-semibold text-black font-['Inter']">{displayBalance}</div>
        </div>
        <div className="h-60 p-5 rounded-3xl border border-black flex flex-col justify-center items-center bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xl text-zinc-500 mb-2 font-['Inter']">총 회원 수</div>
          <div className="text-4xl font-semibold text-black font-['Inter']">{data.memberCount}명</div>
        </div>
      </div>

      {/* 2. 회원 현황 & 캘린더 위젯 */}
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 h-[450px] p-8 rounded-3xl border border-black bg-white shadow-sm flex flex-col">
          <div className="text-2xl font-semibold mb-4 text-black font-['Inter']">회원 현황</div>
          <div className="flex-1 flex justify-center items-center text-gray-400 bg-gray-50 rounded-xl">
            {data.memberCount > 0 ? '차트 준비 중...' : '데이터가 없습니다'}
          </div>
        </div>
        <div className="flex-1 h-[450px] p-8 rounded-3xl border border-black bg-white shadow-sm flex flex-col">
          <div className="text-2xl font-semibold mb-4 text-black font-['Inter']">이달의 캘린더</div>
          <div className="flex-1 overflow-auto rounded-xl">
            <FullCalendar
              plugins={[dayGridPlugin]}
              initialView="dayGridMonth"
              events={data.events.map(e => ({ title: e.title, start: e.start_date, end: e.end_date }))}
              height="100%"
              headerToolbar={{ left: 'title', right: 'prev,next' }}
            />
          </div>
        </div>
      </div>

      {/* 3. 공지 위젯 */}
      <div className="h-[450px] p-8 rounded-3xl border border-black bg-white shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="text-2xl font-semibold text-black font-['Inter']">최근 공지</div>
          <button 
            onClick={() => navigate('/app/notices')}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            전체보기 &rarr;
          </button>
        </div>
        <div className="flex-1 overflow-auto pr-2">
          {data.notices.length === 0 ? (
            <div className="h-full flex justify-center items-center text-gray-400 bg-gray-50 rounded-xl">
              데이터가 없습니다
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.notices.map(notice => (
                <li 
                  key={notice.id} 
                  className="p-5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-200 cursor-pointer transition-all"
                  onClick={() => navigate(`/app/notices`)}
                >
                  <div className="text-xl font-medium text-black mb-1 font-['Inter']">{notice.title}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(notice.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
