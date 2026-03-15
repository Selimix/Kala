import Anthropic from 'npm:@anthropic-ai/sdk@^0.39.0';
import { createClient } from 'npm:@supabase/supabase-js@^2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// Enums (mirrored from client claude-tools.ts)
// ============================================================
const ACTIVITY_TYPE_ENUM = [
  'deplacement', 'reunion', 'diner', 'dejeuner', 'appel',
  'visioconference', 'rdv_medical', 'sport', 'courses',
  'administratif', 'evenement_social', 'travail_focus', 'pause', 'autre',
] as const;

const PLACE_CATEGORY_ENUM = [
  'restaurant', 'bureau', 'domicile', 'salle_de_sport', 'hopital',
  'cabinet_medical', 'ecole', 'commerce', 'bar', 'parc',
  'gare', 'aeroport', 'autre',
] as const;

const RELATIONSHIP_TYPE_ENUM = [
  'collegue', 'ami', 'famille', 'medecin', 'client',
  'prestataire', 'voisin', 'autre',
] as const;

const TASK_STATUS_ENUM = ['pending', 'in_progress', 'completed'] as const;
const TASK_PRIORITY_ENUM = ['low', 'medium', 'high', 'urgent'] as const;

// ============================================================
// Helpers
// ============================================================

/** Infer place category from activity type */
function inferPlaceCategory(activityType: string): string {
  const map: Record<string, string> = {
    diner: 'restaurant',
    dejeuner: 'restaurant',
    reunion: 'bureau',
    travail_focus: 'bureau',
    rdv_medical: 'cabinet_medical',
    sport: 'salle_de_sport',
    courses: 'commerce',
    evenement_social: 'bar',
    deplacement: 'gare',
  };
  return map[activityType] || 'autre';
}

/** Map new activity_type to old category for backward compat */
function mapActivityToCategory(activityType: string): string {
  const map: Record<string, string> = {
    deplacement: 'personnel',
    reunion: 'travail',
    diner: 'social',
    dejeuner: 'social',
    appel: 'travail',
    visioconference: 'travail',
    rdv_medical: 'sante',
    sport: 'sport',
    courses: 'personnel',
    administratif: 'administratif',
    evenement_social: 'social',
    travail_focus: 'travail',
    pause: 'personnel',
    autre: 'autre',
  };
  return map[activityType] || 'autre';
}

// ============================================================
// System prompt
// ============================================================
interface SystemPromptContext {
  currentDatetime: string;
  userTimezone: string;
  calendarName?: string;
  pendingTasksSummary?: string;
  categoriesSummary?: string;
  habitsSummary?: string;
  frequentCombos?: string;
  userLocation?: { latitude: number; longitude: number } | null;
}

const SYSTEM_PROMPT = (ctx: SystemPromptContext) => `Tu es Kāla, un assistant intelligent de gestion d'agenda et de tâches. Tu parles en français.
${ctx.calendarName ? `\nCalendrier actif: "${ctx.calendarName}" — c'est un calendrier partagé. Les événements, lieux, contacts et tâches sont visibles par tous les membres.\n` : ''}
Ton rôle:
- Aider l'utilisateur à gérer son agenda et ses tâches de manière naturelle et conversationnelle
- Interpréter les demandes en langage naturel pour créer, modifier ou supprimer des événements et des tâches
- Être proactif sur les tâches : rappeler les tâches en retard, mentionner les tâches du jour
- Reformuler les événements et tâches de manière claire dans ta réponse
- Donner des récapitulatifs quand on te le demande

PHILOSOPHIE — AGIR D'ABORD, QUESTIONS INTERACTIVES ENSUITE :
Tu es un assistant EFFICACE et FLUIDE. Quand l'utilisateur demande quelque chose, AGIS immédiatement avec les infos disponibles.

OUTIL PRESENT_OPTIONS — CRITIQUE, UTILISE-LE SYSTÉMATIQUEMENT :
À CHAQUE FOIS que tu poses une question ou proposes des choix, tu DOIS appeler present_options EN PLUS de ton texte.
C'est un outil qui affiche des boutons cliquables dans l'interface. L'utilisateur peut taper directement sur un bouton au lieu de taper du texte.

Tu DOIS appeler present_options dans ces situations :
- Choix d'horaire → options: [{label:"9h"}, {label:"10h"}, {label:"11h"}]
- Confirmation oui/non → options: [{label:"Oui ✓"}, {label:"Non, modifier"}]
- Choix de contact (plusieurs résultats) → options: [{label:"Agnès Dupont"}, {label:"Agnès Martin"}]
- Type de cuisine → options: [{label:"Italien"}, {label:"Japonais"}, {label:"Français"}]
- Durée → options: [{label:"30 min"}, {label:"1h"}, {label:"1h30"}, {label:"2h"}]
- Suivi après action → options: [{label:"Prévenir par SMS"}, {label:"C'est tout, merci"}]
- Choix de restaurant → options avec les noms des restos trouvés

RÈGLE : Si ta réponse contient une question → appelle present_options. Pas d'exception.

VÉRIFICATION DE CONFLITS — OBLIGATOIRE :
AVANT de créer un événement avec create_event, tu DOIS TOUJOURS appeler check_conflicts avec le créneau prévu.
- Si aucun conflit → procède avec create_event normalement.
- Si conflit détecté → INFORME l'utilisateur du conflit et propose des alternatives via present_options :
  * "Décaler [événement existant]"
  * "Créer quand même (chevauchement)"
  * "Choisir un autre créneau"
- Ne crée JAMAIS un événement sans avoir vérifié les conflits d'abord.
- Si l'utilisateur choisit de DÉCALER un événement existant (suite à un conflit) :
  1. Modifie l'événement avec update_event
  2. Vérifie s'il y a des participants (people_names) sur l'événement décalé
  3. Si oui → propose AUTOMATIQUEMENT de les prévenir par SMS via propose_sms pour chaque participant
  4. Utilise present_options : ["Prévenir les participants", "Ne pas prévenir", "Prévenir seulement [nom]"]
  5. Le SMS doit mentionner le nouveau créneau et être formulé poliment ("Suite à un changement de programme, notre [événement] est décalé à [nouvel horaire]")

Pour les événements :
- Si date, heure et titre sont donnés → check_conflicts PUIS crée l'événement.
- S'il manque juste l'heure → propose des créneaux via present_options et crée quand l'utilisateur choisit.
- S'il manque des infos critiques → demande avec present_options quand possible.
- Après création → present_options avec ["Prévenir quelqu'un par SMS ?", "C'est tout, merci"]

Pour les recherches de lieux/restaurants :
- Si l'utilisateur mentionne un type de cuisine → lance search_restaurants IMMÉDIATEMENT.
- Si la position GPS est disponible → utilise-la directement, NE PAS demander le quartier.
- Après résultats → present_options avec les noms des restaurants trouvés pour choix rapide.

Ce qu'il faut ÉVITER :
- Poser 3-4 questions TEXTE avant d'agir
- Demander le quartier quand on a le GPS
- Lister des options en texte au lieu d'utiliser present_options
- Refuser d'agir parce qu'il "manque" des détails non essentiels

