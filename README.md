# Kāla काल AI

> Assistant intelligent d'agenda — planifie, organise et gere ton temps par la voix et le chat.

![React Native](https://img.shields.io/badge/React_Native-0.83-blue)
![Expo](https://img.shields.io/badge/Expo_SDK-55-black)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)

## Fonctionnalites

- **Chat IA conversationnel** — Parle a l'assistant pour creer, modifier ou supprimer des evenements et des taches
- **Multi-provider IA** — Claude (Anthropic), OpenAI (GPT), Gemini (Google) au choix dans les reglages
- **Calendrier partage** — Cree un calendrier, invite des proches via code d'invitation (KAL-XXXX)
- **Gestion de taches** — Taches avec priorite (low/medium/high/urgent), echeances et statuts
- **Assistant proactif** — L'IA mentionne les taches en attente et envoie des rappels d'echeance
- **Sync calendrier natif** — Synchronisation avec le calendrier iOS/Android via expo-calendar
- **Notifications intelligentes** — Check-ins matin/soir personnalises + rappels de taches
- **100% francais** — Interface et assistant entierement en francais

## Stack technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React Native (Expo SDK 55) + TypeScript strict |
| **Navigation** | Expo Router (file-based, typed routes) |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions, Realtime) |
| **IA** | Claude API avec tool_use (+ OpenAI, Gemini) |
| **Notifications** | expo-notifications (local push) |
| **Calendrier** | react-native-calendars + expo-calendar |
| **Stockage securise** | expo-secure-store (mobile) / localStorage (web) |

## Architecture

```
Application Mobile (Expo)
       |
       v
Supabase Edge Function (chat-agent)
       |
       v
Claude / OpenAI / Gemini API (tool_use)
       |
       v
Supabase PostgreSQL (events, tasks, conversations, messages)
       |
       v
Supabase Realtime --> Calendrier + Taches mis a jour en temps reel
```

## Structure du projet

```
src/
├── app/                    # Routes Expo Router
│   ├── (auth)/            # Login, Register
│   ├── (onboarding)/      # Bienvenue, Creer/Rejoindre calendrier
│   ├── (tabs)/            # Chat, Calendrier, Reglages
│   └── *.tsx              # Modals (calendar-settings, create/join)
├── components/
│   ├── calendar/          # CalendarView, EventCard
│   ├── chat/              # MessageBubble, ChatInput, TaskConfirmationCard
│   └── ui/                # CalendarSelector, MicButton
├── constants/             # Couleurs, strings FR, activity types
├── hooks/                 # useAuth, useChat, useEvents, useCalendar, useNotifications
├── lib/                   # claude-tools.ts (definitions d'outils IA)
├── services/              # supabase, auth, events, tasks, calendars, agent, places, personas
├── types/                 # TypeScript interfaces
└── utils/                 # Date helpers, notifications

supabase/
├── functions/
│   └── chat-agent/        # Edge Function: proxy IA + execution d'outils
└── migrations/            # 001-006: schema, calendriers partages, taches, RLS
```

## Installation

### Prerequis

- Node.js 18+
- Compte [Supabase](https://supabase.com)
- Cle API [Anthropic](https://console.anthropic.com) (et/ou OpenAI, Gemini)

### Setup local

```bash
# 1. Cloner le repo
git clone https://github.com/Selimix/Kala.git
cd Kala

# 2. Installer les dependances
npm install --legacy-peer-deps

# 3. Configurer l'environnement
cp .env.example .env
# Remplir EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### Setup Supabase

```bash
# 1. Lier au projet
npx supabase link --project-ref <votre-project-ref>

# 2. Deployer les migrations (001-006)
npx supabase db push

# 3. Configurer les secrets (cles API IA)
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase secrets set OPENAI_API_KEY=sk-...        # optionnel
npx supabase secrets set GEMINI_API_KEY=...            # optionnel

# 4. Deployer l'Edge Function
npx supabase functions deploy chat-agent --no-verify-jwt
```

### Lancer l'app

```bash
# Web
npm run web

# iOS (necessite Xcode)
npm run ios

# Android (necessite Android Studio)
npm run android
```

## Base de donnees

### Tables principales

| Table | Description |
|-------|-------------|
| `profiles` | Profils utilisateurs (timezone, preferences notifications, provider IA) |
| `calendars` | Calendriers partages (nom, emoji, couleur) |
| `calendar_members` | Membres d'un calendrier (owner / editor / viewer) |
| `events` | Evenements avec type d'activite, lieu, participants |
| `tasks` | Taches avec priorite, statut, echeance |
| `conversations` | Historique des conversations IA |
| `messages` | Messages individuels avec tool_calls en JSONB |
| `places` | Lieux enregistres |
| `personas` | Contacts/personnes |
| `invite_codes` | Codes d'invitation (KAL-XXXX) |

### Securite (RLS)

Toutes les tables sont protegees par Row Level Security. Les politiques utilisent des fonctions `SECURITY DEFINER` :
- `is_member_of_calendar(calendar_id)` — Verifie l'appartenance
- `is_owner_or_editor(calendar_id)` — Verifie les droits d'edition
- `is_owner_of_calendar(calendar_id)` — Verifie le role proprietaire

## Agent IA

L'Edge Function `chat-agent` est le coeur de l'assistant :

1. **Recoit** un message utilisateur
2. **Enrichit** le contexte (evenements du jour, taches en attente)
3. **Appelle** l'API IA (Claude/OpenAI/Gemini selon les preferences utilisateur)
4. **Execute** les tool calls en boucle (creation d'evenements, taches, etc.)
5. **Retourne** la reponse + metadata (events/tasks affectes)

### Outils disponibles

| Outil | Description |
|-------|-------------|
| `create_event` | Creer un evenement (avec lieu, participants, recurrence) |
| `update_event` | Modifier un evenement existant |
| `delete_event` | Supprimer un evenement |
| `list_events` | Lister les evenements d'une periode |
| `create_task` | Creer une tache (titre, priorite, echeance) |
| `update_task` | Modifier une tache |
| `complete_task` | Marquer une tache comme terminee |
| `list_tasks` | Lister les taches filtrees par statut/priorite |

## Exemples d'utilisation

- *"J'ai rendez-vous chez le dentiste mardi a 14h30"*
- *"Reunion d'equipe demain matin de 9h a 10h30"*
- *"Cree une tache urgente : preparer la presentation pour lundi"*
- *"Qu'est-ce que j'ai de prevu cette semaine ?"*
- *"Annule le rendez-vous de jeudi"*
- *"Quelles sont mes taches en attente ?"*

## Variables d'environnement

| Variable | Emplacement | Description |
|----------|-------------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` | URL du projet Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` | Cle publique Supabase |
| `ANTHROPIC_API_KEY` | Supabase Secrets | Cle API Claude |
| `OPENAI_API_KEY` | Supabase Secrets | Cle API OpenAI (optionnel) |
| `GEMINI_API_KEY` | Supabase Secrets | Cle API Gemini (optionnel) |

Les cles API IA sont stockees uniquement dans les secrets Supabase (jamais dans le client).

## Compte test

| | |
|---|---|
| **Email** | kalatest123@gmail.com |
| **Password** | TestKala2024 |
| **Calendrier** | Calendrier Test (owner) |

## Licence

Projet prive.
