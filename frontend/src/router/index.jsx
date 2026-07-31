import { createBrowserRouter, Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'

import LandingPage from '@/pages/landing/LandingPage'
import SetupPasswordPage from '@/pages/auth/SetupPasswordPage'
import AppLayout from '@/pages/app/AppLayout'
import PermissionRoute from '@/pages/app/PermissionRoute'
import MembersPage from '@/pages/app/members/MembersPage'

function PrivateRoute({ children }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return null
  if (!user) return <Navigate to="/" replace />
  return children
}

function NotFound403() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
      <p className="text-5xl font-bold text-gray-200">403</p>
      <p className="text-gray-500">접근 권한이 없습니다.</p>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/auth/setup-password',
    element: <SetupPasswordPage />,
  },
  {
    path: '/app',
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', element: <div>바보김용원</div> },
      {
        path: 'members',
        element: (
          <PermissionRoute perm="perm_members">
            <MembersPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'activities',
        element: (
          <PermissionRoute perm="perm_activities">
            <div>활동 관리</div>
          </PermissionRoute>
        ),
      },
      {
        path: 'notices',
        element: (
          <PermissionRoute perm="perm_notices">
            <div>공지 관리</div>
          </PermissionRoute>
        ),
      },
      {
        path: 'calendar',
        element: (
          <PermissionRoute perm="perm_calendar">
            <div>캘린더</div>
          </PermissionRoute>
        ),
      },
      {
        path: 'finance',
        element: (
          <PermissionRoute perm="perm_finance">
            <div>재정 관리</div>
          </PermissionRoute>
        ),
      },
      {
        path: 'settings/permissions',
        element: (
          <PermissionRoute perm="president">
            <div>권한 관리</div>
          </PermissionRoute>
        ),
      },
      { path: '403', element: <NotFound403 /> },
    ],
  },
])

export default router