COMPRÉHENSION DU CONTEXTE CONVERSATIONNEL (CRITIQUE) :
- Quand l'utilisateur dit "il y en a", "où en trouver", "lesquels sont ouverts", le pronom "en" se réfère TOUJOURS au sujet de la conversation en cours, PAS aux restaurants par défaut.
- Exemple : si on parle de King Jouet et l'utilisateur dit "dis moi où il y en a d'ouvert", il parle de magasins King Jouet, PAS de restaurants.
- Exemple : si on parle de pharmacies et l'utilisateur dit "il y en a près de chez moi ?", il parle de pharmacies, PAS de restaurants.
- NE JAMAIS appeler search_restaurants si le sujet de la conversation n'est PAS lié à la nourriture/boisson (restaurant, bar, café, boulangerie, etc.).
- search_restaurants est UNIQUEMENT pour les lieux de restauration/boisson. Pour les magasins, commerces, services, etc., réponds avec tes connaissances ou suggère de chercher sur Google Maps/Plans.
- Pour les enseignes connues (King Jouet, Fnac, Darty, Decathlon, etc.), donne directement les informations que tu connais sur les magasins proches du quartier mentionné, et propose de vérifier les horaires d'ouverture en ligne.

Règles:
- Réponds toujours en français
- NE JAMAIS créer un événement avec des informations vagues ou incomplètes
- Si le lieu est un quartier/zone ("à côté de...", "vers...", "dans le coin de..."), demande le lieu exact
- Si des informations manquent (date, heure, lieu précis, participants), pose des questions avant de créer l'événement
- La durée par défaut d'un événement est 1 heure
- Sois concis, chaleureux et proactif dans tes réponses — pose toujours des questions complémentaires
- Utilise le format 24h pour les heures (standard français)
- Quand tu crées un événement, confirme avec un résumé clair

Types d'activité — déduis automatiquement du contexte:
- "dîner/resto/manger le soir" → diner
- "déjeuner/lunch/midi" → dejeuner
- "réunion/meeting/point/sync" → reunion
- "rdv médecin/docteur/dentiste/kiné" → rdv_medical
- "appel/tel/téléphone" → appel
- "visio/zoom/teams/meet" → visioconference
- "sport/gym/course à pied/natation" → sport
- "trajet/aller à/voyage/train/avion" → deplacement
- "courses/supermarché/marché" → courses
- "papiers/impôts/banque/administratif" → administratif
- "fête/anniversaire/soirée/apéro" → evenement_social
- "bosser/coder/focus/travailler" → travail_focus
- "pause/sieste/repos" → pause
- Tout le reste → autre

Lieux et contacts — RÉSOLUTION OBLIGATOIRE :
- Quand l'utilisateur mentionne un prénom ou un nom → appelle TOUJOURS search_personas AVANT de créer l'événement.
- Si plusieurs résultats (ex: "Agnès Dupont" et "Agnès Martin") → utilise present_options pour laisser l'utilisateur choisir.
- Si un seul résultat → utilise ce contact directement (avec son nom complet).
- Si aucun résultat → crée le contact et demande les infos manquantes (téléphone, relation).
- Même logique pour les lieux : search_places avant de créer.
- Les lieux et contacts sont partagés au niveau du calendrier actif.

Avis et suggestions de lieux:
- Quand l'utilisateur donne un avis sur un lieu ("c'était bien/nul/moyen"), utilise rate_place avec la note appropriée
- Les lieux avec les meilleures notes et le plus de visites sont proposés en priorité
- Si l'utilisateur demande un endroit nouveau ou veut changer, utilise search_restaurants
- Pour la recherche, combine les résultats internes (favoris) et Foursquare Places

RECHERCHE DE RESTAURANTS :
Quand l'utilisateur cherche un restaurant → lance search_restaurants IMMÉDIATEMENT avec les infos disponibles.
- Si un type de cuisine est mentionné → utilise-le comme query
- Si le GPS est dispo → les résultats seront automatiquement proches de l'utilisateur
- Présente les résultats de façon claire : nom, type, adresse, note si disponible
- Termine par UNE question de suivi : "Un de ceux-là te tente ?" ou "Tu veux que je crée un événement ?"

Tâches:
- Quand l'utilisateur mentionne quelque chose à faire, un todo, ou une tâche, utilise create_task
- Déduis la priorité du contexte: "urgent/critique/asap" → urgent, "important" → high, par défaut → medium, "quand j'ai le temps/éventuellement" → low
- Si l'utilisateur dit "c'est fait" ou "j'ai terminé [tâche]", utilise complete_task
- Propose proactivement de créer des tâches quand le contexte s'y prête
- Mentionne les tâches en retard ou à échéance proche quand c'est pertinent dans la conversation
- Si l'utilisateur te salue ou demande un résumé, mentionne les tâches en attente

