/** Money and time display for the finance pages. API times are UTC without a Z; show them in Vietnam time. */
const VN = 'Asia/Ho_Chi_Minh'

export const utc = (s: string) => new Date(s.endsWith('Z') ? s : s + 'Z')

export function vnd(n: number | null | undefined, signed = false): string {
  if (n === null || n === undefined) return '—'
  const s = Math.round(Math.abs(n)).toLocaleString('en-US')
  return (signed ? (n < 0 ? '−' : n > 0 ? '+' : '') : n < 0 ? '−' : '') + s + ' ₫'
}

export function money(n: number | null | undefined, currency: string, signed = false): string {
  if (currency === 'VND' || !currency) return vnd(n, signed)
  if (n === null || n === undefined) return '—'
  const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (signed ? (n < 0 ? '−' : n > 0 ? '+' : '') : n < 0 ? '−' : '') + s + ' ' + currency
}

export const fmtDateTime = (s: string | null | undefined) => s
  ? utc(s).toLocaleString('en-GB', { timeZone: VN, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—'

export const fmtDay = (s: string) => utc(s).toLocaleDateString('en-GB', { timeZone: VN, weekday: 'short', day: '2-digit', month: '2-digit' })

/** "2026-10" for the month a UTC time falls in, Vietnam time. */
export const vnMonth = (d = new Date()) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: VN, year: 'numeric', month: '2-digit' }).formatToParts(d)
  return `${p.find(x => x.type === 'year')!.value}-${p.find(x => x.type === 'month')!.value}`
}

export const shiftMonth = (m: string, delta: number) => {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** A UTC API time → the value of an <input type="datetime-local"> in Vietnam time. */
export function toLocalInput(s: string | null | undefined): string {
  const d = s ? utc(s) : new Date()
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: VN, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d)
  const g = (t: string) => p.find(x => x.type === t)!.value
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`
}

/** <input type="datetime-local"> (Vietnam time) → ISO with the +07:00 offset, which the API converts. */
export const fromLocalInput = (v: string) => (v ? `${v}:00+07:00` : undefined)

export const MODE_LABEL: Record<string, string> = { FEED: 'Auto feed', RECONCILE: 'Balance check-ins', POOL: 'Cash pool' }
export const MODE_HELP: Record<string, string> = {
  FEED: 'Every transaction arrives by itself (SePay). The balance is the bank’s own figure.',
  RECONCILE: 'Notes are optional. Typing the balance now and then turns the gap into unexplained spending or income.',
  POOL: 'Cash: money going in counts as spent at once; a cash note only moves part of it to its real category.',
}
