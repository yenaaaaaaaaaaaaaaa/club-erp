import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  member: null,
  role: null,
  isLoading: true,

  setAuth: ({ user, member, role }) =>
    set({ user, member, role, isLoading: false }),

  clearAuth: () =>
    set({ user: null, member: null, role: null, isLoading: false }),
}))

export default useAuthStore
