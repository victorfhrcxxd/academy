const styles: Record<string, { label: string; className: string }> = {
  LIVE: { label: '● AO VIVO', className: 'bg-red-600 text-white animate-pulse' },
  SCHEDULED: { label: 'Agendada', className: 'bg-navy-900/10 text-navy-900' },
  ENDED: { label: 'Encerrada', className: 'bg-gray-200 text-gray-600' },
}

export default function LiveStatusBadge({ status }: { status: string }) {
  const s = styles[status] ?? styles.SCHEDULED
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.className}`}>
      {s.label}
    </span>
  )
}
