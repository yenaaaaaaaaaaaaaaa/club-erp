import { createBrowserRouter, Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'

import LandingPage from '@/pages/landing/LandingPage'
import SetupPasswordPage from '@/pages/auth/SetupPasswordPage'
import AppLayout from '@/pages/app/AppLayout'

function PrivateRoute({ children }) {
  const { user, isLoading } = useAuthStore()

  if (isLoading) return null

  if (!user) return <Navigate to="/" replace />

  return children
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
      { path: 'dashboard', element: <div>대시보드</div> },
      { path: 'members', element: <div>회원 관리</div> },
      { path: 'activities', element: <div>활동 관리</div> },
      { path: 'notices', element: <div>공지 관리</div> },
      { path: 'calendar', element: <div>캘린더</div> },
      { path: 'finance', element: <div>재정 관리</div> },
      { path: 'settings/permissions', element: <div>권한 관리</div> },
    ],
  },
])

export default router
