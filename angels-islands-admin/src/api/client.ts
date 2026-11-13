import axios from 'axios'

const TOKEN_KEY = 'angels-admin-token'

/** Admin token (ADMIN_TOKEN on the API). Kept in this browser only. */
export function getAdminToken(): string {
  try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}

export function setAdminToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* storage unavailable: token lives for this page only */ }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  // X-Admin-Client: which admin this is. 2 = its memory editor reads the whole memory before it opens; the API
  // refuses a memory's links from an older page (which would start from a list's copy, without them).
  headers: { 'Content-Type': 'application/json', 'X-Admin-Client': '2' },
})

api.interceptors.request.use(config => {
  const token = getAdminToken()
  if (token) config.headers.set('X-Admin-Token', token)
  return config
})

/** A 401 means the token is missing or wrong: the token gate listens for this. */
export const UNAUTHORIZED_EVENT = 'angels:unauthorized'

api.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    return Promise.reject(error)
  },
)

export default api
