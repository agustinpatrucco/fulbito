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
