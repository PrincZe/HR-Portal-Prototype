// HR Portal Design System - Typography

export const typography = {
  headings: {
    h1: 'text-3xl font-bold text-gray-900',
    h2: 'text-2xl font-semibold text-gray-800',
    h3: 'text-xl font-semibold text-gray-800',
    h4: 'text-lg font-semibold text-gray-700',
  },
  
  body: {
    large: 'text-base text-gray-700',
    normal: 'text-sm text-gray-700',
    small: 'text-xs text-gray-600',
  },
  
  links: {
    primary: 'text-[#17A2B8] hover:underline cursor-pointer',
    nav: 'text-gray-600 hover:text-[#17A2B8]',
  },
} as const;
