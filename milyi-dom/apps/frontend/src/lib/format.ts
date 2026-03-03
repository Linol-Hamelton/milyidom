/**
 * Convert a Prisma Decimal (serialized as {s,e,d} by decimal.js) to a JS number.
 * Also handles plain number or string inputs for safety.
 */
export function decimalToNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val);
  const dec = val as { s?: number; e?: number; d?: number[] } | null;
  if (dec && Array.isArray(dec.d) && dec.d.length > 0 && typeof dec.e === 'number') {
    let coeff = String(dec.d[0]);
    for (let i = 1; i < dec.d.length; i++) {
      coeff += String(dec.d[i]).padStart(7, '0');
    }
    return (dec.s ?? 1) * Number(coeff) * Math.pow(10, dec.e - coeff.length + 1);
  }
  return 0;
}

export const formatCurrency = (value: number, currency = 'RUB', locale = 'ru-RU') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);

export const formatDate = (date: string | Date, locale = 'ru-RU', options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, options ?? { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));

export const formatDateRange = (start: string | Date, end: string | Date, locale = 'ru-RU') => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
  const formatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: sameMonth ? undefined : 'short',
  });
  const startText = formatter.format(startDate);
  const endText = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(endDate);
  return `${startText} — ${endText}`;
};

export const nightsBetween = (start: string | Date, end: string | Date) => {
  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();
  const diff = Math.max(endDate - startDate, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
