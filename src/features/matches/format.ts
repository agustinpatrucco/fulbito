/** "sáb. 22 ago, 21:00" — enough to recognize which fecha this is at a glance. */
export function formatFecha(iso: string): string {
  const formatted = new Date(iso).toLocaleString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  return formatted.replace(/^\w/, (c) => c.toUpperCase())
}

/** Only :00, :15, :30 and :45 are valid — matches, in practice, kick off on the quarter
    hour, and it keeps the formation dropdown from ever needing an odd time to sort by. */
export function isQuarterHour(date: Date): boolean {
  return date.getMinutes() % 15 === 0
}
