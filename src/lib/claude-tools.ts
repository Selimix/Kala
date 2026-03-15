export const ACTIVITY_TYPE_ENUM = [
  'deplacement', 'reunion', 'diner', 'dejeuner', 'appel',
  'visioconference', 'rdv_medical', 'sport', 'courses',
  'administratif', 'evenement_social', 'travail_focus', 'pause', 'autre',
] as const;

export const PLACE_CATEGORY_ENUM = [
  'restaurant', 'bureau', 'domicile', 'salle_de_sport', 'hopital',
  'cabinet_medical', 'ecole', 'commerce', 'bar', 'parc',
  'gare', 'aeroport', 'autre',
] as const;

export const RELATIONSHIP_TYPE_ENUM = [
  'collegue', 'ami', 'famille', 'medecin', 'client',
  'prestataire', 'voisin', 'autre',
] as const;

export const TASK_STATUS_ENUM = ['pending', 'in_progress', 'completed'] as const;
export const TASK_PRIORITY_ENUM = ['low', 'medium', 'high', 'urgent'] as const;

export const KALA_TOOLS = [
  // ── Events ──
  {
    name: 'create_event',
    description:
      'Crée un nouvel événement dans l\'agenda. ' +
      'Utilise place_name et people_names pour les lieux et contacts — ' +
      'le système résout automatiquement vers des entités existantes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Titre court et descriptif de l\'événement',
        },
        description: {
          type: 'string',
          description: 'Description optionnelle',
        },
        start_time: {
          type: 'string',
          description: 'Date/heure début ISO 8601 (ex: 2026-03-15T14:30:00+01:00)',
        },
        end_time: {
          type: 'string',
          description: 'Date/heure fin ISO 8601. Durée par défaut: 1h.',
        },
        activity_type: {
          type: 'string',
          enum: [...ACTIVITY_TYPE_ENUM],
          description: 'Type d\'activité déduit du contexte',
        },
        place_name: {
          type: 'string',
          description: 'Nom du lieu (ex: "Bureau", "Le Petit Bistrot"). Sera associé à un lieu existant ou créé automatiquement.',
        },
        people_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Noms des personnes (ex: ["Marie", "Dr. Martin"]). Seront associés à des contacts existants ou créés automatiquement.',
        },
        is_all_day: {
          type: 'boolean',
          description: 'True si événement sur toute la journée',
        },
      },
      required: ['title', 'start_time', 'end_time', 'activity_type'],
    },
  },
  {
    name: 'update_event',
    description: 'Modifie un événement existant.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: {
          type: 'string',
          description: 'UUID de l\'événement à modifier',
        },
        updates: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            start_time: { type: 'string' },
            end_time: { type: 'string' },
            activity_type: {
              type: 'string',
              enum: [...ACTIVITY_TYPE_ENUM],
            },
            place_name: { type: 'string' },
            people_names: { type: 'array', items: { type: 'string' } },
            is_all_day: { type: 'boolean' },
          },
          description: 'Champs à mettre à jour',
        },
      },
      required: ['event_id', 'updates'],
    },
  },
  {
    name: 'delete_event',
    description: 'Supprime un événement de l\'agenda.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: {
          type: 'string',
          description: 'UUID de l\'événement à supprimer',
        },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'list_events',
    description: 'Récupère les événements sur une période donnée.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start_date: {
          type: 'string',
          description: 'Date début ISO 8601',
        },
        end_date: {
          type: 'string',
          description: 'Date fin ISO 8601',
        },
      },
      required: ['start_date', 'end_date'],
    },
  },

  // ── Lieux ──
  {
    name: 'search_places',
    description: 'Recherche un lieu dans les lieux enregistrés de l\'utilisateur.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Nom ou partie du nom du lieu',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_place',
    description: 'Crée un nouveau lieu explicitement.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Nom du lieu',
        },
        address: {
          type: 'string',
          description: 'Adresse complète',
        },
        category: {
          type: 'string',
          enum: [...PLACE_CATEGORY_ENUM],
          description: 'Type de lieu',
        },
      },
      required: ['name'],
    },
  },

  // ── Personas ──
  {
    name: 'search_personas',
    description: 'Recherche un contact dans les contacts de l\'utilisateur.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Nom ou partie du nom du contact',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_persona',
    description: 'Crée un nouveau contact explicitement.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Nom du contact',
        },
        relationship: {
          type: 'string',
          enum: [...RELATIONSHIP_TYPE_ENUM],
          description: 'Type de relation',
        },
        email: {
          type: 'string',
          description: 'Adresse email',
        },
        phone: {
          type: 'string',
          description: 'Numéro de téléphone',
        },
      },
      required: ['name'],
    },
  },

  // ── Tâches ──
  {
    name: 'create_task',
    description:
      'Crée une nouvelle tâche/todo. ' +
      'Utilise cet outil quand l\'utilisateur mentionne quelque chose à faire, ' +
      'à ne pas oublier, ou une tâche à accomplir.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Titre court et descriptif de la tâche',
        },
        description: {
          type: 'string',
          description: 'Description optionnelle avec plus de détails',
        },
        due_date: {
          type: 'string',
          description: 'Date/heure échéance ISO 8601 (optionnel). Ex: 2026-03-15T18:00:00+01:00',
        },
        priority: {
          type: 'string',
          enum: [...TASK_PRIORITY_ENUM],
          description: 'Priorité de la tâche. Par défaut: medium.',
        },
        category_name: {
          type: 'string',
          description: 'Nom de la catégorie (ex: "Personnelle / Familiale", "Professionnelle"). Sera résolu vers une catégorie existante.',
        },
        is_private: {
          type: 'boolean',
          description: 'Si true, seul le créateur voit les détails. Les autres membres voient "Tâche privée". Hérite de la catégorie par défaut si non précisé.',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description: 'Modifie une tâche existante (titre, description, échéance, priorité, statut, catégorie, visibilité).',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: {
          type: 'string',
          description: 'UUID de la tâche à modifier',
        },
        updates: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            due_date: { type: 'string' },
            priority: { type: 'string', enum: [...TASK_PRIORITY_ENUM] },
            status: { type: 'string', enum: [...TASK_STATUS_ENUM] },
            category_name: { type: 'string', description: 'Nom de la catégorie à associer' },
            is_private: { type: 'boolean', description: 'Visibilité privée' },
          },
          description: 'Champs à mettre à jour',
        },
      },
      required: ['task_id', 'updates'],
    },
  },
  {
    name: 'complete_task',
    description: 'Marque une tâche comme terminée. Raccourci pour changer le statut à "completed".',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: {
          type: 'string',
          description: 'UUID de la tâche à compléter',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Liste les tâches. Peut filtrer par statut, priorité, ou plage de dates.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: [...TASK_STATUS_ENUM],
          description: 'Filtrer par statut',
        },
        priority: {
          type: 'string',
          enum: [...TASK_PRIORITY_ENUM],
          description: 'Filtrer par priorité',
        },
        due_before: {
          type: 'string',
          description: 'Tâches dont l\'échéance est avant cette date ISO 8601',
        },
        due_after: {
          type: 'string',
          description: 'Tâches dont l\'échéance est après cette date ISO 8601',
        },
      },
      required: [],
    },
  },

  // ── Catégories de tâches ──
  {
    name: 'create_task_category',
    description:
      'Crée une nouvelle catégorie de tâches pour le calendrier actif. ' +
      'Utilise cet outil quand l\'utilisateur veut ajouter une catégorie personnalisée.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Nom de la catégorie (ex: "Sport", "Études")',
        },
        color: {
          type: 'string',
          description: 'Couleur hexadécimale (ex: "#55E6C1"). Par défaut: "#636E72".',
        },
        icon: {
          type: 'string',
          description: 'Nom d\'icône Ionicons (ex: "fitness", "school"). Par défaut: "pricetag".',
        },
        is_private_by_default: {
          type: 'boolean',
          description: 'Si true, les tâches de cette catégorie seront privées par défaut. Par défaut: false.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_task_categories',
    description: 'Liste les catégories de tâches disponibles dans le calendrier actif.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  // ── Avis lieux ──
  {
    name: 'rate_place',
    description:
      'Enregistre un avis/note sur un lieu. ' +
      'Utilise cet outil quand l\'utilisateur donne son avis sur un restaurant, bar, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        place_name: {
          type: 'string',
          description: 'Nom du lieu à noter',
        },
        rating: {
          type: 'number',
          description: 'Note de 1 à 5 étoiles',
        },
        comment: {
          type: 'string',
          description: 'Commentaire optionnel (ex: "service lent mais bonne cuisine")',
        },
        criteria: {
          type: 'object',
          properties: {
            ambiance: { type: 'number', description: 'Note ambiance 1-5' },
            service: { type: 'number', description: 'Note service 1-5' },
            prix: { type: 'number', description: 'Note rapport qualité/prix 1-5' },
            qualite: { type: 'number', description: 'Note qualité 1-5' },
          },
          description: 'Notes détaillées par critère (optionnel)',
        },
      },
      required: ['place_name', 'rating'],
    },
  },

  // ── Recherche restaurants ──
  {
    name: 'search_restaurants',
    description:
      'Recherche des restaurants/lieux pour une sortie. ' +
      'Propose d\'abord les lieux favoris de l\'utilisateur (triés par fréquence et note), ' +
      'puis cherche sur Foursquare Places si pas assez de résultats.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Type de cuisine ou nom (ex: "restaurant italien", "sushi", "brunch")',
        },
        near: {
          type: 'string',
          description: 'Adresse ou ville pour la recherche Foursquare Places (optionnel)',
        },
      },
      required: ['query'],
    },
  },

  // ── Proposition SMS ──
  {
    name: 'propose_sms',
    description:
      'Propose d\'envoyer un SMS à un contact pour le prévenir d\'un événement. ' +
      'Le message s\'ouvre dans l\'application SMS native du téléphone. ' +
      'Utilise cet outil après avoir confirmé tous les détails d\'un événement social.',
    input_schema: {
      type: 'object' as const,
      properties: {
        persona_name: {
          type: 'string',
          description: 'Nom du contact à prévenir',
        },
        message: {
          type: 'string',
          description: 'Message SMS amical incluant date/heure, lieu et formule sympa',
        },
        phone: {
          type: 'string',
          description: 'Numéro de téléphone si connu (sinon le système cherche dans les contacts)',
        },
      },
      required: ['persona_name', 'message'],
    },
  },
] as const;
