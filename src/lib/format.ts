/** Engineering numbers use Western digits in both languages so values are unambiguous on site. */
export function fmtNum(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  // Very small or very large values: switch to scientific notation instead of showing 0.00.
  if (abs !== 0 && (abs < Math.pow(10, -digits) || abs >= 1e12)) return value.toExponential(3);
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function fmtMoney(value: number | null, currency: string | null) {
  if (value == null) return '—';
  const rounded = value >= 1000 ? Math.round(value / 10) * 10 : Math.round(value);
  return `${rounded.toLocaleString('en-US')} ${currency ?? ''}`.trim();
}

export function timeAgo(iso: string, locale: string) {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
    for (const [u, sec] of units) if (s >= sec) return rtf.format(-Math.floor(s / sec), u);
    return rtf.format(0, 'minute');
  } catch {
    const h = Math.floor(s / 3600);
    return h >= 24 ? `${Math.floor(h / 24)}d` : `${h}h`;
  }
}
