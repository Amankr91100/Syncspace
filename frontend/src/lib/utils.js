import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export const timeAgo = (date) => (date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : '');

export const shortDate = (date) => (date ? format(new Date(date), 'd MMM') : '');

export const dueState = (date, completed) => {
  if (!date || completed) return 'none';
  const d = new Date(date);
  if (isPast(d) && !isToday(d)) return 'overdue';
  if (isToday(d)) return 'today';
  return 'upcoming';
};

export const PRIORITIES = [
  { value: 'low', label: 'Low', tone: 'text-sky-300 bg-sky-500/15 border-sky-400/25' },
  { value: 'medium', label: 'Medium', tone: 'text-violet-300 bg-violet-500/15 border-violet-400/25' },
  { value: 'high', label: 'High', tone: 'text-amber-300 bg-amber-500/15 border-amber-400/25' },
  { value: 'urgent', label: 'Urgent', tone: 'text-rose-300 bg-rose-500/15 border-rose-400/25' },
];

export const priorityTone = (value) => PRIORITIES.find((p) => p.value === value)?.tone || PRIORITIES[1].tone;

/** Reorder helper used by every drag-and-drop handler. */
export const reorder = (list, from, to) => {
  const next = Array.from(list);
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};
