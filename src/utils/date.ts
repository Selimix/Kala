import { format, formatRelative, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatEventTime(isoString: string): string {
  const date = parseISO(isoString);
  return format(date, 'HH:mm', { locale: fr });
}

export function formatEventDate(isoString: string): string {
  const date = parseISO(isoString);

  if (isToday(date)) return "Aujourd'hui";
  if (isTomorrow(date)) return 'Demain';
  if (isYesterday(date)) return 'Hier';

  return format(date, 'EEEE d MMMM', { locale: fr });
}

export function formatEventDateTime(isoString: string): string {
  const date = parseISO(isoString);
  const dateStr = formatEventDate(isoString);
  const timeStr = format(date, 'HH:mm', { locale: fr });
  return `${dateStr} à ${timeStr}`;
}

export function formatEventRange(startIso: string, endIso: string): string {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  const dateStr = formatEventDate(startIso);
  const startTime = format(start, 'HH:mm', { locale: fr });
  const endTime = format(end, 'HH:mm', { locale: fr });
  return `${dateStr}, ${startTime} - ${endTime}`;
}

export function formatRelativeDate(isoString: string): string {
  const date = parseISO(isoString);
  return formatRelative(date, new Date(), { locale: fr });
}

export function getMonthRange(dateString: string): { start: string; end: string } {
  const date = parseISO(dateString);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}
