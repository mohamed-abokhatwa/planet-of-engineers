// Fast on-device checks for posts. The database repeats the important ones (see has_contact_info in the SQL).
// Engineers write lots of numbers ("1200 1500 1800 kN", "C30/37", "Ø16@200"), so phone detection
// only matches real phone-number shapes, not any long run of digits.

export type PostIssue = 'contact' | 'link' | 'abuse' | 'scam' | 'too_short' | 'too_long';

const D = '[0-9٠-٩۰-۹]'; // Latin, Arabic-Indic and Persian digits
const PHONE: RegExp[] = [
  new RegExp(`(\\+|\\b00)\\s?${D}{1,3}[\\s.-]?${D}([\\s.-]?${D}){6,12}`), // +966 55 123 4567, 00201012345678
  new RegExp(`(^|[^0-9٠-٩۰-۹.,/])0${D}{2}[\\s.-]?${D}{3}[\\s.-]?${D}{3,5}(?![0-9٠-٩۰-۹])`), // 0551234567, 010 1234 5678
  new RegExp(`\\(${D}{2,4}\\)\\s?${D}{3}[\\s.-]?${D}{3,4}`), // (012) 345-6789
];
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const HANDLE = /(^|\s)@[a-z_][a-z0-9_.]{2,}/i; // "@200" (bar spacing) is not a handle
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|me|ly|co|link|app|xyz|info)\b)/i;
const CONTACT_WORDS =
  /(whats\s*app|wa\.me|telegram|t\.me|snap\s*chat|instagram|facebook\.com|tik\s*tok|call me|text me|dm me|contact me on|my number|واتس|واتساب|تلغرام|تليجرام|كلمني|كلموني|رقمي|تواصل معي|راسلني)/i;
const SCAM = /(western union|bitcoin|crypto wallet|send money|gift card|paypal me|حوالة|ارسل(وا)? (لي )?(مال|فلوس))/i;
// Arabic words are matched as whole words only: "كس" is inside "عكس" (reverse), "زب" inside "زبون" (customer).
const ABUSE = /(fuck|shit|bitch|asshole|(?<!\p{L})(كس|زب|شرموط|عرص|منيوك|متناك)(?!\p{L}))/iu;

export function hasContactInfo(text: string): boolean {
  const t = text.normalize('NFKC');
  return PHONE.some((r) => r.test(t)) || EMAIL.test(t) || HANDLE.test(t) || CONTACT_WORDS.test(t);
}

export function checkPostText(text: string, minLen: number, maxLen = 2000): PostIssue | null {
  const t = text.trim().normalize('NFKC');
  if (t.length < minLen) return 'too_short';
  if (t.length > maxLen) return 'too_long';
  if (hasContactInfo(t)) return 'contact';
  if (LINK.test(t)) return 'link';
  if (SCAM.test(t)) return 'scam';
  if (ABUSE.test(t)) return 'abuse';
  return null;
}

/** Public handle: starts with a letter, 3–20 of letters, digits, _ or ., at most 4 digits. */
export function isValidHandle(h: string): boolean {
  if (!/^[A-Za-z][A-Za-z0-9_.]{2,19}$/.test(h)) return false;
  if ((h.match(/[0-9]/g) ?? []).length > 4) return false;
  return !ABUSE.test(h);
}
