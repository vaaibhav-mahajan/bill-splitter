// Hook for loading and refreshing all data for the active home
import { useCallback, useState } from 'react'
import { fetchBalances, fetchBills, fetchMembers } from '../lib/api'
import type { AsyncState, Balance, Bill, Home, Member } from '../types'

interface HomeData {
  membersState: AsyncState<Member[]>
  billsState: AsyncState<Bill[]>
  balancesState: AsyncState<Balance[]>
  setMembersState: React.Dispatch<React.SetStateAction<AsyncState<Member[]>>>
  setBillsState: React.Dispatch<React.SetStateAction<AsyncState<Bill[]>>>
  loadHomeData: (home: Home) => Promise<void>
  refreshBalances: (homeId: string) => Promise<void>
}

export function useHomeData(): HomeData {
  const [membersState, setMembersState] = useState<AsyncState<Member[]>>({ status: 'idle' })
  const [billsState, setBillsState] = useState<AsyncState<Bill[]>>({ status: 'idle' })
  const [balancesState, setBalancesState] = useState<AsyncState<Balance[]>>({ status: 'idle' })

  const loadHomeData = useCallback(async (home: Home) => {
    setMembersState({ status: 'loading' })
    setBillsState({ status: 'loading' })
    setBalancesState({ status: 'loading' })

    try {
      const [membersRes, billsRes, balancesRes] = await Promise.all([
        fetchMembers(home.id),
        fetchBills(home.id),
        fetchBalances(home.id),
      ])

      setMembersState(
        membersRes.ok
          ? { status: 'ok', data: membersRes.data }
          : { status: 'error', message: membersRes.error },
      )
      setBillsState(
        billsRes.ok
          ? { status: 'ok', data: billsRes.data }
          : { status: 'error', message: billsRes.error },
      )
      setBalancesState(
        balancesRes.ok
          ? { status: 'ok', data: balancesRes.data }
          : { status: 'error', message: balancesRes.error },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load home data.'
      setMembersState({ status: 'error', message })
      setBillsState({ status: 'error', message })
      setBalancesState({ status: 'error', message })
    }
  }, [])

  const refreshBalances = useCallback(async (homeId: string) => {
    try {
      const res = await fetchBalances(homeId)
      setBalancesState(
        res.ok ? { status: 'ok', data: res.data } : { status: 'error', message: res.error },
      )
    } catch (error) {
      setBalancesState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Could not refresh balances.',
      })
    }
  }, [])

  return {
    membersState,
    billsState,
    balancesState,
    setMembersState,
    setBillsState,
    loadHomeData,
    refreshBalances,
  }
}
