export const KALA_TOOLS = [
  {
    name: 'create_event',
    description:
      'Crée un nouvel événement dans l\'agenda de l\'utilisateur. ' +
      'Utilise cet outil quand l\'utilisateur mentionne un rendez-vous, ' +
      'une réunion, une activité ou tout événement à planifier.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Titre court et descriptif de l\'événement',
        },
        description: {
          type: 'string',
          description: 'Description optionnelle avec des détails supplémentaires',
        },
        start_time: {
          type: 'string',
          description: 'Date et heure de début au format ISO 8601 (ex: 2026-03-15T14:30:00+01:00)',
        },
        end_time: {
          type: 'string',
          description: 'Date et heure de fin au format ISO 8601. Si non précisé, ajouter 1h par défaut.',
        },
        location: {
          type: 'string',
          description: 'Lieu de l\'événement si mentionné',
        },
        people: {
          type: 'array',
          items: { type: 'string' },
          description: 'Personnes impliquées ou invitées',
        },
        category: {
          type: 'string',
          enum: ['travail', 'personnel', 'sante', 'social', 'sport', 'administratif', 'autre'],
          description: 'Catégorie de l\'événement',
        },
        is_all_day: {
          type: 'boolean',
          description: 'True si c\'est un événement sur toute la journée',
        },
      },
      required: ['title', 'start_time', 'end_time', 'category'],
    },
  },
  {
    name: 'update_event',
    description:
      'Modifie un événement existant. Utilise quand l\'utilisateur veut ' +
      'changer l\'heure, le titre, le lieu ou d\'autres détails d\'un événement.',
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
            location: { type: 'string' },
            people: { type: 'array', items: { type: 'string' } },
            category: {
              type: 'string',
              enum: ['travail', 'personnel', 'sante', 'social', 'sport', 'administratif', 'autre'],
            },
          },
          description: 'Champs à mettre à jour',
        },
      },
      required: ['event_id', 'updates'],
    },
  },
  {
    name: 'delete_event',
    description:
      'Supprime un événement de l\'agenda. Utilise quand l\'utilisateur ' +
      'veut annuler ou supprimer un événement.',
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
    description:
      'Récupère les événements de l\'utilisateur sur une période donnée. ' +
      'Utilise quand l\'utilisateur demande son planning, ses prochains ' +
      'rendez-vous ou ce qu\'il a de prévu.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start_date: {
          type: 'string',
          description: 'Date de début de la recherche (ISO 8601)',
        },
        end_date: {
          type: 'string',
          description: 'Date de fin de la recherche (ISO 8601)',
        },
      },
      required: ['start_date', 'end_date'],
    },
  },
] as const;
