// Member creation and list for the active home.
import type { FormEvent } from 'react'
import type { AsyncState, FormState, Member } from '../../types'
import { btn, inputStyle } from '../styles'
import { Banner, SectionLoading, Spinner } from '../ui'

interface MemberSectionProps {
  members: AsyncState<Member[]>
  formState: FormState
  memberName: string
  onMemberNameChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function MemberSection({
  members,
  formState,
  memberName,
  onMemberNameChange,
  onSubmit,
}: MemberSectionProps) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h3 style={{ marginBottom: 10 }}>Members</h3>
      <form
        onSubmit={onSubmit}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}
      >
        <input
          style={inputStyle(200)}
          value={memberName}
          placeholder="New member name…"
          disabled={formState.loading}
          onChange={(event) => onMemberNameChange(event.target.value)}
        />
        <button
          type="submit"
          disabled={formState.loading || !memberName.trim()}
          style={btn('primary', formState.loading || !memberName.trim())}
        >
          {formState.loading ? (
            <>
              <Spinner />
              Adding…
            </>
          ) : (
            'Add Member'
          )}
        </button>
      </form>

      {formState.msg && (
        <Banner kind={formState.isErr ? 'error' : 'success'}>{formState.msg}</Banner>
      )}
      {members.status === 'loading' && <SectionLoading label="Loading members…" />}
      {members.status === 'error' && (
        <Banner kind="error">Could not load members: {members.message}</Banner>
      )}
      {members.status === 'ok' && members.data.length === 0 && (
        <Banner kind="info">No members yet — add one above to start splitting bills.</Banner>
      )}
      {members.status === 'ok' && members.data.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {members.data.map((member) => (
            <span
              key={member.id}
              style={{
                padding: '4px 12px',
                background: '#eef4ff',
                borderRadius: 12,
                border: '1px solid #c0d4ff',
                fontSize: 13,
              }}
            >
              {member.name}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
