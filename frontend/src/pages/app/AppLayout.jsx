import { Outlet } from 'react-router-dom'

export default function AppLayout() {
  return (
    <div>
      <aside>사이드바 (F-03에서 구현)</aside>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
