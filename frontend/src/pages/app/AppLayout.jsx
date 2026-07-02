import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { settingsService } from '@/services/settingsService'
import useSemesterStore from '@/store/semesterStore'

const TITLE_MAP = {
  '/app/dashboard': '대시보드',
  '/app/members': '회원 관리',
  '/app/activities': '활동 관리',
  '/app/notices': '공지 관리',
  '/app/calendar': '캘린더',
  '/app/finance': '재정 관리',
  '/app/settings/permissions': '권한 관리',
}

export default function AppLayout() {
  const location = useLocation()
  const setSemester = useSemesterStore((s) => s.setSemester)

  useEffect(() => {
    settingsService.getCurrentSemester()
      .then(setSemester)
      .catch(() => {})
  }, [])

  const title = TITLE_MAP[location.pathname] ?? ''

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
