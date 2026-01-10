// Singapore Government Agencies
// Source: Based on Public Service Division organizational structure

export const AGENCIES = [
  // Ministries
  { value: 'AGC', label: 'Attorney-General\'s Chambers', type: 'ministry' },
  { value: 'MCCY', label: 'Ministry of Culture, Community and Youth', type: 'ministry' },
  { value: 'MINDEF', label: 'Ministry of Defence', type: 'ministry' },
  { value: 'MOE', label: 'Ministry of Education', type: 'ministry' },
  { value: 'MOF', label: 'Ministry of Finance', type: 'ministry' },
  { value: 'MFA', label: 'Ministry of Foreign Affairs', type: 'ministry' },
  { value: 'MOH', label: 'Ministry of Health', type: 'ministry' },
  { value: 'MHA', label: 'Ministry of Home Affairs', type: 'ministry' },
  { value: 'MND', label: 'Ministry of National Development', type: 'ministry' },
  { value: 'MOM', label: 'Ministry of Manpower', type: 'ministry' },
  { value: 'MSF', label: 'Ministry of Social and Family Development', type: 'ministry' },
  { value: 'MSFD', label: 'Ministry of Sustainability and the Environment', type: 'ministry' },
  { value: 'MTI', label: 'Ministry of Trade and Industry', type: 'ministry' },
  { value: 'MOT', label: 'Ministry of Transport', type: 'ministry' },
  { value: 'PMO', label: 'Prime Minister\'s Office', type: 'ministry' },
  { value: 'PSD', label: 'Public Service Division', type: 'ministry' },
  
  // Statutory Boards (Major ones)
  { value: 'ACRA', label: 'Accounting and Corporate Regulatory Authority', type: 'statboard' },
  { value: 'BCA', label: 'Building and Construction Authority', type: 'statboard' },
  { value: 'CPF', label: 'Central Provident Fund Board', type: 'statboard' },
  { value: 'EDB', label: 'Economic Development Board', type: 'statboard' },
  { value: 'ESG', label: 'Enterprise Singapore', type: 'statboard' },
  { value: 'GovTech', label: 'Government Technology Agency', type: 'statboard' },
  { value: 'HDB', label: 'Housing & Development Board', type: 'statboard' },
  { value: 'HPB', label: 'Health Promotion Board', type: 'statboard' },
  { value: 'HSA', label: 'Health Sciences Authority', type: 'statboard' },
  { value: 'IRAS', label: 'Inland Revenue Authority of Singapore', type: 'statboard' },
  { value: 'ICA', label: 'Immigration & Checkpoints Authority', type: 'statboard' },
  { value: 'IMDA', label: 'Info-communications Media Development Authority', type: 'statboard' },
  { value: 'JTC', label: 'JTC Corporation', type: 'statboard' },
  { value: 'LTA', label: 'Land Transport Authority', type: 'statboard' },
  { value: 'MAS', label: 'Monetary Authority of Singapore', type: 'statboard' },
  { value: 'NAC', label: 'National Arts Council', type: 'statboard' },
  { value: 'NHB', label: 'National Heritage Board', type: 'statboard' },
  { value: 'NLB', label: 'National Library Board', type: 'statboard' },
  { value: 'NParks', label: 'National Parks Board', type: 'statboard' },
  { value: 'NEA', label: 'National Environment Agency', type: 'statboard' },
  { value: 'PUB', label: 'Public Utilities Board', type: 'statboard' },
  { value: 'SLA', label: 'Singapore Land Authority', type: 'statboard' },
  { value: 'SPF', label: 'Singapore Police Force', type: 'statboard' },
  { value: 'SCDF', label: 'Singapore Civil Defence Force', type: 'statboard' },
  { value: 'SLA', label: 'Singapore Land Authority', type: 'statboard' },
  { value: 'SSG', label: 'SkillsFuture Singapore', type: 'statboard' },
  { value: 'STB', label: 'Singapore Tourism Board', type: 'statboard' },
  { value: 'URA', label: 'Urban Redevelopment Authority', type: 'statboard' },
  { value: 'WSG', label: 'Workforce Singapore', type: 'statboard' },
] as const;

export const MINISTRY_AGENCIES = AGENCIES.filter(a => a.type === 'ministry');
export const STATBOARD_AGENCIES = AGENCIES.filter(a => a.type === 'statboard');

export type AgencyCode = typeof AGENCIES[number]['value'];
