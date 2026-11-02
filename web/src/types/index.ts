// Domain types for the bill-splitter app

export interface Home {
  id: string
  name: string
}

export interface Member {
  id: string
  homeId: string
  name: string
  memberOrder: number
}

export interface Share {
  id: string
  memberId: string
  memberName?: string
  amountCents: number
  paidAt: string | null
}

export interface Bill {
  id: string
  homeId: string
  title: string
  totalCents: number
  shares: Share[]
}

export interface Balance {
  memberId: string
  name: string
  outstandingCents: number
}

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string }

export interface FormState {
  loading: boolean
  msg: string
  isErr: boolean
}
