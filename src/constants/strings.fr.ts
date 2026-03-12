export const Strings = {
  app: {
    name: 'Kala',
    tagline: 'Votre assistant intelligent d\'agenda',
  },

  auth: {
    login: 'Se connecter',
    register: 'Créer un compte',
    email: 'Adresse email',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    displayName: 'Votre prénom',
    noAccount: 'Pas encore de compte ?',
    hasAccount: 'Déjà un compte ?',
    loginError: 'Email ou mot de passe incorrect',
    registerError: 'Erreur lors de la création du compte',
    passwordMismatch: 'Les mots de passe ne correspondent pas',
  },

  tabs: {
    chat: 'Kala',
    calendar: 'Agenda',
    settings: 'Réglages',
  },

  chat: {
    placeholder: 'Décrivez un événement...',
    greeting: 'Bonjour ! Je suis Kala, votre assistant d\'agenda. Dites-moi ce que vous avez prévu et je m\'occupe du reste.',
    thinking: 'Kala réfléchit...',
    error: 'Désolé, une erreur est survenue. Réessayez.',
    confirm: 'Confirmer',
    modify: 'Modifier',
    cancel: 'Annuler',
  },

  calendar: {
    today: 'Aujourd\'hui',
    noEvents: 'Aucun événement prévu',
    allDay: 'Toute la journée',
  },

  settings: {
    title: 'Réglages',
    profile: 'Profil',
    aiProvider: 'Modèle IA',
    notifications: 'Notifications',
    morningCheckin: 'Rappel du matin',
    eveningCheckin: 'Rappel du soir',
    logout: 'Se déconnecter',
    version: 'Version',
  },

  categories: {
    travail: 'Travail',
    personnel: 'Personnel',
    sante: 'Santé',
    social: 'Social',
    sport: 'Sport',
    administratif: 'Administratif',
    autre: 'Autre',
  },

  event: {
    edit: 'Modifier',
    delete: 'Supprimer',
    deleteConfirm: 'Êtes-vous sûr de vouloir supprimer cet événement ?',
    deleteConfirmYes: 'Supprimer',
    deleteConfirmNo: 'Annuler',
  },
} as const;
