// Country list with ISO codes and emoji flags.
// Emoji flags render natively on iOS/Android; on web they fall back to the ISO code.

export interface Country {
  code: string; // ISO 3166-1 alpha-2 (e.g. "US")
  name: string;
  flag: string; // emoji flag (regional indicator symbols)
}

// Convert a 2-letter ISO code to a flag emoji.
function isoToFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 0x1f1a5));
}

const COUNTRY_CODES = [
  'US', 'IN', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES', 'IT', 'BR',
  'RU', 'CN', 'JP', 'KR', 'AR', 'MX', 'TR', 'NL', 'PL', 'SE',
  'NO', 'UA', 'ID', 'PH', 'VN', 'TH', 'PK', 'BD', 'SA', 'AE',
  'EG', 'ZA', 'NG', 'KE', 'PT', 'GR', 'CZ', 'RO', 'HU', 'BE',
  'AT', 'CH', 'DK', 'FI', 'IE', 'NZ', 'SG', 'MY', 'IL', 'IR',
  'IQ', 'CL', 'CO', 'PE', 'VE', 'EC', 'RS', 'HR', 'SK', 'SI',
];

export const COUNTRIES: Country[] = COUNTRY_CODES.map((code) => ({
  code,
  name: new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code,
  flag: isoToFlag(code),
}));

const COUNTRY_MAP: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c]),
);

export function getCountry(code?: string | null): Country | null {
  if (!code) return null;
  return COUNTRY_MAP[code.toUpperCase()] || null;
}

export { isoToFlag };