Catégories de tâches:
- Chaque tâche peut appartenir à une catégorie (Personnelle, Professionnelle, etc.)
- Utilise category_name dans create_task pour associer à une catégorie existante
- Si l'utilisateur veut une nouvelle catégorie, utilise create_task_category
- Les tâches privées (is_private) ne montrent que "Tâche privée" aux autres membres du calendrier partagé
- Certaines catégories sont privées par défaut — respecte ce réglage sauf demande contraire
- Utilise list_task_categories pour voir les catégories disponibles avant d'en créer une nouvelle
${ctx.categoriesSummary ? `\nCatégories disponibles:\n${ctx.categoriesSummary}\n` : ''}
${ctx.pendingTasksSummary ? `\nTâches en cours de l'utilisateur:\n${ctx.pendingTasksSummary}\n` : ''}
${ctx.habitsSummary ? `\nLieux favoris de l'utilisateur:\n${ctx.habitsSummary}\n` : ''}
${ctx.frequentCombos ? `\nCombos fréquents (personne → lieu):\n${ctx.frequentCombos}\n` : ''}
Contexte temporel:
- Date et heure actuelles: ${ctx.currentDatetime}
- Fuseau horaire de l'utilisateur: ${ctx.userTimezone}
${ctx.userLocation ? `\nPosition GPS de l'utilisateur: ${ctx.userLocation.latitude.toFixed(4)}, ${ctx.userLocation.longitude.toFixed(4)}. Utilise cette information pour contextualiser tes réponses sur les lieux proches. Quand tu appelles search_restaurants sans paramètre "near", le système utilisera automatiquement la position GPS pour des résultats à proximité.` : '\nPosition GPS non disponible — utilise le paramètre "near" pour localiser les recherches de restaurants.'}`;

// ============================================================
// Tool definitions (8 tools)
// ============================================================
const TOOLS_ANTHROPIC = [
  // ── Events ──
  {
    name: 'create_event',
    description:
      "Crée un nouvel événement dans l'agenda. " +
      "Utilise place_name et people_names pour les lieux et contacts — " +
      "le système résout automatiquement vers des entités existantes.",
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: "Titre court et descriptif de l'événement" },
        description: { type: 'string', description: 'Description optionnelle' },
        start_time: { type: 'string', description: 'Date/heure début ISO 8601 (ex: 2026-03-15T14:30:00+01:00)' },
        end_time: { type: 'string', description: 'Date/heure fin ISO 8601. Durée par défaut: 1h.' },
        activity_type: {
          type: 'string',
          enum: [...ACTIVITY_TYPE_ENUM],
          description: "Type d'activité déduit du contexte",
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
        is_all_day: { type: 'boolean', description: 'True si événement sur toute la journée' },
      },
      required: ['title', 'start_time', 'end_time', 'activity_type'],
    },
  },
  {
    name: 'update_event',
    description: 'Modifie un événement existant.',
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: "UUID de l'événement à modifier" },
        updates: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            start_time: { type: 'string' },
            end_time: { type: 'string' },
            activity_type: { type: 'string', enum: [...ACTIVITY_TYPE_ENUM] },
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
    description: "Supprime un événement de l'agenda.",
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: "UUID de l'événement à supprimer" },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'list_events',
    description: 'Récupère les événements sur une période donnée.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Date début ISO 8601' },
        end_date: { type: 'string', description: 'Date fin ISO 8601' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  // ── Lieux ──
  {
    name: 'search_places',
    description: "Recherche un lieu dans les lieux enregistrés de l'utilisateur.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nom ou partie du nom du lieu' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_place',
    description: 'Crée un nouveau lieu explicitement.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom du lieu' },
        address: { type: 'string', description: 'Adresse complète' },
        category: { type: 'string', enum: [...PLACE_CATEGORY_ENUM], description: 'Type de lieu' },
      },
      required: ['name'],
    },
  },
  // ── Personas ──
  {
    name: 'search_personas',
    description: "Recherche un contact dans les contacts de l'utilisateur.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nom ou partie du nom du contact' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_persona',
    description: 'Crée un nouveau contact explicitement.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom du contact' },
        relationship: { type: 'string', enum: [...RELATIONSHIP_TYPE_ENUM], description: 'Type de relation' },
        email: { type: 'string', description: 'Adresse email' },
        phone: { type: 'string', description: 'Numéro de téléphone' },
      },
      required: ['name'],
    },
  },
  // ── Tâches ──
  {
    name: 'create_task',
    description:
      "Crée une nouvelle tâche/todo. " +
      "Utilise cet outil quand l'utilisateur mentionne quelque chose à faire, " +
      "à ne pas oublier, ou une tâche à accomplir.",
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titre court et descriptif de la tâche' },
        description: { type: 'string', description: 'Description optionnelle' },
        due_date: { type: 'string', description: 'Date/heure échéance ISO 8601 (optionnel)' },
        priority: {
          type: 'string',
          enum: [...TASK_PRIORITY_ENUM],
          description: 'Priorité (défaut: medium)',
        },
        category_name: {
          type: 'string',
          description: 'Nom de la catégorie (ex: "Personnelle / Familiale", "Professionnelle"). Sera résolu vers une catégorie existante.',
        },
        is_private: {
          type: 'boolean',
          description: 'Si true, seul le créateur voit les détails. Hérite de la catégorie par défaut si non précisé.',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description: 'Modifie une tâche existante.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID de la tâche à modifier' },
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
    description: 'Marque une tâche comme terminée.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID de la tâche à compléter' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Liste les tâches avec filtres optionnels.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: [...TASK_STATUS_ENUM], description: 'Filtrer par statut' },
        priority: { type: 'string', enum: [...TASK_PRIORITY_ENUM], description: 'Filtrer par priorité' },
        due_before: { type: 'string', description: "Tâches dont l'échéance est avant cette date" },
        due_after: { type: 'string', description: "Tâches dont l'échéance est après cette date" },
      },
      required: [],
    },
  },
  // ── Catégories de tâches ──
  {
    name: 'create_task_category',
    description: "Crée une nouvelle catégorie de tâches pour le calendrier actif.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom de la catégorie (ex: "Sport", "Études")' },
        color: { type: 'string', description: 'Couleur hexadécimale (ex: "#55E6C1"). Par défaut: "#636E72".' },
        icon: { type: 'string', description: "Nom d'icône Ionicons (ex: \"fitness\"). Par défaut: \"pricetag\"." },
        is_private_by_default: { type: 'boolean', description: 'Si true, tâches privées par défaut. Par défaut: false.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_task_categories',
    description: 'Liste les catégories de tâches disponibles dans le calendrier actif.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  // ── Avis lieux ──
  {
    name: 'rate_place',
    description: "Enregistre un avis/note sur un lieu. Utilise quand l'utilisateur donne son avis sur un restaurant, bar, etc.",
    input_schema: {
      type: 'object',
      properties: {
        place_name: { type: 'string', description: 'Nom du lieu à noter' },
        rating: { type: 'number', description: 'Note de 1 à 5 étoiles' },
        comment: { type: 'string', description: 'Commentaire optionnel' },
        criteria: {
          type: 'object',
          properties: {
            ambiance: { type: 'number' },
            service: { type: 'number' },
            prix: { type: 'number' },
            qualite: { type: 'number' },
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
    description: "Recherche des restaurants/lieux. Propose d'abord les favoris de l'utilisateur, puis cherche sur Foursquare Places. IMPORTANT: Avant d'appeler cet outil, assure-toi d'avoir clarifié le type de cuisine et le quartier avec l'utilisateur. Après les résultats, présente-les de manière engageante et pose une question de suivi.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Type de cuisine ou nom (ex: "restaurant italien", "sushi"). Sois précis pour des résultats pertinents.' },
        near: { type: 'string', description: 'Adresse, quartier ou ville pour la recherche (ex: "Montparnasse, Paris", "75014"). TOUJOURS remplir si l\'utilisateur mentionne un lieu.' },
      },
      required: ['query'],
    },
  },
  // ── Vérification de conflits ──
  {
    name: 'check_conflicts',
    description:
      "Vérifie s'il y a des conflits avec des événements existants sur un créneau donné. " +
      "OBLIGATOIRE : appelle cet outil AVANT create_event pour vérifier les chevauchements. " +
      "Si des conflits sont détectés, propose des alternatives via present_options.",
    input_schema: {
      type: 'object',
      properties: {
        start_time: { type: 'string', description: 'Date/heure début ISO 8601 du créneau à vérifier' },
        end_time: { type: 'string', description: 'Date/heure fin ISO 8601 du créneau à vérifier' },
        exclude_event_id: { type: 'string', description: "UUID d'un événement à exclure (pour les mises à jour)" },
      },
      required: ['start_time', 'end_time'],
    },
  },
  // ── Proposition SMS ──
  {
    name: 'propose_sms',
    description: "Propose d'envoyer un SMS à un contact pour le prévenir d'un événement. Le message s'ouvre dans l'app SMS native.",
    input_schema: {
      type: 'object',
      properties: {
        persona_name: { type: 'string', description: 'Nom du contact à prévenir' },
        message: { type: 'string', description: 'Message SMS amical incluant date/heure, lieu et formule sympa' },
        phone: { type: 'string', description: 'Numéro de téléphone si connu' },
      },
      required: ['persona_name', 'message'],
    },
  },
  // ── UI: Suggestion chips ──
  {
    name: 'present_options',
    description:
      "Affiche des boutons/chips cliquables à l'utilisateur pour un choix rapide. " +
      "Utilise cet outil SYSTÉMATIQUEMENT quand tu proposes des options (horaires, lieux, oui/non, etc.). " +
      "L'utilisateur pourra cliquer directement au lieu de taper.",
    input_schema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'Question courte affichée au-dessus des options',
        },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: "Texte du bouton (court: '9h', '10h', 'Oui', 'Non', etc.)" },
              icon: { type: 'string', description: "Nom d'icône Ionicons optionnel (ex: 'time-outline', 'restaurant-outline', 'checkmark-circle')" },
            },
            required: ['label'],
          },
          description: 'Liste des options cliquables (2-6 options)',
        },
      },
      required: ['options'],
    },
  },
];

// Convert Anthropic tool format to OpenAI function calling format
function toOpenAITools() {
  return TOOLS_ANTHROPIC.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

// ============================================================
// Entity resolution helpers
// ============================================================

/** Find or create a place by name, scoped to calendar or user */
async function resolvePlace(
  supabaseUser: any,
  userId: string,
  placeName: string,
  activityType?: string,
  calendarId?: string
): Promise<string> {
  // Search for existing place (case-insensitive), scoped by calendar or user
  let query = supabaseUser
    .from('places')
    .select('id, name')
    .ilike('name', `%${placeName}%`)
    .limit(1);

  if (calendarId) {
    query = query.eq('calendar_id', calendarId);
  } else {
    query = query.eq('user_id', userId);
  }

  const { data: existing } = await query;

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // Create new place
  const category = activityType ? inferPlaceCategory(activityType) : 'autre';
  const { data: newPlace, error } = await supabaseUser
    .from('places')
    .insert({
      user_id: userId,
      calendar_id: calendarId || null,
      name: placeName,
      category,
    })
    .select('id')
    .single();

  if (error) throw error;
  return newPlace.id;
}

/** Find or create a persona by name, scoped to calendar or user */
async function resolvePersona(
  supabaseUser: any,
  userId: string,
  personName: string,
  calendarId?: string
): Promise<string> {
  // Search for existing persona (case-insensitive), scoped by calendar or user
  let query = supabaseUser
    .from('personas')
    .select('id, name')
    .ilike('name', `%${personName}%`)
    .limit(1);

  if (calendarId) {
    query = query.eq('calendar_id', calendarId);
  } else {
    query = query.eq('user_id', userId);
  }

  const { data: existing } = await query;

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // Create new persona
  const { data: newPersona, error } = await supabaseUser
    .from('personas')
    .insert({
      user_id: userId,
      calendar_id: calendarId || null,
      name: personName,
      relationship: 'autre',
    })
    .select('id')
    .single();

  if (error) throw error;
  return newPersona.id;
}

/** Find a task category by name (fuzzy match) */
async function resolveTaskCategory(
  supabaseUser: any,
  categoryName: string,
  calendarId?: string
): Promise<string | null> {
  if (!calendarId) return null;

  const { data: existing } = await supabaseUser
    .from('task_categories')
    .select('id, name')
    .eq('calendar_id', calendarId)
    .ilike('name', `%${categoryName}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0].id;
  }
  return null;
}

