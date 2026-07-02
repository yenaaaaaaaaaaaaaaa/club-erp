import { create } from 'zustand'

const useSemesterStore = create((set) => ({
  semester: null,
  setSemester: (semester) => set({ semester }),
}))

export default useSemesterStore
