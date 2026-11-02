// Type-safe API client — all fetch calls go through safeFetch which never throws
import type { Balance, Bill, Home, Member, Share } from '../types'

type ApiOk<T> = { ok: true; data: T }
type ApiErr = { ok: false; error: string; status?: number }
type ApiResult<T> = ApiOk<T> | ApiErr

function getErrorMessage(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('error' in value)) return undefined
  return typeof value.error === 'string' ? value.error : undefined
}

async function safeFetch(input: string, init?: RequestInit): Promise<ApiResult<unknown>> {
  try {
    const res = await fetch(input, init)
    let json: unknown
    try {
      json = await res.json()
    } catch (error) {
      if (res.ok) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Invalid response body',
          status: res.status,
        }
      }
      json = null
    }
    if (!res.ok) {
      const msg = getErrorMessage(json) ?? `Request failed (${res.status})`
      return { ok: false, error: msg, status: res.status }
    }
    return { ok: true, data: json }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function fetchHomes(name?: string): Promise<ApiResult<Home[]>> {
  const url = name ? `/api/homes?name=${encodeURIComponent(name)}` : '/api/homes'
  const res = await safeFetch(url)
  if (!res.ok) return res
  return { ok: true, data: (res.data as { homes?: Home[] })?.homes ?? [] }
}

export async function createHome(name: string): Promise<ApiResult<Home>> {
  const res = await safeFetch('/api/homes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) return res
  return { ok: true, data: res.data as Home }
}

export async function fetchMembers(homeId: string): Promise<ApiResult<Member[]>> {
  const res = await safeFetch(`/api/homes/${homeId}/members`)
  if (!res.ok) return res
  return { ok: true, data: (res.data as { members?: Member[] })?.members ?? [] }
}

export async function addMember(homeId: string, name: string): Promise<ApiResult<Member>> {
  const res = await safeFetch(`/api/homes/${homeId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) return res
  return { ok: true, data: res.data as Member }
}

export async function fetchBills(homeId: string): Promise<ApiResult<Bill[]>> {
  const res = await safeFetch(`/api/homes/${homeId}/bills`)
  if (!res.ok) return res
  return { ok: true, data: (res.data as { bills?: Bill[] })?.bills ?? [] }
}

export async function addBill(
  homeId: string,
  title: string,
  totalCents: number,
): Promise<ApiResult<Bill>> {
  const res = await safeFetch(`/api/homes/${homeId}/bills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, totalCents }),
  })
  if (!res.ok) return res
  return { ok: true, data: res.data as Bill }
}

export async function fetchBalances(homeId: string): Promise<ApiResult<Balance[]>> {
  const res = await safeFetch(`/api/homes/${homeId}/balances`)
  if (!res.ok) return res
  return { ok: true, data: (res.data as { balances?: Balance[] })?.balances ?? [] }
}

export async function payShare(
  billId: string,
  shareId: string,
  idempotencyKey: string,
): Promise<ApiResult<Share>> {
  const res = await safeFetch(
    `/api/bills/${encodeURIComponent(billId)}/shares/${encodeURIComponent(shareId)}/pay`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    },
  )
  if (!res.ok) return res
  return { ok: true, data: res.data as Share }
}