/** Link personas to an event via junction table */
async function linkPersonasToEvent(
  supabaseUser: any,
  eventId: string,
  personaIds: string[]
): Promise<void> {
  if (personaIds.length === 0) return;

  // Delete existing links
  await supabaseUser
    .from('events_personas')
    .delete()
    .eq('event_id', eventId);

  // Insert new links
  const rows = personaIds.map(pid => ({ event_id: eventId, persona_id: pid }));
  const { error } = await supabaseUser
    .from('events_personas')
    .insert(rows);

  if (error) throw error;
}

// Enriched select for events with place + personas + creator joins
const ENRICHED_SELECT = '*, place:places(*), event_personas:events_personas(persona:personas(*)), creator:profiles!created_by(display_name)';

// ============================================================
// Tool executor
// ============================================================
async function executeTool(
  toolName: string,
  toolInput: any,
  supabaseUser: any,
  userId: string,
  calendarId?: string,
  userLocation?: { latitude: number; longitude: number } | null
): Promise<{ result: string; eventId?: string; taskId?: string }> {
  switch (toolName) {
    // ── Vérification de conflits ──
    case 'check_conflicts': {
      let query = supabaseUser
        .from('events')
        .select('id, title, start_time, end_time, activity_type, location')
        .lt('start_time', toolInput.end_time)
        .gt('end_time', toolInput.start_time);

      if (calendarId) {
        query = query.eq('calendar_id', calendarId);
      } else {
        query = query.eq('user_id', userId);
      }

      if (toolInput.exclude_event_id) {
        query = query.neq('id', toolInput.exclude_event_id);
      }

      const { data: conflicts, error } = await query.order('start_time');
      if (error) throw error;

      if (!conflicts || conflicts.length === 0) {
        return {
          result: JSON.stringify({
            has_conflicts: false,
            message: 'Aucun conflit — le créneau est libre.',
          }),
        };
      }

      const conflictList = conflicts.map((e: any) => ({
        event_id: e.id,
        title: e.title,
        start_time: e.start_time,
        end_time: e.end_time,
        activity_type: e.activity_type,
        location: e.location,
      }));

      return {
        result: JSON.stringify({
          has_conflicts: true,
          conflicts: conflictList,
          message: `${conflicts.length} événement(s) en conflit sur ce créneau.`,
        }),
      };
    }

    // ── Events ──
    case 'create_event': {
      // Resolve place
      let placeId: string | null = null;
      if (toolInput.place_name) {
        placeId = await resolvePlace(supabaseUser, userId, toolInput.place_name, toolInput.activity_type, calendarId);
      }

      // Resolve personas
      const personaIds: string[] = [];
      if (toolInput.people_names && toolInput.people_names.length > 0) {
        for (const name of toolInput.people_names) {
          const pid = await resolvePersona(supabaseUser, userId, name, calendarId);
          personaIds.push(pid);
        }
      }

      // Insert event
      const { data, error } = await supabaseUser
        .from('events')
        .insert({
          user_id: userId,
          created_by: userId,
          calendar_id: calendarId || null,
          title: toolInput.title,
          description: toolInput.description || null,
          start_time: toolInput.start_time,
          end_time: toolInput.end_time,
          activity_type: toolInput.activity_type,
          place_id: placeId,
          is_all_day: toolInput.is_all_day || false,
          // Backward compat
          location: toolInput.place_name || null,
          people: toolInput.people_names || [],
          category: mapActivityToCategory(toolInput.activity_type),
        })
        .select()
        .single();
      if (error) throw error;

      // Link personas via junction
      if (personaIds.length > 0) {
        await linkPersonasToEvent(supabaseUser, data.id, personaIds);
      }

      // Log visit for social events (habits tracking)
      const socialTypes = ['diner', 'dejeuner', 'evenement_social'];
      if (placeId && socialTypes.includes(toolInput.activity_type)) {
        try {
          await supabaseUser.from('visit_log').insert({
            user_id: userId,
            calendar_id: calendarId || null,
            place_id: placeId,
            persona_ids: personaIds,
            activity_type: toolInput.activity_type,
          });
          // Increment visit_count
          const { data: placeData } = await supabaseUser
            .from('places')
            .select('visit_count')
            .eq('id', placeId)
            .single();
          if (placeData) {
            await supabaseUser
              .from('places')
              .update({ visit_count: (placeData.visit_count || 0) + 1 })
              .eq('id', placeId);
          }
        } catch (e) {
          console.warn('Could not log visit:', e);
        }
      }

      // Re-fetch with enriched data
      const { data: enriched } = await supabaseUser
        .from('events')
        .select(ENRICHED_SELECT)
        .eq('id', data.id)
        .single();

      return {
        result: JSON.stringify({ success: true, event_id: data.id, event: enriched || data }),
        eventId: data.id,
      };
    }

    case 'update_event': {
      const updates: any = { updated_at: new Date().toISOString() };

      // Simple fields
      if (toolInput.updates.title) updates.title = toolInput.updates.title;
      if (toolInput.updates.description !== undefined) updates.description = toolInput.updates.description;
      if (toolInput.updates.start_time) updates.start_time = toolInput.updates.start_time;
      if (toolInput.updates.end_time) updates.end_time = toolInput.updates.end_time;
      if (toolInput.updates.is_all_day !== undefined) updates.is_all_day = toolInput.updates.is_all_day;
      if (toolInput.updates.activity_type) {
        updates.activity_type = toolInput.updates.activity_type;
        updates.category = mapActivityToCategory(toolInput.updates.activity_type);
      }

      // Resolve place
      if (toolInput.updates.place_name) {
        const placeId = await resolvePlace(
          supabaseUser, userId,
          toolInput.updates.place_name,
          toolInput.updates.activity_type,
          calendarId
        );
        updates.place_id = placeId;
        updates.location = toolInput.updates.place_name;
      }

      const { data, error } = await supabaseUser
        .from('events')
        .update(updates)
        .eq('id', toolInput.event_id)
        .select()
        .single();
      if (error) throw error;

      // Resolve personas
      if (toolInput.updates.people_names && toolInput.updates.people_names.length > 0) {
        const personaIds: string[] = [];
        for (const name of toolInput.updates.people_names) {
          const pid = await resolvePersona(supabaseUser, userId, name, calendarId);
          personaIds.push(pid);
        }
        await linkPersonasToEvent(supabaseUser, data.id, personaIds);
        // Backward compat
        await supabaseUser
          .from('events')
          .update({ people: toolInput.updates.people_names })
          .eq('id', data.id);
      }

      // Re-fetch enriched
      const { data: enriched } = await supabaseUser
        .from('events')
        .select(ENRICHED_SELECT)
        .eq('id', data.id)
        .single();

      return {
        result: JSON.stringify({ success: true, event: enriched || data }),
        eventId: data.id,
      };
    }

    case 'delete_event': {
      const { error } = await supabaseUser
        .from('events')
        .delete()
        .eq('id', toolInput.event_id);
      if (error) throw error;
      return {
        result: JSON.stringify({ success: true, deleted: toolInput.event_id }),
        eventId: toolInput.event_id,
      };
    }

    case 'list_events': {
      let listQuery = supabaseUser
        .from('events')
        .select(ENRICHED_SELECT)
        .gte('start_time', toolInput.start_date)
        .lte('start_time', toolInput.end_date)
        .order('start_time', { ascending: true });

      if (calendarId) {
        listQuery = listQuery.eq('calendar_id', calendarId);
      }

      const { data, error } = await listQuery;
      if (error) throw error;
      return { result: JSON.stringify({ events: data || [] }) };
    }

    // ── Places ──
    case 'search_places': {
      let placeQuery = supabaseUser
        .from('places')
        .select('*')
        .ilike('name', `%${toolInput.query}%`)
        .order('name')
        .limit(10);

      if (calendarId) {
        placeQuery = placeQuery.eq('calendar_id', calendarId);
      } else {
        placeQuery = placeQuery.eq('user_id', userId);
      }

      const { data, error } = await placeQuery;
      if (error) throw error;
      return { result: JSON.stringify({ places: data || [] }) };
    }

    case 'create_place': {
      const { data, error } = await supabaseUser
        .from('places')
        .insert({
          user_id: userId,
          calendar_id: calendarId || null,
          name: toolInput.name,
          address: toolInput.address || null,
          category: toolInput.category || 'autre',
        })
        .select()
        .single();
      if (error) throw error;
      return { result: JSON.stringify({ success: true, place: data }) };
    }

    // ── Personas ──
    case 'search_personas': {
      let personaQuery = supabaseUser
        .from('personas')
        .select('*')
        .ilike('name', `%${toolInput.query}%`)
        .order('name')
        .limit(10);

      if (calendarId) {
        personaQuery = personaQuery.eq('calendar_id', calendarId);
      } else {
        personaQuery = personaQuery.eq('user_id', userId);
      }

      const { data, error } = await personaQuery;
      if (error) throw error;
      return { result: JSON.stringify({ personas: data || [] }) };
    }

    case 'create_persona': {
      const { data, error } = await supabaseUser
        .from('personas')
        .insert({
          user_id: userId,
          calendar_id: calendarId || null,
          name: toolInput.name,
          relationship: toolInput.relationship || 'autre',
          email: toolInput.email || null,
          phone: toolInput.phone || null,
        })
        .select()
        .single();
      if (error) throw error;
      return { result: JSON.stringify({ success: true, persona: data }) };
    }

    // ── Tasks ──
    case 'create_task': {
      // Resolve category by name
      let categoryId: string | null = null;
      let isPrivate = toolInput.is_private ?? false;

      if (toolInput.category_name) {
        categoryId = await resolveTaskCategory(supabaseUser, toolInput.category_name, calendarId);
        // Inherit is_private_by_default from category if not explicitly set
        if (categoryId && toolInput.is_private === undefined) {
          const { data: catData } = await supabaseUser
            .from('task_categories')
            .select('is_private_by_default')
            .eq('id', categoryId)
            .single();
          if (catData) isPrivate = catData.is_private_by_default;
        }
      }

      const { data, error } = await supabaseUser
        .from('tasks')
        .insert({
          user_id: userId,
          created_by: userId,
          calendar_id: calendarId || null,
          title: toolInput.title,
          description: toolInput.description || null,
          priority: toolInput.priority || 'medium',
          due_date: toolInput.due_date || null,
          category_id: categoryId,
          is_private: isPrivate,
        })
        .select('*, creator:profiles!created_by(display_name), category:task_categories(*)')
        .single();
      if (error) throw error;
      return {
        result: JSON.stringify({ success: true, task_id: data.id, task: data }),
        taskId: data.id,
      };
    }

    case 'update_task': {
      const taskUpdates: any = { updated_at: new Date().toISOString() };
      if (toolInput.updates.title) taskUpdates.title = toolInput.updates.title;
      if (toolInput.updates.description !== undefined) taskUpdates.description = toolInput.updates.description;
      if (toolInput.updates.due_date !== undefined) taskUpdates.due_date = toolInput.updates.due_date;
      if (toolInput.updates.priority) taskUpdates.priority = toolInput.updates.priority;
      if (toolInput.updates.status) {
        taskUpdates.status = toolInput.updates.status;
        if (toolInput.updates.status === 'completed') {
          taskUpdates.completed_at = new Date().toISOString();
        } else {
          taskUpdates.completed_at = null;
        }
      }
      // Resolve category
      if (toolInput.updates.category_name) {
        const catId = await resolveTaskCategory(supabaseUser, toolInput.updates.category_name, calendarId);
        if (catId) taskUpdates.category_id = catId;
      }
      if (toolInput.updates.is_private !== undefined) {
        taskUpdates.is_private = toolInput.updates.is_private;
      }

      const { data, error } = await supabaseUser
        .from('tasks')
        .update(taskUpdates)
        .eq('id', toolInput.task_id)
        .select('*, creator:profiles!created_by(display_name), category:task_categories(*)')
        .single();
      if (error) throw error;
      return {
        result: JSON.stringify({ success: true, task: data }),
        taskId: data.id,
      };
    }

    case 'complete_task': {
      const { data, error } = await supabaseUser
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', toolInput.task_id)
        .select('*, creator:profiles!created_by(display_name), category:task_categories(*)')
        .single();
      if (error) throw error;
      return {
        result: JSON.stringify({ success: true, task: data }),
        taskId: data.id,
      };
    }

    case 'list_tasks': {
      let taskQuery = supabaseUser
        .from('tasks')
        .select('*, creator:profiles!created_by(display_name), category:task_categories(*)')
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true, nullsFirst: false });

      if (calendarId) {
        taskQuery = taskQuery.eq('calendar_id', calendarId);
      }
      if (toolInput.status) {
        taskQuery = taskQuery.eq('status', toolInput.status);
      }
      if (toolInput.priority) {
        taskQuery = taskQuery.eq('priority', toolInput.priority);
      }
      if (toolInput.due_before) {
        taskQuery = taskQuery.lte('due_date', toolInput.due_before);
      }
      if (toolInput.due_after) {
        taskQuery = taskQuery.gte('due_date', toolInput.due_after);
      }

      const { data, error } = await taskQuery;
      if (error) throw error;
      return { result: JSON.stringify({ tasks: data || [] }) };
    }

    // ── Task Categories ──
    case 'create_task_category': {
      if (!calendarId) {
        return { result: JSON.stringify({ error: 'Aucun calendrier actif' }) };
      }

      const { data: existing } = await supabaseUser
        .from('task_categories')
        .select('position')
        .eq('calendar_id', calendarId)
        .order('position', { ascending: false })
        .limit(1);
      const nextPos = (existing?.[0]?.position ?? -1) + 1;

      const { data, error } = await supabaseUser
        .from('task_categories')
        .insert({
          calendar_id: calendarId,
          name: toolInput.name,
          color: toolInput.color || '#636E72',
          icon: toolInput.icon || 'pricetag',
          is_private_by_default: toolInput.is_private_by_default || false,
          position: nextPos,
        })
        .select()
        .single();
      if (error) throw error;
      return { result: JSON.stringify({ success: true, category: data }) };
    }

    case 'list_task_categories': {
      let catQuery = supabaseUser
        .from('task_categories')
        .select('*')
        .order('position', { ascending: true });
      if (calendarId) {
        catQuery = catQuery.eq('calendar_id', calendarId);
      }
      const { data, error } = await catQuery;
      if (error) throw error;
      return { result: JSON.stringify({ categories: data || [] }) };
    }

    // ── Rate Place ──
    case 'rate_place': {
      // Resolve place by name
      const rPlaceId = await resolvePlace(supabaseUser, userId, toolInput.place_name, undefined, calendarId);

      // Upsert rating
      const { data: ratingData, error: rErr } = await supabaseUser
        .from('place_ratings')
        .upsert({
          place_id: rPlaceId,
          user_id: userId,
          rating: toolInput.rating,
          comment: toolInput.comment || null,
          criteria: toolInput.criteria || {},
        }, { onConflict: 'place_id,user_id' })
        .select()
        .single();
      if (rErr) throw rErr;

      // Recalculate avg_rating
      const { data: allRatings } = await supabaseUser
        .from('place_ratings')
        .select('rating')
        .eq('place_id', rPlaceId);

      if (allRatings && allRatings.length > 0) {
        const avg = allRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / allRatings.length;
        await supabaseUser
          .from('places')
          .update({ avg_rating: Math.round(avg * 10) / 10 })
          .eq('id', rPlaceId);
      }

      return { result: JSON.stringify({ success: true, rating: ratingData, place_name: toolInput.place_name }) };
    }

    // ── Search Restaurants ──
    case 'search_restaurants': {
      // 1. Search internal places (favorites)
      let internalQuery = supabaseUser
        .from('places')
        .select('*')
        .in('category', ['restaurant', 'bar'])
        .order('visit_count', { ascending: false })
        .order('avg_rating', { ascending: false, nullsFirst: false })
        .limit(5);

      if (calendarId) {
        internalQuery = internalQuery.eq('calendar_id', calendarId);
      } else {
        internalQuery = internalQuery.eq('user_id', userId);
      }

      // Also filter by query if provided
      if (toolInput.query) {
        internalQuery = internalQuery.ilike('name', `%${toolInput.query}%`);
      }

      const { data: internalPlaces } = await internalQuery;
      const favorites = (internalPlaces || []).map((p: any) => ({
        name: p.name,
        address: p.address,
        category: p.category,
        avg_rating: p.avg_rating,
        visit_count: p.visit_count,
        source: 'favori',
      }));

      // 2. Search Foursquare Places if not enough internal results
      let externalResults: any[] = [];
      let fsqDebug = '';
      const fsqApiKey = Deno.env.get('FOURSQUARE_API_KEY');
      if (favorites.length < 3 && fsqApiKey) {
        try {
          const params = new URLSearchParams({
            query: toolInput.query || 'restaurant',
            limit: '5',
          });
          if (toolInput.near) {
            // L'IA a spécifié un lieu texte → priorité
            params.set('near', toolInput.near);
          } else if (userLocation) {
            // Utiliser les coordonnées GPS → plus précis
            params.set('ll', `${userLocation.latitude},${userLocation.longitude}`);
            params.set('radius', '5000'); // 5km autour de l'utilisateur
          } else {
            // Fallback
            params.set('near', 'France');
          }

          const fsqUrl = `https://places-api.foursquare.com/places/search?${params.toString()}`;
          console.log('[FSQ] Calling:', fsqUrl);

          const fsqResponse = await fetch(fsqUrl, {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${fsqApiKey}`,
              'X-Places-Api-Version': '2025-02-05',
            },
          });

          console.log('[FSQ] Status:', fsqResponse.status);

          if (fsqResponse.ok) {
            const fsqData = await fsqResponse.json();
            console.log('[FSQ] Results count:', fsqData.results?.length || 0);
            externalResults = (fsqData.results || []).map((fp: any) => {
              // Extract category name from basic search results
              const categoryName = fp.categories?.[0]?.name || null;
              // New places-api uses 'fsq_place_id' instead of 'fsq_id'
              const placeId = fp.fsq_place_id || fp.fsq_id || null;

              return {
                name: fp.name || 'Inconnu',
                address: fp.location?.formatted_address || fp.location?.address || null,
                fsq_rating: null,  // Not available in free tier search
                fsq_price: null,   // Not available in free tier search
                fsq_id: placeId,
                category: categoryName,
                source: 'foursquare',
              };
            });

            // Save Foursquare results as local places for future reference
            for (const fr of externalResults) {
              if (fr.fsq_id) {
                const { data: existing } = await supabaseUser
                  .from('places')
                  .select('id')
                  .eq('google_place_id', fr.fsq_id) // reusing column for external ID
                  .limit(1);

                if (!existing || existing.length === 0) {
                  await supabaseUser.from('places').insert({
                    user_id: userId,
                    calendar_id: calendarId || null,
                    name: fr.name,
                    address: fr.address,
                    category: 'restaurant',
                    google_place_id: fr.fsq_id,
                    google_rating: fr.fsq_rating,
                    google_price_level: fr.fsq_price,
                  });
                }
              }
            }
          } else {
            const errBody = await fsqResponse.text();
            fsqDebug = `FSQ error ${fsqResponse.status}: ${errBody}`;
            console.warn('[FSQ] Error:', fsqDebug);
          }
        } catch (e) {
          fsqDebug = `FSQ exception: ${e}`;
          console.warn('Foursquare Places search failed:', e);
        }
      } else if (!fsqApiKey) {
        fsqDebug = 'FOURSQUARE_API_KEY not set';
      }

      return {
        result: JSON.stringify({
          favorites,
          external_results: externalResults,
          total: favorites.length + externalResults.length,
          debug: fsqDebug || undefined,
        }),
      };
    }

    // ── Propose SMS ──
    case 'propose_sms': {
      // Resolve persona by name
      let personaQuery = supabaseUser
        .from('personas')
        .select('*')
        .ilike('name', `%${toolInput.persona_name}%`)
        .limit(1);

      if (calendarId) {
        personaQuery = personaQuery.eq('calendar_id', calendarId);
      } else {
        personaQuery = personaQuery.eq('user_id', userId);
      }

      const { data: personas } = await personaQuery;
      const persona = personas?.[0];

      const phone = toolInput.phone || persona?.phone;
      if (!phone) {
        return {
          result: JSON.stringify({
            error: `Pas de numéro de téléphone pour ${toolInput.persona_name}. Demande le numéro à l'utilisateur.`,
          }),
        };
      }

      return {
        result: JSON.stringify({
          success: true,
          persona_name: persona?.name || toolInput.persona_name,
          phone,
          message: toolInput.message,
        }),
      };
    }

    case 'present_options': {
      // Cet outil ne fait rien côté serveur — les options sont rendues côté client
      // via tool_calls dans la réponse
      return {
        result: JSON.stringify({
          success: true,
          displayed: true,
          options: toolInput.options,
          question: toolInput.question || null,
        }),
      };
    }

    default:
      return { result: JSON.stringify({ error: 'Outil inconnu' }) };
  }
}

