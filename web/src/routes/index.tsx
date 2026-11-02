// Home page state and section composition.
import { createFileRoute } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BalanceSection } from '../components/home/BalanceSection'
import { BillForm } from '../components/home/BillForm'
import { BillsSection } from '../components/home/BillsSection'
import { HomeSelector } from '../components/home/HomeSelector'
import { MemberSection } from '../components/home/MemberSection'
import { C } from '../components/styles'
import { useHomeData } from '../hooks/useHomeData'
import { addBill, addMember, createHome, fetchHomes, payShare } from '../lib/api'
import { fmt } from '../lib/utils'
import type { AsyncState, Bill, FormState, Home, Share } from '../types'

export const Route = createFileRoute('/')({
  component: App,
})

export function App() {
  const [homes, setHomes] = useState<AsyncState<Home[]>>({ status: 'idle' })
  const [activeHome, setActiveHome] = useState<Home | null>(null)
  const {
    membersState,
    setMembersState,
    billsState,
    setBillsState,
    balancesState,
    loadHomeData: loadHomeDataFromHook,
    refreshBalances,
  } = useHomeData()

  const [homeName, setHomeName] = useState('')
  const [homeFormState, setHomeFormState] = useState<FormState>({
    loading: false,
    msg: '',
    isErr: false,
  })
  const [memberName, setMemberName] = useState('')
  const [memberFormState, setMemberFormState] = useState<FormState>({
    loading: false,
    msg: '',
    isErr: false,
  })
  const [billTitle, setBillTitle] = useState('')
  const [billTotal, setBillTotal] = useState('')
  const [billFormState, setBillFormState] = useState<FormState>({
    loading: false,
    msg: '',
    isErr: false,
  })
  const [payingShareIds, setPayingShareIds] = useState<Record<string, boolean>>({})
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({})
  const idempotencyKeys = useRef<Record<string, string>>({})

  const loadAllHomes = useCallback(async () => {
    setHomes({ status: 'loading' })
    try {
      const result = await fetchHomes()
      setHomes(
        result.ok
          ? { status: 'ok', data: result.data }
          : { status: 'error', message: result.error },
      )
    } catch (error) {
      setHomes({
        status: 'error',
        message: error instanceof Error ? error.message : 'Could not load homes.',
      })
    }
  }, [])

  useEffect(() => {
    void loadAllHomes()
  }, [loadAllHomes])

  const loadHomeData = useCallback(
    async (home: Home) => {
      setActiveHome(home)
      setPaymentErrors({})
      await loadHomeDataFromHook(home)
    },
    [loadHomeDataFromHook],
  )

  const handleSearchOrCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = homeName.trim()
    if (!name) return

    setHomeFormState({ loading: true, msg: '', isErr: false })
    try {
      const searchResult = await fetchHomes(name)
      if (!searchResult.ok) {
        setHomeFormState({ loading: false, msg: searchResult.error, isErr: true })
        return
      }

      const foundHomes = searchResult.data
      if (foundHomes.length === 1) {
        const home = foundHomes[0]
        if (!home) throw new Error('Expected one matching home.')
        setHomeFormState({ loading: false, msg: `Found "${home.name}" — loading…`, isErr: false })
        setHomeName('')
        await loadAllHomes()
        await loadHomeData(home)
        setHomeFormState({ loading: false, msg: `Loaded "${home.name}"`, isErr: false })
        return
      }

      if (foundHomes.length > 1) {
        setHomeFormState({
          loading: false,
          msg: `${foundHomes.length} homes match "${name}" — click one below to open it.`,
          isErr: false,
        })
        setHomes({ status: 'ok', data: foundHomes })
        return
      }

      const result = await createHome(name)
      if (!result.ok) {
        setHomeFormState({ loading: false, msg: result.error, isErr: true })
        return
      }

      const newHome = result.data
      setHomeName('')
      setHomeFormState({ loading: false, msg: `Created "${newHome.name}"`, isErr: false })
      await loadAllHomes()
      await loadHomeData(newHome)
    } catch (error) {
      setHomeFormState({
        loading: false,
        msg: error instanceof Error ? error.message : 'Could not search or create a home.',
        isErr: true,
      })
    }
  }

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeHome || !memberName.trim()) return

    setMemberFormState({ loading: true, msg: '', isErr: false })
    try {
      const result = await addMember(activeHome.id, memberName.trim())
      if (!result.ok) {
        setMemberFormState({ loading: false, msg: result.error, isErr: true })
        return
      }

      const member = result.data
      setMembersState((previous) =>
        previous.status === 'ok' ? { status: 'ok', data: [...previous.data, member] } : previous,
      )
      setMemberName('')
      setMemberFormState({ loading: false, msg: `Added "${member.name}"`, isErr: false })
    } catch (error) {
      setMemberFormState({
        loading: false,
        msg: error instanceof Error ? error.message : 'Could not add member.',
        isErr: true,
      })
    }
  }

  const handleAddBill = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeHome || !billTitle.trim() || !billTotal.trim()) return

    const dollars = Number.parseFloat(billTotal)
    if (Number.isNaN(dollars) || dollars <= 0) {
      setBillFormState({
        loading: false,
        msg: 'Enter a valid positive dollar amount.',
        isErr: true,
      })
      return
    }
    const totalCents = Math.round(dollars * 100)

    setBillFormState({ loading: true, msg: '', isErr: false })
    try {
      const result = await addBill(activeHome.id, billTitle.trim(), totalCents)
      if (!result.ok) {
        setBillFormState({ loading: false, msg: result.error, isErr: true })
        return
      }

      const bill = result.data
      setBillsState((previous) =>
        previous.status === 'ok' ? { status: 'ok', data: [...previous.data, bill] } : previous,
      )
      setBillTitle('')
      setBillTotal('')
      setBillFormState({
        loading: false,
        msg: `Bill "${bill.title}" added — ${fmt(bill.totalCents)} split among ${bill.shares.length} member(s).`,
        isErr: false,
      })
      await refreshBalances(activeHome.id)
    } catch (error) {
      setBillFormState({
        loading: false,
        msg: error instanceof Error ? error.message : 'Could not add bill.',
        isErr: true,
      })
    }
  }

  const handlePayShare = async (billId: string, shareId: string) => {
    if (payingShareIds[shareId]) return

    setPaymentErrors((previous) => {
      const next = { ...previous }
      delete next[shareId]
      return next
    })
    if (!idempotencyKeys.current[shareId]) {
      idempotencyKeys.current[shareId] = crypto.randomUUID()
    }
    const key = idempotencyKeys.current[shareId]
    setPayingShareIds((previous) => ({ ...previous, [shareId]: true }))

    try {
      const result = await payShare(billId, shareId, key)
      if (!result.ok) {
        setPaymentErrors((previous) => ({ ...previous, [shareId]: result.error }))
        setPayingShareIds((previous) => ({ ...previous, [shareId]: false }))
        return
      }

      const paidShare: Share = result.data
      setBillsState((previous) => {
        if (previous.status !== 'ok') return previous
        return {
          status: 'ok',
          data: previous.data.map((bill: Bill) =>
            bill.id !== billId
              ? bill
              : {
                  ...bill,
                  shares: bill.shares.map((share) =>
                    share.id === shareId
                      ? { ...share, paidAt: paidShare.paidAt ?? new Date().toISOString() }
                      : share,
                  ),
                },
          ),
        }
      })
      setPayingShareIds((previous) => ({ ...previous, [shareId]: false }))
      if (activeHome) await refreshBalances(activeHome.id)
    } catch (error) {
      setPaymentErrors((previous) => ({
        ...previous,
        [shareId]: error instanceof Error ? error.message : 'Could not process payment.',
      }))
      setPayingShareIds((previous) => ({ ...previous, [shareId]: false }))
    }
  }

  const memberList = membersState.status === 'ok' ? membersState.data : []

  return (
    <div
      style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: '24px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#222',
      }}
    >
      <h1 style={{ marginBottom: 4 }}>🏠 Bill Splitter</h1>
      <p style={{ color: C.muted, fontSize: 13, marginTop: 0, marginBottom: 28 }}>
        Type a home name to search or create, then add members, split bills, and pay shares.
      </p>
      <HomeSelector
        homes={homes}
        activeHome={activeHome}
        homeName={homeName}
        formState={homeFormState}
        onHomeNameChange={setHomeName}
        onSubmit={handleSearchOrCreate}
        onSelectHome={loadHomeData}
        onRetry={loadAllHomes}
      />

      {activeHome && (
        <>
          <hr style={{ borderColor: C.border, marginBottom: 24 }} />
          <h2 style={{ marginBottom: 4 }}>📋 {activeHome.name}</h2>
          <p
            style={{
              fontSize: 12,
              color: '#aaa',
              marginTop: 0,
              marginBottom: 24,
              fontFamily: 'monospace',
            }}
          >
            id: {activeHome.id}
          </p>
          <MemberSection
            members={membersState}
            formState={memberFormState}
            memberName={memberName}
            onMemberNameChange={setMemberName}
            onSubmit={handleAddMember}
          />
          <BillForm
            members={membersState}
            formState={billFormState}
            title={billTitle}
            total={billTotal}
            onTitleChange={setBillTitle}
            onTotalChange={setBillTotal}
            onSubmit={handleAddBill}
          />
          <BalanceSection balances={balancesState} />
          <BillsSection
            bills={billsState}
            members={memberList}
            payingShareIds={payingShareIds}
            paymentErrors={paymentErrors}
            onPayShare={handlePayShare}
          />
        </>
      )}
    </div>
  )
}
