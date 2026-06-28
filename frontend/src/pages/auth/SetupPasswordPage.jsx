import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function SetupPasswordPage() {
  const navigate = useNavigate()
  
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [retryMode, setRetryMode] = useState(false)

  // 컴포넌트 마운트 시, URL 해시에 access_token이 있는지 확인
  // (초대 링크나 비밀번호 재설정 링크를 통해 진입할 때 Supabase가 URL에 붙여줌)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // 이미 인증(초대 토큰) 상태인지 확인
      if (!session && !window.location.hash.includes('access_token')) {
        setErrorMsg('유효하지 않은 접근이거나 링크가 만료되었습니다. 관리자에게 재발송을 요청하세요.')
      }
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    
    if (password.length < 8) {
      setErrorMsg('비밀번호는 최소 8자 이상이어야 합니다.')
      return
    }
    if (password !== passwordConfirm) {
      setErrorMsg('비밀번호가 일치하지 않습니다.')
      return
    }

    setIsLoading(true)

    try {
      if (!retryMode) {
        // 1. 비밀번호 업데이트 (Supabase Auth)
        const { error: updateAuthError } = await supabase.auth.updateUser({ password })
        if (updateAuthError) throw updateAuthError
      }

      // 2. 현재 로그인된(비밀번호를 설정한) 유저 정보 획득
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('유저 정보를 가져올 수 없습니다.')

      // 3. members 테이블에 user_id 연결 (단, 기존에 연결되지 않은 계정만)
      const { error: linkError, data: updateData, count } = await supabase
        .from('members')
        .update({ user_id: user.id })
        .eq('email', user.email)
        .is('user_id', null)
        .select() // 업데이트 된 Row 반환

      if (linkError) throw linkError

      if (!updateData || updateData.length === 0) {
        // 업데이트된 row가 0건이라면 이미 누군가(혹은 본인) 연결했거나, 초대된 이메일이 아님
        throw new Error('이미 연결된 계정이거나, 관리자로부터 등록되지 않은 이메일입니다. 관리자에게 문의하세요.')
      }

      // 모든 과정 성공 시 대시보드로 이동
      navigate('/app/dashboard')

    } catch (err) {
      console.error('Setup Password Error:', err)
      setErrorMsg(err.message)
      setRetryMode(true) // 재시도 버튼 활성화
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            비밀번호 설정
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            초대를 환영합니다! 임원진 계정으로 사용할 비밀번호를 설정해 주세요.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 pb-1">새 비밀번호</label>
              <input
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="최소 8자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 pb-1">비밀번호 확인</label>
              <input
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호 다시 입력"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-3 rounded-md">
              {errorMsg}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? '설정 중...' : (retryMode ? '재시도 (연결 업데이트)' : '비밀번호 설정 및 완료')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