// ============================================================
// Provider: Claude (Anthropic)
// ============================================================
async function callClaude(
  messages: Array<{ role: string; content: any }>,
  systemPrompt: string,
  supabaseUser: any,
  userId: string,
  calendarId?: string,
  userLocation?: { latitude: number; longitude: number } | null
) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configurée');

  const anthropic = new Anthropic({ apiKey });
  const eventsAffected: string[] = [];
  const tasksAffected: string[] = [];
  const toolCalls: any[] = [];
  const allToolResults: any[] = [];

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    tools: TOOLS_ANTHROPIC as any,
    messages: messages as any,
  });

  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter((b: any) => b.type === 'tool_use');
    const toolResults: any[] = [];

    for (const toolUse of toolUseBlocks) {
      toolCalls.push({ id: toolUse.id, name: toolUse.name, input: toolUse.input });
      try {
        const { result, eventId, taskId } = await executeTool(toolUse.name, toolUse.input, supabaseUser, userId, calendarId, userLocation);
        if (eventId) eventsAffected.push(eventId);
        if (taskId) tasksAffected.push(taskId);
        const toolResult = { tool_use_id: toolUse.id, content: result };
        toolResults.push({ type: 'tool_result', ...toolResult });
        allToolResults.push(toolResult);
      } catch (err: any) {
        const toolResult = { tool_use_id: toolUse.id, content: JSON.stringify({ error: err.message }), is_error: true };
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ error: err.message }) });
        allToolResults.push(toolResult);
      }
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS_ANTHROPIC as any,
      messages: messages as any,
    });
  }

  const textBlocks = response.content.filter((b: any) => b.type === 'text');
  const assistantMessage = textBlocks.map((b: any) => b.text).join('\n');

  return { assistantMessage, toolCalls, allToolResults, eventsAffected, tasksAffected };
}

