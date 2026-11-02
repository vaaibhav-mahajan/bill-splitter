// Outstanding balances for the active home.

import { fmt } from '../../lib/utils'
import type { AsyncState, Balance } from '../../types'
import { C } from '../styles'
import { Banner, EmptyState, SectionLoading } from '../ui'

interface BalanceSectionProps {
  balances: AsyncState<Balance[]>
}

export function BalanceSection({ balances }: BalanceSectionProps) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h3 style={{ marginBottom: 10 }}>Outstanding Balances</h3>
      {balances.status === 'loading' && <SectionLoading label="Loading balances…" />}
      {balances.status === 'error' && (
        <Banner kind="error">Could not load balances: {balances.message}</Banner>
      )}
      {balances.status === 'ok' && balances.data.length === 0 && (
        <EmptyState message="All paid up! No outstanding balances." />
      )}
      {balances.status === 'ok' && balances.data.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px' }}>Member</th>
              <th style={{ padding: '6px 8px' }}>Amount Owed</th>
            </tr>
          </thead>
          <tbody>
            {balances.data.map((balance) => (
              <tr key={balance.memberId} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '6px 8px' }}>{balance.name}</td>
                <td
                  style={{
                    padding: '6px 8px',
                    fontWeight: 'bold',
                    color: balance.outstandingCents > 0 ? C.warn : C.success,
                  }}
                >
                  {fmt(balance.outstandingCents)}
                  {balance.outstandingCents === 0 && ' ✓'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
