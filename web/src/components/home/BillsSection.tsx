// Bill shares and payment controls for the active home.

import { fmt } from '../../lib/utils'
import type { AsyncState, Bill, Member } from '../../types'
import { btn, C } from '../styles'
import { Banner, EmptyState, SectionLoading, Spinner } from '../ui'

interface BillsSectionProps {
  bills: AsyncState<Bill[]>
  members: Member[]
  payingShareIds: Record<string, boolean>
  paymentErrors: Record<string, string>
  onPayShare: (billId: string, shareId: string) => void
}

export function BillsSection({
  bills,
  members,
  payingShareIds,
  paymentErrors,
  onPayShare,
}: BillsSectionProps) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h3 style={{ marginBottom: 10 }}>Bills</h3>
      {bills.status === 'loading' && <SectionLoading label="Loading bills…" />}
      {bills.status === 'error' && (
        <Banner kind="error">Could not load bills: {bills.message}</Banner>
      )}
      {bills.status === 'ok' && bills.data.length === 0 && (
        <EmptyState message="No bills yet — add one above." />
      )}
      {bills.status === 'ok' &&
        bills.data.map((bill) => (
          <BillCard
            key={bill.id}
            bill={bill}
            members={members}
            payingShareIds={payingShareIds}
            paymentErrors={paymentErrors}
            onPayShare={onPayShare}
          />
        ))}
    </section>
  )
}

interface BillCardProps {
  bill: Bill
  members: Member[]
  payingShareIds: Record<string, boolean>
  paymentErrors: Record<string, string>
  onPayShare: (billId: string, shareId: string) => void
}

function BillCard({ bill, members, payingShareIds, paymentErrors, onPayShare }: BillCardProps) {
  const allPaid = bill.shares.length > 0 && bill.shares.every((share) => share.paidAt !== null)

  return (
    <div
      style={{
        border: `1px solid ${allPaid ? '#b7ebcc' : C.border}`,
        borderRadius: 6,
        padding: 16,
        marginBottom: 16,
        background: allPaid ? '#f0fff4' : '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 10,
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        <strong style={{ fontSize: 15 }}>
          {allPaid ? '✅ ' : ''}
          {bill.title}
        </strong>
        <span style={{ fontSize: 14, color: C.muted }}>
          Total: <strong style={{ color: '#222' }}>{fmt(bill.totalCents)}</strong>
          {allPaid && (
            <span style={{ marginLeft: 8, color: C.success, fontSize: 12 }}>fully paid</span>
          )}
        </span>
      </div>

      {bill.shares.length === 0 ? (
        <EmptyState message="No shares recorded for this bill." />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid #eee',
                color: '#666',
                textAlign: 'left',
              }}
            >
              <th style={{ padding: '5px 6px' }}>Member</th>
              <th style={{ padding: '5px 6px' }}>Share</th>
              <th style={{ padding: '5px 6px' }}>Status</th>
              <th style={{ padding: '5px 6px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {bill.shares.map((share) => {
              const isPaid = share.paidAt !== null
              const isPaying = !!payingShareIds[share.id]
              const shareError = paymentErrors[share.id]
              const name =
                share.memberName ||
                members.find((member) => member.id === share.memberId)?.name ||
                share.memberId

              return (
                <tr
                  key={share.id}
                  style={{
                    borderBottom: '1px solid #f5f5f5',
                    background: !isPaid && shareError ? '#fff8f8' : 'transparent',
                  }}
                >
                  <td style={{ padding: '7px 6px' }}>{name}</td>
                  <td style={{ padding: '7px 6px' }}>{fmt(share.amountCents)}</td>
                  <td style={{ padding: '7px 6px' }}>
                    {isPaid ? (
                      <span style={{ color: C.success, fontWeight: 600 }}>
                        ✓ Paid{' '}
                        <span style={{ fontWeight: 400, fontSize: 11 }}>
                          {share.paidAt ? new Date(share.paidAt).toLocaleString() : ''}
                        </span>
                      </span>
                    ) : isPaying ? (
                      <span style={{ color: C.muted }}>
                        <Spinner />
                        Processing…
                      </span>
                    ) : (
                      <span style={{ color: C.warn, fontWeight: 600 }}>Unpaid</span>
                    )}
                    {shareError && !isPaid && (
                      <div
                        role="alert"
                        style={{
                          color: C.error,
                          fontSize: 12,
                          marginTop: 3,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>⚠️</span>
                        <span>{shareError}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '7px 6px', textAlign: 'right' }}>
                    {isPaid ? (
                      <span style={{ color: '#aaa', fontSize: 12 }}>Done</span>
                    ) : (
                      <button
                        type="button"
                        disabled={isPaying}
                        onClick={() => onPayShare(bill.id, share.id)}
                        title={shareError ? 'Retry payment' : 'Mark as paid'}
                        style={btn(shareError ? 'danger' : 'primary', isPaying)}
                      >
                        {isPaying ? (
                          <>
                            <Spinner />
                            Paying…
                          </>
                        ) : shareError ? (
                          'Retry'
                        ) : (
                          'Pay'
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
