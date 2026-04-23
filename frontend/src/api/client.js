import axios from 'axios'

const isDev = import.meta.env.DEV
const baseURL = isDev ? '/api/v1' : 'https://maxcare-plus-backend.onrender.com/api/v1'

const api = axios.create({ baseURL })

// ── Request: attach JWT ───────────────────────────────────────────────────────
api.interceptors.request.use(
  cfg => {
    const token = localStorage.getItem('hms_token')
    if (token) cfg.headers.Authorization = `Bearer ${token}`
    return cfg
  },
  err => Promise.reject(err)
)

// ── Response: handle 401/403 cleanly, prevent redirect loops ─────────────────
let isRedirecting = false

api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status
    const isLoginRequest = err.config?.url?.includes('/auth/login')

    if ((status === 401 || status === 403) && !isLoginRequest && !isRedirecting) {
      isRedirecting = true
      // Wipe ALL stored auth state
      localStorage.removeItem('hms_token')
      localStorage.removeItem('hms_user')
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      setTimeout(() => { isRedirecting = false }, 4000)
    }

    return Promise.reject(err)
  }
)

export default api
