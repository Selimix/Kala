import { Colors } from './colors';

export type EventCategory =
  | 'travail'
  | 'personnel'
  | 'sante'
  | 'social'
  | 'sport'
  | 'administratif'
  | 'autre';

export const CATEGORIES: Record<EventCategory, { label: string; color: string; icon: string }> = {
  travail: { label: 'Travail', color: Colors.categories.travail, icon: 'briefcase' },
  personnel: { label: 'Personnel', color: Colors.categories.personnel, icon: 'heart' },
  sante: { label: 'Santé', color: Colors.categories.sante, icon: 'medical' },
  social: { label: 'Social', color: Colors.categories.social, icon: 'people' },
  sport: { label: 'Sport', color: Colors.categories.sport, icon: 'fitness' },
  administratif: { label: 'Administratif', color: Colors.categories.administratif, icon: 'document' },
  autre: { label: 'Autre', color: Colors.categories.autre, icon: 'ellipsis-horizontal' },
};