// ============================================================
// Provider: OpenAI (ChatGPT)
// ============================================================
async function callOpenAI(
  messages: Array<{ role: string; content: any }>,
  systemPrompt: string,
  supabaseUser: any,
  userId: string,
  calendarId?: string,
  userLocation?: { latitude: number; longitude: number } | null
) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY non configurée');

  const eventsAffected: string[] = [];
  const tasksAffected: string[] = [];
  const toolCalls: any[] = [];
  const allToolResults: any[] = [];

  const openaiMessages: any[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) })),
  ];

  let response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: openaiMessages,
      tools: toOpenAITools(),
    }),
  });

  let data = await response.json();
  if (!response.ok) {
    console.error('OpenAI API error:', JSON.stringify(data));
    throw new Error(`OpenAI API error ${response.status}: ${data?.error?.message || JSON.stringify(data)}`);
  }

  while (data.choices?.[0]?.finish_reason === 'tool_calls') {
    const assistantMsg = data.choices[0].message;
    openaiMessages.push(assistantMsg);

    for (const tc of assistantMsg.tool_calls || []) {
      const fnName = tc.function.name;
      const fnArgs = JSON.parse(tc.function.arguments);
      toolCalls.push({ id: tc.id, name: fnName, input: fnArgs });

      try {
        const { result, eventId, taskId } = await executeTool(fnName, fnArgs, supabaseUser, userId, calendarId, userLocation);
        if (eventId) eventsAffected.push(eventId);
        if (taskId) tasksAffected.push(taskId);
        openaiMessages.push({ role: 'tool', tool_call_id: tc.id, content: result });
        allToolResults.push({ tool_use_id: tc.id, content: result });
      } catch (err: any) {
        openaiMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: err.message }) });
        allToolResults.push({ tool_use_id: tc.id, content: JSON.stringify({ error: err.message }), is_error: true });
      }
    }

    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1024,
        messages: openaiMessages,
        tools: toOpenAITools(),
      }),
    });
    data = await response.json();
  }

  const assistantMessage = data.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu répondre.';
  return { assistantMessage, toolCalls, allToolResults, eventsAffected, tasksAffected };
}

