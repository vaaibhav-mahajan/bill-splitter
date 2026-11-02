// Shared UI primitives: Banner, Spinner, SectionLoading, EmptyState
import { C } from './styles'

interface BannerProps {
  kind: 'info' | 'error' | 'success' | 'loading'
  children: React.ReactNode
}

export function Banner({ kind, children }: BannerProps) {
  const styles: Record<string, React.CSSProperties> = {
    info: { background: '#fffbe6', border: `1px solid #ffe58f`, color: '#5a3e00' },
    error: { background: '#fff0f0', border: `1px solid #ffcccc`, color: C.error },
    success: { background: '#f0fff4', border: `1px solid #b7ebcc`, color: '#005a1f' },
    loading: { background: '#f5f5f5', border: `1px solid #ddd`, color: '#444' },
  }
  const icons = { info: 'ℹ️', error: '❌', success: '✅', loading: '⏳' }
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      style={{
        padding: '10px 14px',
        borderRadius: 6,
        fontSize: 14,
        marginBottom: 12,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        ...styles[kind],
      }}
    >
      <span>{icons[kind]}</span>
      <span>{children}</span>
    </div>
  )
}

export function Spinner() {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: '2px solid #ccc',
        borderTopColor: C.primary,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        verticalAlign: 'middle',
        marginRight: 6,
      }}
    />
  )
}

if (typeof document !== 'undefined' && !document.getElementById('spin-kf')) {
  const style = document.createElement('style')
  style.id = 'spin-kf'
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
  document.head.appendChild(style)
}

interface SectionLoadingProps {
  label: string
}

export function SectionLoading({ label }: SectionLoadingProps) {
  return (
    <div style={{ padding: 16, color: C.muted, fontSize: 14 }}>
      <Spinner />
      {label}
    </div>
  )
}

interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div
      style={{
        padding: '20px 16px',
        background: C.bg,
        border: `1px dashed ${C.border}`,
        borderRadius: 6,
        color: C.muted,
        fontSize: 14,
        textAlign: 'center',
      }}
    >
      {message}
    </div>
  )
}
