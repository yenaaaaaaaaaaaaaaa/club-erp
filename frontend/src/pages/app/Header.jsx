import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/lib/auth'
import useAuthStore from '@/store/authStore'

export default function Header({ title }) {
  const navigate = useNavigate()
  const { role, member } = useAuthStore()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await authService.logout()
    navigate('/')
  }

  return (
    <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white">
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-3">
        {role?.name && (
          <span className="border border-gray-300 rounded-full px-4 py-1 text-sm text-gray-600">
            {role.name}
          </span>
        )}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer"
          >
            <UserIcon />
          </button>

          <div
            style={{
              transition: open
                ? 'max-height 0.5s ease-in-out'
                : 'max-height 0.5s ease-in-out, border-color 0s 0.5s',
            }}
            className={`absolute right-0 top-10 w-52 bg-white border rounded-xl shadow-lg z-50 overflow-hidden ${
              open ? 'max-h-96 border-gray-200' : 'max-h-0 border-transparent pointer-events-none'
            }`}
          >
            <div className="py-2">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                  <UserIcon />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{member?.name ?? '-'}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {role?.name ?? '-'}{member?.student_id ? ` / ${member.student_id}` : ''}
                  </p>
                </div>
              </div>
              <div className="py-1">
                <button className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                  내 정보
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                  내 권한보기
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                  계정 설정
                </button>
              </div>
              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition cursor-pointer"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}
