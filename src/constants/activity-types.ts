export type ActivityType =
  | 'deplacement'
  | 'reunion'
  | 'diner'
  | 'dejeuner'
  | 'appel'
  | 'visioconference'
  | 'rdv_medical'
  | 'sport'
  | 'courses'
  | 'administratif'
  | 'evenement_social'
  | 'travail_focus'
  | 'pause'
  | 'autre';

export interface ActivityTypeConfig {
  label: string;
  color: string;
  icon: string; // Ionicons name
}

export const ACTIVITY_TYPES: Record<ActivityType, ActivityTypeConfig> = {
  deplacement: {
    label: 'Déplacement',
    color: '#0984E3',
    icon: 'car',
  },
  reunion: {
    label: 'Réunion',
    color: '#6C5CE7',
    icon: 'people',
  },
  diner: {
    label: 'Dîner',
    color: '#E17055',
    icon: 'restaurant',
  },
  dejeuner: {
    label: 'Déjeuner',
    color: '#FDCB6E',
    icon: 'cafe',
  },
  appel: {
    label: 'Appel téléphonique',
    color: '#00B894',
    icon: 'call',
  },
  visioconference: {
    label: 'Visioconférence',
    color: '#00CEC9',
    icon: 'videocam',
  },
  rdv_medical: {
    label: 'Rendez-vous médical',
    color: '#FF7675',
    icon: 'medkit',
  },
  sport: {
    label: 'Sport / Entraînement',
    color: '#55E6C1',
    icon: 'fitness',
  },
  courses: {
    label: 'Courses',
    color: '#FFA502',
    icon: 'cart',
  },
  administratif: {
    label: 'Administratif',
    color: '#636E72',
    icon: 'document-text',
  },
  evenement_social: {
    label: 'Événement social',
    color: '#E056A0',
    icon: 'wine',
  },
  travail_focus: {
    label: 'Travail / Focus',
    color: '#0984E3',
    icon: 'briefcase',
  },
  pause: {
    label: 'Pause / Repos',
    color: '#ADB5BD',
    icon: 'leaf',
  },
  autre: {
    label: 'Autre',
    color: '#B2BEC3',
    icon: 'ellipsis-horizontal',
  },
};

// Mapping retro-compat: ancienne catégorie → nouveau type d'activité
export const CATEGORY_TO_ACTIVITY_TYPE: Record<string, ActivityType> = {
  travail: 'travail_focus',
  personnel: 'autre',
  sante: 'rdv_medical',
  social: 'evenement_social',
  sport: 'sport',
  administratif: 'administratif',
  autre: 'autre',
};
