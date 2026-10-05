import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import api, { getAdminToken, setAdminToken, UNAUTHORIZED_EVENT } from '../api/client'
import { Button, Input } from './ui'

type AuthCheck = { configured: boolean; valid: boolean }

/** Asks for the admin token once the API requires one (ADMIN_TOKEN set) and the saved one is missing or wrong. */
export default function AdminTokenGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<'checking' | 'open' | 'locked'>('checking')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const check = useCallback(async () => {
    try {
      const { data } = await api.get<AuthCheck>('/api/auth/check')
      setState(!data.configured || data.valid ? 'open' : 'locked')
    } catch {
      setState('open') // API unreachable: let the pages show their own errors
    }
  }, [])

  useEffect(() => { check() }, [check])
  useEffect(() => {
    const onUnauthorized = () => { check() }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [check])

  const unlock = async () => {
    const t = token.trim()
    if (!t) return
    setBusy(true)
    setError('')
    const previous = getAdminToken()
    setAdminToken(t)
    try {
      const { data } = await api.get<AuthCheck>('/api/auth/check')
      if (data.valid || !data.configured) {
        setToken('')
        setState('open')
        queryClient.invalidateQueries()
      } else {
        setAdminToken(previous)
        setError('That token is not right.')
      }
    } catch {
      setAdminToken(previous)
      setError('Could not reach the API.')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'checking') return <div className="min-h-[100dvh] bg-slate-50" />
  if (state === 'open') return <>{children}</>

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center px-4">
      <form
        className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4"
        onSubmit={e => { e.preventDefault(); unlock() }}
      >
        <div className="flex items-center gap-2 text-slate-800">
          <Lock size={18} className="text-pink-400" />
          <h1 className="text-sm font-semibold">Angels Islands Admin</h1>
        </div>
        <p className="text-xs text-slate-500">Enter the admin token (ADMIN_TOKEN on the API). It stays in this browser.</p>
        <Input
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Admin token"
          value={token}
          onChange={e => setToken(e.target.value)}
          error={error || undefined}
        />
        <Button type="submit" className="w-full" disabled={busy || !token.trim()}>
          {busy ? 'Checking...' : 'Unlock'}
        </Button>
      </form>
    </div>
  )
}
