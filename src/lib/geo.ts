const COUNTRY_NAMES: Record<string, string> = {
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  QA: 'Qatar',
  KW: 'Kuwait',
  BH: 'Bahrain',
  OM: 'Oman',
  IN: 'India',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  LK: 'Sri Lanka',
  NP: 'Nepal',
  CN: 'China',
  HK: 'Hong Kong',
  SG: 'Singapore',
  MY: 'Malaysia',
  PH: 'Philippines',
  ID: 'Indonesia',
  TH: 'Thailand',
  VN: 'Vietnam',
  JP: 'Japan',
  KR: 'South Korea',
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  IE: 'Ireland',
  DE: 'Germany',
  FR: 'France',
  NL: 'Netherlands',
  BE: 'Belgium',
  ES: 'Spain',
  IT: 'Italy',
  PT: 'Portugal',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  CH: 'Switzerland',
  AT: 'Austria',
  PL: 'Poland',
  TR: 'Turkey',
  EG: 'Egypt',
  ZA: 'South Africa',
  NG: 'Nigeria',
  KE: 'Kenya',
  AU: 'Australia',
  NZ: 'New Zealand',
  BR: 'Brazil',
  MX: 'Mexico',
  RU: 'Russia',
  UA: 'Ukraine',
  XX: 'Unknown',
  T1: 'Tor / Anonymous',
};

export function countryNameFromCode(code: string | null | undefined) {
  if (!code) return 'Unknown';
  const normalized = code.trim().toUpperCase();
  if (!normalized || normalized === 'XX' || normalized === 'ZZ') return 'Unknown';
  return COUNTRY_NAMES[normalized] || normalized;
}

export function countryFromRequest(request: Request) {
  const headers = request.headers;
  const raw =
    headers.get('cf-ipcountry') ||
    headers.get('x-vercel-ip-country') ||
    headers.get('x-country-code') ||
    headers.get('cloudfront-viewer-country') ||
    '';
  const code = raw.trim().toUpperCase();
  if (!code || code === 'XX' || code === 'ZZ') {
    return { code: null as string | null, name: 'Unknown' };
  }
  return { code, name: countryNameFromCode(code) };
}

export const LIVE_WINDOW_MS = 2 * 60 * 1000;
