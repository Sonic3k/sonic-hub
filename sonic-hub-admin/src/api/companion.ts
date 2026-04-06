import axios from 'axios'

const companionApi = axios.create({
  baseURL: import.meta.env.VITE_COMPANION_URL || 'http://localhost:8082',
  headers: { 'Content-Type': 'application/json' },
})

export default companionApi
