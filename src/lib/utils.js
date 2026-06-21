import { format, isBefore, parseISO, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { PRIORITIES } from './constants'

export function priorityMeta(priority) {
  return PRIORITIES.find((item) => item.value === priority) ?? PRIORITIES[1]
}

export function formatDate(date) {
  if (!date) return 'Sin fecha'
  return format(parseISO(date), 'dd/MM/yyyy', { locale: es })
}

export function isOverdue(task, status) {
  if (!task.due_date || status?.name === 'Finalizadas') return false
  return isBefore(parseISO(task.due_date), startOfDay(new Date()))
}

export function initials(name = '') {
  const clean = name.trim()
  if (!clean) return 'LT'
  return clean
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function byPosition(a, b) {
  return (a.position ?? 0) - (b.position ?? 0)
}
