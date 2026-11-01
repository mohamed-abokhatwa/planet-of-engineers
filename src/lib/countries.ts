export interface Country {
  code: string;
  en: string;
  ar: string;
  flag: string;
  currency: string;
}

const c = (code: string, en: string, ar: string, flag: string, currency: string): Country => ({ code, en, ar, flag, currency });

export const COUNTRIES: Country[] = [
  c('SA', 'Saudi Arabia', 'السعودية', '🇸🇦', 'SAR'),
  c('EG', 'Egypt', 'مصر', '🇪🇬', 'EGP'),
  c('AE', 'UAE', 'الإمارات', '🇦🇪', 'AED'),
  c('KW', 'Kuwait', 'الكويت', '🇰🇼', 'KWD'),
  c('QA', 'Qatar', 'قطر', '🇶🇦', 'QAR'),
  c('BH', 'Bahrain', 'البحرين', '🇧🇭', 'BHD'),
  c('OM', 'Oman', 'عُمان', '🇴🇲', 'OMR'),
  c('JO', 'Jordan', 'الأردن', '🇯🇴', 'JOD'),
  c('PS', 'Palestine', 'فلسطين', '🇵🇸', 'ILS'),
  c('LB', 'Lebanon', 'لبنان', '🇱🇧', 'USD'),
  c('SY', 'Syria', 'سوريا', '🇸🇾', 'SYP'),
  c('IQ', 'Iraq', 'العراق', '🇮🇶', 'IQD'),
  c('YE', 'Yemen', 'اليمن', '🇾🇪', 'YER'),
  c('SD', 'Sudan', 'السودان', '🇸🇩', 'SDG'),
  c('LY', 'Libya', 'ليبيا', '🇱🇾', 'LYD'),
  c('TN', 'Tunisia', 'تونس', '🇹🇳', 'TND'),
  c('DZ', 'Algeria', 'الجزائر', '🇩🇿', 'DZD'),
  c('MA', 'Morocco', 'المغرب', '🇲🇦', 'MAD'),
  c('TR', 'Türkiye', 'تركيا', '🇹🇷', 'TRY'),
  c('PK', 'Pakistan', 'باكستان', '🇵🇰', 'PKR'),
  c('IN', 'India', 'الهند', '🇮🇳', 'INR'),
  c('BD', 'Bangladesh', 'بنغلاديش', '🇧🇩', 'BDT'),
  c('ID', 'Indonesia', 'إندونيسيا', '🇮🇩', 'IDR'),
  c('MY', 'Malaysia', 'ماليزيا', '🇲🇾', 'MYR'),
  c('NG', 'Nigeria', 'نيجيريا', '🇳🇬', 'NGN'),
  c('GB', 'United Kingdom', 'المملكة المتحدة', '🇬🇧', 'GBP'),
  c('US', 'United States', 'الولايات المتحدة', '🇺🇸', 'USD'),
  c('CA', 'Canada', 'كندا', '🇨🇦', 'CAD'),
  c('DE', 'Germany', 'ألمانيا', '🇩🇪', 'EUR'),
  c('FR', 'France', 'فرنسا', '🇫🇷', 'EUR'),
  c('NL', 'Netherlands', 'هولندا', '🇳🇱', 'EUR'),
  c('IE', 'Ireland', 'أيرلندا', '🇮🇪', 'EUR'),
  c('SE', 'Sweden', 'السويد', '🇸🇪', 'SEK'),
  c('AU', 'Australia', 'أستراليا', '🇦🇺', 'AUD'),
  c('ZA', 'South Africa', 'جنوب أفريقيا', '🇿🇦', 'ZAR'),
  c('XX', 'Other country', 'دولة أخرى', '🌍', 'USD'),
];

export const CURRENCIES = [...new Set(COUNTRIES.map((x) => x.currency))].sort();

export const findCountry = (code: string) => COUNTRIES.find((x) => x.code === code) ?? COUNTRIES[COUNTRIES.length - 1];
export const countryName = (code: string, locale: 'en' | 'ar') => (locale === 'ar' ? findCountry(code).ar : findCountry(code).en);
export const flag = (code: string) => findCountry(code).flag;
