// HR Portal Design System - Colors
// Based on the existing HR Portal design

export const colors = {
  // Primary
  primary: {
    teal: '#17A2B8',
    darkTeal: '#138496',
  },
  
  // Status
  status: {
    valid: '#28A745',
    obsolete: '#DC3545',
  },
  
  // Backgrounds
  bg: {
    annexes: '#FFF4D4',
    annexesBorder: '#E5D4A0',
    lightGray: '#F8F9FA',
    tableStripe: '#F9FAFB',
  },
  
  // Text
  text: {
    primary: '#2C3E50',
    secondary: '#6C757D',
    muted: '#ADB5BD',
  },
  
  // Borders
  border: {
    default: '#DEE2E6',
    light: '#E9ECEF',
  },
} as const;

export const tailwindColors = {
  'hr-teal': '#17A2B8',
  'hr-teal-dark': '#138496',
  'hr-annexes': '#FFF4D4',
  'hr-annexes-border': '#E5D4A0',
} as const;
