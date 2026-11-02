// Home search and selection controls.
import type { FormEvent } from 'react'
import type { AsyncState, FormState, Home } from '../../types'
import { btn, C, inputStyle } from '../styles'
import { Banner, EmptyState, SectionLoading, Spinner } from '../ui'

interface HomeSelectorProps {
  homes: AsyncState<Home[]>
  activeHome: Home | null
  homeName: string
  formState: FormState
  onHomeNameChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSelectHome: (home: Home) => void
  onRetry: () => void
}

export function HomeSelector({
  homes,
  activeHome,
  homeName,
  formState,
  onHomeNameChange,
  onSubmit,
  onSelectHome,
  onRetry,
}: HomeSelectorProps) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ marginBottom: 12 }}>Find or Create a Home</h2>
      <form
        onSubmit={onSubmit}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}
      >
        <input
          style={inputStyle(220)}
          value={homeName}
          placeholder="Home name…"
          disabled={formState.loading}
          onChange={(event) => onHomeNameChange(event.target.value)}
        />
        <button
          type="submit"
          disabled={formState.loading || !homeName.trim()}
          style={btn('primary', formState.loading || !homeName.trim())}
        >
          {formState.loading ? (
            <>
              <Spinner />
              Searching…
            </>
          ) : (
            'Search / Create'
          )}
        </button>
      </form>

      {formState.msg && (
        <Banner kind={formState.isErr ? 'error' : 'success'}>{formState.msg}</Banner>
      )}
      {homes.status === 'loading' && <SectionLoading label="Loading homes…" />}
      {homes.status === 'error' && (
        <Banner kind="error">
          Could not load homes: {homes.message}{' '}
          <button
            type="button"
            onClick={onRetry}
            style={{ ...btn('ghost'), marginLeft: 8, padding: '2px 8px' }}
          >
            Retry
          </button>
        </Banner>
      )}
      {homes.status === 'ok' && homes.data.length === 0 && (
        <EmptyState message="No homes yet — type a name above to create the first one." />
      )}
      {homes.status === 'ok' && homes.data.length > 0 && (
        <>
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 8px 0' }}>
            {homes.data.length} home{homes.data.length !== 1 ? 's' : ''} — click to open:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {homes.data.map((home) => (
              <button
                type="button"
                key={home.id}
                onClick={() => onSelectHome(home)}
                style={{
                  ...btn(activeHome?.id === home.id ? 'primary' : 'ghost'),
                  background: activeHome?.id === home.id ? C.primary : '#f5f5f5',
                  color: activeHome?.id === home.id ? '#fff' : '#333',
                  borderColor: activeHome?.id === home.id ? C.primary : '#aaa',
                }}
              >
                {home.name}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
