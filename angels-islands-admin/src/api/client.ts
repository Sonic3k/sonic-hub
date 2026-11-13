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
  // X-Admin-Client: which admin this is, so the API can refuse a save from a page loaded before a form changed
  // (it would write back parts its list no longer carries). 2 = the memory editor reads the whole memory before it
  // opens; 3 = the journal lists ask for the text, tags and problems that the journal's editor writes back.
  headers: { 'Content-Type': 'application/json', 'X-Admin-Client': '3' },
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
