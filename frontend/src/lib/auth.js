import { supabase } from './supabase'
import useAuthStore from '../store/authStore'

export const authService = {
  /**
   * 이메일/비밀번호 로그인
   * 로그인 성공 후 members 테이블을 JOIN(roles) 조회하여 authStore에 저장합니다.
   */
  async login(email, password) {
    // 1. Supabase Auth 로그인
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
      }
      throw new Error(authError.message)
    }

    const user = authData.user
    if (!user) throw new Error('로그인 정보를 가져올 수 없습니다.')

    // 2. members 테이블에서 현재 계정과 연동된 임원 정보 및 권한(roles) 조회
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*, roles(*)')
      .eq('user_id', user.id)
      .single()

    if (memberError || !memberData) {
      // Auth 회원가입은 되어있지만 members 테이블에 매핑되지 않은(비정상/초기화 전) 상태
      await this.logout()
      throw new Error('계정이 등록되지 않았습니다. 관리자에게 문의하세요.')
    }

    // 3. 상태 관리 스토어 업데이트
    useAuthStore.getState().setAuth({
      user,
      member: memberData,
      role: memberData.roles,
    })

    return { user, member: memberData }
  },

  /**
   * 로그아웃
   */
  async logout() {
    await supabase.auth.signOut()
    useAuthStore.getState().clearAuth()
  },

  /**
   * 비밀번호 재설정 이메일 발송
   */
  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/setup-password`,
    })
    
    if (error) {
      if (error.message.includes('rate limit')) {
        throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.')
      }
      throw new Error('비밀번호 재설정 이메일 발송에 실패했습니다. 관리자에게 문의하세요.')
    }
  }
}
