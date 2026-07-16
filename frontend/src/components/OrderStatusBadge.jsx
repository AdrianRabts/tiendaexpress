const STATUS_LABELS = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  FAILED: 'Fallido',
}

export default function OrderStatusBadge({ status }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{STATUS_LABELS[status] ?? status}</span>
}
