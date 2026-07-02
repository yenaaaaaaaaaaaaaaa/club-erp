import { NavLink, useNavigate } from 'react-router-dom'
import { authService } from '@/lib/auth'
import useAuthStore from '@/store/authStore'

const MENU = [
  {
    group: '메인',
    items: [
      { label: '대시보드', path: '/app/dashboard', perm: null, icon: <GridIcon /> },
    ],
  },
  {
    group: '관리',
    items: [
      { label: '회원 관리', path: '/app/members', perm: 'perm_members', icon: <UsersIcon /> },
      { label: '활동 관리', path: '/app/activities', perm: 'perm_activities', icon: <CheckIcon /> },
      { label: '공지 관리', path: '/app/notices', perm: 'perm_notices', icon: <BellIcon /> },
      { label: '캘린더', path: '/app/calendar', perm: 'perm_calendar', icon: <CalendarIcon /> },
    ],
  },
  {
    group: '재정',
    items: [
      { label: '재정 관리', path: '/app/finance', perm: 'perm_finance', icon: <WalletIcon /> },
    ],
  },
  {
    group: '설정',
    items: [
      { label: '권한 관리', path: '/app/settings/permissions', perm: 'president', icon: <ShieldIcon /> },
    ],
  },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { role } = useAuthStore()

  const isAllowed = (perm) => {
    if (!perm) return true
    if (!role) return false
    if (role.is_president) return true
    if (perm === 'president') return false
    return role[perm] === true
  }

  const handleLogout = async () => {
    await authService.logout()
    navigate('/')
  }

  return (
    <aside className="w-[280px] min-h-screen border-r border-gray-200 flex flex-col bg-white">
      <div className="px-6 py-5 border-b border-gray-100 cursor-pointer hover:opacity-70 transition" onClick={() => navigate('/app/dashboard')}>
        <p className="font-bold text-base leading-tight">CLUB-ERP</p>
        <p className="text-xs text-gray-400 mt-0.5">동아리 운영 관리 시스템</p>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {MENU.map(({ group, items }) => (
          <div key={group} className="mb-2">
            <p className="px-6 py-1.5 text-xs text-gray-400">{group}</p>
            {items.map(({ label, path, perm, icon }) => {
              const allowed = isAllowed(perm)
              return (
                <NavLink
                  key={path}
                  to={allowed ? path : '#'}
                  onClick={(e) => !allowed && e.preventDefault()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-6 py-2.5 text-sm transition
                    ${!allowed ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                    ${isActive && allowed ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`
                  }
                >
                  <span className="w-4 h-4 flex-shrink-0">{icon}</span>
                  {label}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M20 12V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
      <path d="M20 12h-4a2 2 0 0 0 0 4h4V12z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
