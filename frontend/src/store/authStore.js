import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(persist(
  (set) => ({
    token: null,
    user: null,
    login: (token, user) => {
      localStorage.setItem('hms_token', token)
      set({ token, user })
    },
    logout: () => {
      localStorage.removeItem('hms_token')
      set({ token: null, user: null })
    },
    updateUser: (updates) => set(state => ({ user: { ...state.user, ...updates } })),
  }),
  { name: 'hms_user' }
))
