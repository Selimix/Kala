# Kala

**L'agent intelligent qui organise votre temps.**

Kala est un systeme d'agenda intelligent assiste par un agent conversationnel. Gerez votre temps naturellement — parlez ou ecrivez ce que vous faites, et Kala s'occupe du reste.

## Fonctionnalites

- **Agent conversationnel** : decrivez vos evenements en langage naturel, Kala les interprete et les ajoute a votre agenda
- **Calendrier** : vue mensuelle avec code couleur par categorie
- **Synchronisation temps reel** : les evenements apparaissent instantanement dans le calendrier
- **Categories intelligentes** : travail, personnel, sante, social, sport, administratif
- **Verification quotidienne** : rappels matin et soir pour garder un agenda fidele a la realite

## Stack technique

| Composant | Technologie |
|-----------|------------|
| Mobile | React Native (Expo SDK 55) + TypeScript |
| Navigation | Expo Router (file-based) |
| Backend | Supabase (PostgreSQL, Auth, Realtime) |
| IA | Claude API (Anthropic) avec tool_use |
| Edge Functions | Supabase Edge Functions (Deno) |

## Installation

```bash
# Cloner le repo
git clone https://github.com/Selimix/Kala.git
cd Kala

# Installer les dependances
npm install --legacy-peer-deps

# Configurer les variables d'environnement
cp .env.example .env
# Remplir EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY
```

## Configuration Supabase

1. Creer un projet sur [supabase.com](https://supabase.com)
2. Executer la migration `supabase/migrations/001_initial_schema.sql` dans l'editeur SQL
3. Deployer l'Edge Function `chat-agent` :
   ```bash
   supabase functions deploy chat-agent
   ```
4. Ajouter le secret :
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
5. Copier l'URL et la cle anon dans `.env`

## Lancement

```bash
npx expo start
```

Scanner le QR code avec Expo Go (iOS/Android) ou lancer sur simulateur.

## Structure du projet

```
src/
  app/                    # Routes Expo Router
    (auth)/               #   Login, Register
    (tabs)/               #   Chat, Calendrier, Reglages
  components/
    chat/                 # MessageBubble, ChatInput, EventConfirmationCard
    calendar/             # CalendarView, EventCard
  hooks/                  # useAuth, useChat, useEvents (realtime)
  services/               # Supabase client, auth, events CRUD, agent
  lib/                    # Definitions d'outils Claude
  constants/              # Couleurs, strings FR, categories
  types/                  # Types TypeScript (events, chat)
supabase/
  migrations/             # Schema SQL (profiles, events, conversations, messages)
  functions/chat-agent/   # Edge Function — proxy Claude API + execution d'outils
```

## Architecture

```
Application Mobile (Expo)
       |
       v
Supabase Edge Function (chat-agent)
       |
       v
Claude API (tool_use)
       |
       v
Supabase PostgreSQL (events, conversations, messages)
       |
       v
Supabase Realtime --> Calendrier mis a jour en temps reel
```

L'agent Claude dispose de 4 outils : `create_event`, `update_event`, `delete_event`, `list_events`. La cle API Anthropic reste exclusivement cote serveur.

## Exemples d'utilisation

- *"J'ai rendez-vous chez le dentiste mardi a 14h30"*
- *"Reunion d'equipe demain matin de 9h a 10h30"*
- *"Qu'est-ce que j'ai de prevu cette semaine ?"*
- *"Annule le rendez-vous de jeudi"*
- *"Diner avec Marie samedi soir au restaurant"*
