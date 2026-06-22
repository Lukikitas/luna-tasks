export const DEFAULT_STATUSES = [
  { name: 'Pendientes', color: '#64748b' },
  { name: 'En curso', color: '#2563eb' },
  { name: 'En revisión', color: '#7c3aed' },
  { name: 'Bloqueadas', color: '#dc2626' },
  { name: 'Finalizadas', color: '#16a34a' },
]

export const PRIORITIES = [
  { value: 'low', label: 'Baja', color: '#10b981' },
  { value: 'medium', label: 'Media', color: '#f59e0b' },
  { value: 'high', label: 'Alta', color: '#ef4444' },
  { value: 'urgent', label: 'Urgente', color: '#be123c' },
]

export const VIEW_OPTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'board', label: 'Kanban' },
  { id: 'list', label: 'Lista' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'mine', label: 'Mis tareas' },
  { id: 'overdue', label: 'Vencidas' },
  { id: 'done', label: 'Finalizadas' },
]
