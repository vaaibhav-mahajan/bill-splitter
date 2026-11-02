// Bill creation form for the active home.
import type { FormEvent } from 'react'
import type { AsyncState, FormState, Member } from '../../types'
import { btn, inputStyle } from '../styles'
import { Banner, SectionLoading, Spinner } from '../ui'

interface BillFormProps {
  members: AsyncState<Member[]>
  formState: FormState
  title: string
  total: string
  onTitleChange: (value: string) => void
  onTotalChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function BillForm({
  members,
  formState,
  title,
  total,
  onTitleChange,
  onTotalChange,
  onSubmit,
}: BillFormProps) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h3 style={{ marginBottom: 10 }}>Add a Bill</h3>
      {members.status === 'ok' && members.data.length === 0 ? (
        <Banner kind="info">Add at least one member before creating a bill.</Banner>
      ) : members.status === 'loading' ? (
        <SectionLoading label="Waiting for members to load…" />
      ) : (
        <form
          onSubmit={onSubmit}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}
        >
          <input
            style={inputStyle(200)}
            value={title}
            placeholder="Bill title…"
            disabled={formState.loading}
            onChange={(event) => onTitleChange(event.target.value)}
          />
          <input
            style={inputStyle(130)}
            value={total}
            placeholder="Amount ($)"
            type="number"
            step="0.01"
            min="0.01"
            disabled={formState.loading}
            onChange={(event) => onTotalChange(event.target.value)}
          />
          <button
            type="submit"
            disabled={formState.loading || !title.trim() || !total.trim()}
            style={btn('primary', formState.loading || !title.trim() || !total.trim())}
          >
            {formState.loading ? (
              <>
                <Spinner />
                Adding…
              </>
            ) : (
              'Add Bill'
            )}
          </button>
        </form>
      )}
      {formState.msg && (
        <Banner kind={formState.isErr ? 'error' : 'success'}>{formState.msg}</Banner>
      )}
    </section>
  )
}
