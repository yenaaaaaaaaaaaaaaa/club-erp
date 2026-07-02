import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/lib/auth'

const ACCENT = '#7B8FC4'

export default function LandingPage() {
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [view, setView] = useState('login') // 'login' | 'reset'

  const openModal = () => {
    setView('login')
    setModalOpen(true)
  }
  const closeModal = () => setModalOpen(false)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header onLoginClick={openModal} />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <span
          className="inline-block border rounded-full px-4 py-1 text-sm mb-8"
          style={{ borderColor: ACCENT, color: ACCENT }}
        >
          동아리 운영 관리 시스템
        </span>

        <h1 className="text-6xl font-extrabold leading-tight mb-6 md:text-7xl">
          동아리 운영,
          <br />
          <span style={{ color: ACCENT }}>하나로 관리</span>하세요
        </h1>

        <p className="text-gray-400 text-lg mb-10 leading-relaxed">
          회원 관리부터 활동, 재정, 공지까지
          <br />
          흩어진 업무를 하나의 플랫폼에서 처리 하세요
        </p>

        <button
          onClick={openModal}
          className="px-8 py-3 rounded-full text-white font-medium text-base transition hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: ACCENT }}
        >
          바로가기 →
        </button>
      </main>

      <Footer />

      {modalOpen && (
        <LoginModal
          view={view}
          setView={setView}
          onClose={closeModal}
          onLoginSuccess={() => {
            closeModal()
            navigate('/app/dashboard')
          }}
        />
      )}
    </div>
  )
}

function Header({ onLoginClick }) {
  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
      <div className="cursor-pointer hover:opacity-70 transition" onClick={() => window.scrollTo({ top: 0 })}>
        <p className="text-xl font-bold leading-tight">CLUB-ERP</p>
        <p className="text-xs text-gray-400">동아리 운영 관리 시스템</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onLoginClick}
          className="px-5 py-2 rounded-md text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 transition cursor-pointer"
        >
          로그인
        </button>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 px-8 pt-10 pb-6 bg-gray-50">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between gap-8 mb-8">
        <div>
          <p className="font-bold text-base">CLUB-ERP</p>
          <p className="text-sm text-gray-400 mt-1">동아리 운영 관리 시스템</p>
        </div>
        <div className="flex gap-16">
          <div>
            <p className="text-sm font-semibold mb-3">About Us</p>
            <a
              href="https://github.com/yenaaaaaaaaaaaaaaa/club-erp"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition"
            >
              <GithubIcon />
              github
            </a>
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">Contact Us</p>
            <a
              href="https://www.instagram.com/yena_o.0"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition"
            >
              <InstagramIcon />
              Instagram
            </a>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center">
        © 2026 club-erp · Made by 취업하자 · GitHub
      </p>
    </footer>
  )
}

function LoginModal({ view, setView, onClose, onLoginSuccess }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <p className="text-xl font-bold">CLUB-ERP</p>
          <p className="text-xs text-gray-400 mt-1">동아리 운영 관리 시스템</p>
        </div>

        {view === 'login' ? (
          <LoginForm onSuccess={onLoginSuccess} onForgot={() => setView('reset')} />
        ) : (
          <ResetForm onBack={() => setView('login')} />
        )}
      </div>
    </div>
  )
}

function LoginForm({ onSuccess, onForgot }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email) return setError('이메일을 입력해주세요.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('올바른 이메일 형식이 아닙니다.')
    if (!password) return setError('비밀번호를 입력해주세요.')

    setLoading(true)
    try {
      await authService.login(email, password)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-gray-500"
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-gray-500"
      />

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-md text-white text-sm font-medium bg-gray-900 hover:bg-gray-700 transition disabled:opacity-60 cursor-pointer"
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>

      <div className="flex justify-center gap-3 text-xs text-gray-400 pt-1">
        <button type="button" onClick={onForgot} className="hover:text-gray-600 transition cursor-pointer">
          비밀번호 재설정
        </button>
      </div>
    </form>
  )
}

function ResetForm({ onBack }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email) return setError('이메일을 입력해주세요.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('올바른 이메일 형식이 아닙니다.')

    setLoading(true)
    try {
      await authService.resetPassword(email)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">{email}</span>로<br />
          비밀번호 재설정 메일을 발송했습니다.
        </p>
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 transition cursor-pointer">
          로그인으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-gray-500 text-center mb-4">
        가입한 이메일을 입력하시면<br />비밀번호 재설정 링크를 보내드립니다.
      </p>
      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-gray-500"
      />

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-md text-white text-sm font-medium bg-gray-900 hover:bg-gray-700 transition disabled:opacity-60 cursor-pointer"
      >
        {loading ? '전송 중...' : '재설정 메일 발송'}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-gray-600 transition"
        >
          로그인으로 돌아가기
        </button>
      </div>
    </form>
  )
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}
