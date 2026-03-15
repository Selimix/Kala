export const Colors = {
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5A4BD1',

  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F3F5',

  text: '#1A1A2E',
  textSecondary: '#6C757D',
  textLight: '#ADB5BD',
  textOnPrimary: '#FFFFFF',

  border: '#DEE2E6',
  borderLight: '#E9ECEF',

  success: '#00B894',
  error: '#E17055',
  warning: '#FDCB6E',

  userBubble: '#6C5CE7',
  assistantBubble: '#F1F3F5',

  // Auth screens theme (beige/gold)
  authBackground: '#EDE8DF',
  authGold: '#B8956A',
  authGoldDark: '#A07D58',
  authTitle: '#2C2C2C',

  // Home/Chat screen theme (sépia — cohérent avec auth)
  homeBg: '#EDE8DF',
  homeMicBg: '#B8956A',
  homeMicRipple: 'rgba(184, 149, 106, 0.25)',
  homeTagline: '#8C7A65',
  homeTextMuted: '#A09688',
  homeInputBg: 'rgba(255, 255, 255, 0.6)',
  homeInputBorder: '#D4CFC6',

  // Rétrocompat (utilisé nulle part sauf ancien code)
  categories: {
    travail: '#0984E3',
    personnel: '#6C5CE7',
    sante: '#00B894',
    social: '#E17055',
    sport: '#FDCB6E',
    administratif: '#636E72',
    autre: '#ADB5BD',
  },

  activityTypes: {
    deplacement: '#0984E3',
    reunion: '#6C5CE7',
    diner: '#E17055',
    dejeuner: '#FDCB6E',
    appel: '#00B894',
    visioconference: '#00CEC9',
    rdv_medical: '#FF7675',
    sport: '#55E6C1',
    courses: '#FFA502',
    administratif: '#636E72',
    evenement_social: '#E056A0',
    travail_focus: '#0984E3',
    pause: '#ADB5BD',
    autre: '#B2BEC3',
  },
} as const;
