// Color palette and style helper functions

export const C = {
  primary: '#0070f3',
  error: '#c00',
  success: '#008000',
  warn: '#b36b00',
  border: '#ddd',
  muted: '#777',
  bg: '#fafafa',
}

export function btn(
  variant: 'primary' | 'ghost' | 'danger',
  disabled?: boolean,
): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '6px 14px',
    fontSize: 14,
    borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    border: '1px solid',
    transition: 'opacity 0.15s',
  }
  if (variant === 'primary')
    return { ...base, background: C.primary, color: '#fff', borderColor: C.primary }
  if (variant === 'danger')
    return { ...base, background: '#fff0f0', color: C.error, borderColor: '#ffcccc' }
  return { ...base, background: '#f5f5f5', color: '#333', borderColor: '#aaa' }
}

export function inputStyle(width?: number | string): React.CSSProperties {
  return {
    padding: '6px 10px',
    fontSize: 14,
    borderRadius: 4,
    border: `1px solid #ccc`,
    width: width ?? 200,
    boxSizing: 'border-box',
  }
}
