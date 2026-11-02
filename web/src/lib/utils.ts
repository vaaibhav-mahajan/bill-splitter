// Utility helpers for the bill-splitter app

export function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