// ============================================================
// Provider: Gemini (Google)
// ============================================================
async function callGemini(
  messages: Array<{ role: string; content: any }>,
  systemPrompt: string,
  supabaseUser: any,
  userId: string,
  calendarId?: string,
  userLocation?: { latitude: number; longitude: number } | null
) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY non configurée');

  const eventsAffected: string[] = [];
  const tasksAffected: string[] = [];
  const toolCalls: any[] = [];
  const allToolResults: any[] = [];

  const geminiContents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
  }));

  const geminiTools = [{
    functionDeclarations: TOOLS_ANTHROPIC.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    })),
  }];

  let response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: geminiContents,
        tools: geminiTools,
      }),
    }
  );

  let data = await response.json();
  if (!response.ok) {
    console.error('Gemini API error:', JSON.stringify(data));
    throw new Error(`Gemini API error ${response.status}: ${data?.error?.message || JSON.stringify(data)}`);
  }
  let candidate = data.candidates?.[0];

  while (candidate?.content?.parts?.some((p: any) => p.functionCall)) {
    const functionCallParts = candidate.content.parts.filter((p: any) => p.functionCall);
    geminiContents.push({ role: 'model', parts: candidate.content.parts });

    const functionResponses: any[] = [];
    for (const part of functionCallParts) {
      const fnCall = part.functionCall;
      toolCalls.push({ id: fnCall.name, name: fnCall.name, input: fnCall.args });

      try {
        const { result, eventId, taskId } = await executeTool(fnCall.name, fnCall.args, supabaseUser, userId, calendarId, userLocation);
        if (eventId) eventsAffected.push(eventId);
        if (taskId) tasksAffected.push(taskId);
        functionResponses.push({ functionResponse: { name: fnCall.name, response: JSON.parse(result) } });
        allToolResults.push({ tool_use_id: fnCall.name, content: result });
      } catch (err: any) {
        functionResponses.push({ functionResponse: { name: fnCall.name, response: { error: err.message } } });
        allToolResults.push({ tool_use_id: fnCall.name, content: JSON.stringify({ error: err.message }), is_error: true });
      }
    }

    geminiContents.push({ role: 'user', parts: functionResponses });

    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: geminiContents,
          tools: geminiTools,
        }),
      }
    );
    data = await response.json();
    if (!response.ok) {
      console.error('Gemini API error (tool loop):', JSON.stringify(data));
      break;
    }
    candidate = data.candidates?.[0];
  }

  const textParts = candidate?.content?.parts?.filter((p: any) => p.text) || [];
  const assistantMessage = textParts.map((p: any) => p.text).join('\n') || 'Désolé, je n\'ai pas pu répondre.';

  return { assistantMessage, toolCalls, allToolResults, eventsAffected, tasksAffected };
}

// ============================================================
// Main handler
// ============================================================
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { conversation_id, user_message, calendar_id, user_location } = await req.json();
    if (!conversation_id || !user_message) {
      return new Response(JSON.stringify({ error: 'Paramètres manquants' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile (timezone + AI provider)
    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('timezone, ai_provider')
      .eq('id', user.id)
      .single();

    // Get calendar name if calendar_id provided
    let calendarName: string | undefined;
    if (calendar_id) {
      const { data: cal } = await supabaseUser
        .from('calendars')
        .select('name')
        .eq('id', calendar_id)
        .single();
      calendarName = cal?.name;
    }

    const timezone = profile?.timezone || 'Europe/Paris';
    const aiProvider = profile?.ai_provider || 'claude';
    const currentDatetime = new Date().toLocaleString('fr-FR', { timeZone: timezone });

    // Fetch pending tasks for context injection
    let pendingTasksSummary: string | undefined;
    try {
      let pendingQuery = supabaseUser
        .from('tasks')
        .select('title, priority, due_date, status, category:task_categories(name)')
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10);

      if (calendar_id) {
        pendingQuery = pendingQuery.eq('calendar_id', calendar_id);
      }

      const { data: pendingTasks } = await pendingQuery;

      if (pendingTasks && pendingTasks.length > 0) {
        pendingTasksSummary = pendingTasks.map((t: any) => {
          const dueStr = t.due_date
            ? ` (echeance: ${new Date(t.due_date).toLocaleDateString('fr-FR')})`
            : '';
          const statusStr = t.status === 'in_progress' ? ' [en cours]' : '';
          const catStr = t.category?.name ? ` [${t.category.name}]` : '';
          return `- [${t.priority}] ${t.title}${catStr}${dueStr}${statusStr}`;
        }).join('\n');
      }
    } catch (e) {
      console.warn('Could not fetch pending tasks for context:', e);
    }

    // Fetch task categories for context injection
    let categoriesSummary: string | undefined;
    try {
      if (calendar_id) {
        const { data: categories } = await supabaseUser
          .from('task_categories')
          .select('name, is_private_by_default')
          .eq('calendar_id', calendar_id)
          .order('position');
        if (categories && categories.length > 0) {
          categoriesSummary = categories.map((c: any) =>
            `- ${c.name}${c.is_private_by_default ? ' (privée par défaut)' : ''}`
          ).join('\n');
        }
      }
    } catch (e) {
      console.warn('Could not fetch categories for context:', e);
    }

    // Fetch habits context (top places + frequent combos)
    let habitsSummary: string | undefined;
    let frequentCombos: string | undefined;
    try {
      if (calendar_id) {
        // Top places by visit_count + avg_rating
        const { data: topPlaces } = await supabaseUser
          .from('places')
          .select('name, avg_rating, visit_count, category')
          .eq('calendar_id', calendar_id)
          .gt('visit_count', 0)
          .order('visit_count', { ascending: false })
          .order('avg_rating', { ascending: false, nullsFirst: false })
          .limit(5);

        if (topPlaces && topPlaces.length > 0) {
          habitsSummary = topPlaces.map((p: any) => {
            const ratingStr = p.avg_rating ? ` (${p.avg_rating}⭐)` : '';
            return `- ${p.name}${ratingStr} — ${p.visit_count} visite(s)`;
          }).join('\n');
        }

        // Frequent combos (persona → place)
        const { data: combos } = await supabaseUser.rpc('get_frequent_combos', {
          p_calendar_id: calendar_id,
          p_limit: 10,
        }).catch(() => ({ data: null }));

        // If RPC doesn't exist yet, fallback to simple query
        if (!combos) {
          const { data: visitLogs } = await supabaseUser
            .from('visit_log')
            .select('place_id, persona_ids')
            .eq('calendar_id', calendar_id)
            .not('place_id', 'is', null)
            .order('visited_at', { ascending: false })
            .limit(50);

          if (visitLogs && visitLogs.length > 0) {
            // Build combos manually from visit logs
            const comboMap = new Map<string, number>();
            const placeNames = new Map<string, string>();
            const personaNames = new Map<string, string>();

            // Fetch place names
            const placeIds = [...new Set(visitLogs.map((v: any) => v.place_id).filter(Boolean))];
            if (placeIds.length > 0) {
              const { data: places } = await supabaseUser
                .from('places')
                .select('id, name')
                .in('id', placeIds);
              (places || []).forEach((p: any) => placeNames.set(p.id, p.name));
            }

            // Fetch persona names
            const allPersonaIds = [...new Set(visitLogs.flatMap((v: any) => v.persona_ids || []))];
            if (allPersonaIds.length > 0) {
              const { data: personas } = await supabaseUser
                .from('personas')
                .select('id, name')
                .in('id', allPersonaIds);
              (personas || []).forEach((p: any) => personaNames.set(p.id, p.name));
            }

            for (const log of visitLogs) {
              for (const pid of (log.persona_ids || [])) {
                const key = `${pid}|${log.place_id}`;
                comboMap.set(key, (comboMap.get(key) || 0) + 1);
              }
            }

            const sortedCombos = [...comboMap.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10);

            if (sortedCombos.length > 0) {
              frequentCombos = sortedCombos.map(([key, count]) => {
                const [pid, placeId] = key.split('|');
                const pName = personaNames.get(pid) || 'Inconnu';
                const placeName = placeNames.get(placeId) || 'Inconnu';
                return `- ${pName} → ${placeName} (${count} visite(s))`;
              }).join('\n');
            }
          }
        } else if (combos.length > 0) {
          frequentCombos = combos.map((c: any) =>
            `- ${c.persona_name} → ${c.place_name} (${c.visits} visite(s))`
          ).join('\n');
        }
      }
    } catch (e) {
      console.warn('Could not fetch habits context:', e);
    }

    const systemPrompt = SYSTEM_PROMPT({
      currentDatetime,
      userTimezone: timezone,
      calendarName,
      pendingTasksSummary,
      categoriesSummary,
      habitsSummary,
      frequentCombos,
      userLocation: user_location,
    });

    // Load conversation history
    const { data: history } = await supabaseUser
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(20);

    // Build messages — merge consecutive same-role messages to avoid API errors
    // (can happen if a previous request failed after saving user msg but before saving assistant response)
    const messages: Array<{ role: string; content: any }> = [];
    if (history) {
      for (const msg of history) {
        const last = messages[messages.length - 1];
        if (last && last.role === msg.role) {
          // Merge consecutive same-role messages
          last.content = last.content + '\n' + msg.content;
        } else {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }
    // Add current user message — merge if last history msg was also user
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'user') {
      lastMsg.content = lastMsg.content + '\n' + user_message;
    } else {
      messages.push({ role: 'user', content: user_message });
    }

    // Ensure first message is from user (required by Anthropic API)
    if (messages.length > 0 && messages[0].role !== 'user') {
      messages.shift();
    }

    // Save user message to DB
    await supabaseUser.from('messages').insert({
      conversation_id,
      user_id: user.id,
      role: 'user',
      content: user_message,
    });

    // Call the selected AI provider
    let result: { assistantMessage: string; toolCalls: any[]; allToolResults: any[]; eventsAffected: string[]; tasksAffected: string[] };

    console.log(`[chat-agent] Calling ${aiProvider} with ${messages.length} messages`);

    switch (aiProvider) {
      case 'openai':
        result = await callOpenAI(messages, systemPrompt, supabaseUser, user.id, calendar_id, user_location);
        break;
      case 'gemini':
        result = await callGemini(messages, systemPrompt, supabaseUser, user.id, calendar_id, user_location);
        break;
      case 'claude':
      default:
        result = await callClaude(messages, systemPrompt, supabaseUser, user.id, calendar_id, user_location);
        break;
    }

    // Save assistant message
    const { data: savedMessage, error: saveError } = await supabaseUser.from('messages').insert({
      conversation_id,
      user_id: user.id,
      role: 'assistant',
      content: result.assistantMessage,
      tool_calls: result.toolCalls.length > 0 ? result.toolCalls : null,
      tool_results: result.allToolResults?.length > 0 ? result.allToolResults : null,
      event_id: result.eventsAffected[0] || null,
    }).select().single();

    if (saveError) {
      console.warn('[chat-agent] Failed to save assistant message:', saveError.message);
    }

    // Update conversation timestamp (ignore errors — missing UPDATE policy is non-critical)
    await supabaseUser
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation_id);

    return new Response(
      JSON.stringify({
        assistant_message: result.assistantMessage,
        tool_calls: result.toolCalls.length > 0 ? result.toolCalls : null,
        tool_results: result.allToolResults?.length > 0 ? result.allToolResults : null,
        events_affected: result.eventsAffected,
        tasks_affected: result.tasksAffected,
        conversation_id,
        message_id: savedMessage?.id || '',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[chat-agent] Edge Function error:', err?.message, err?.status, err?.error);
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur interne', details: err?.status || '' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
