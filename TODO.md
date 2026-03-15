# Kāla — TODO

## 🔴 CRITIQUE — À faire en priorité

### Détection de conflits d'agenda
- [ ] Avant de créer un événement, vérifier les conflits avec les événements existants
- [ ] Si conflit détecté → afficher via `present_options` : "Conflit avec [événement] à [heure]. Décaler / Remplacer / Créer quand même ?"
- [ ] Ajouter un outil `check_conflicts` dans l'Edge Function qui vérifie les chevauchements
- [ ] L'IA DOIT appeler `check_conflicts` AVANT `create_event`

### Contacts natifs (en cours)
- [ ] Intégrer `ContactLookupCard` dans `MessageBubble` (composant créé, pas encore branché)
- [ ] Quand l'IA dit "pas de numéro" → bouton "Chercher dans mes contacts"
- [ ] Résultat envoyé automatiquement à l'IA
- [ ] Rebuild iOS nécessaire (expo-contacts = module natif)

### Suggestion Chips / present_options
- [ ] Vérifier que l'IA OpenAI utilise bien le tool `present_options` (peut nécessiter ajustement du prompt)
- [ ] Tester avec Claude comme provider (devrait mieux respecter les tools)
- [ ] Ajouter feedback visuel quand un chip est sélectionné (animation)

## 🟡 IMPORTANT

### Géolocalisation
- [ ] Vérifier pourquoi la permission géoloc ne semble pas se déclencher sur device
- [ ] Tester sur un vrai build (pas Expo Go) — expo-location peut nécessiter un dev build
- [ ] Ajouter un indicateur visuel quand la position GPS est active

### Reconnaissance vocale (bouton micro)
- [ ] Intégrer `expo-speech` ou un service STT (Speech-to-Text)
- [ ] Le bouton micro est actuellement un placeholder (ne fait rien)
- [ ] Options : Whisper API, expo-av recording + transcription server-side, ou React Native Voice

### Notifications (Phase 5)
- [ ] Rappels avant événements (15 min, 1h, etc.)
- [ ] Push notifications via expo-notifications
- [ ] Rappels de tâches en retard
- [ ] Morning check-in / Evening check-in

### UX / Polish (Phase 6)
- [ ] Markdown rendering dans les messages assistant (gras, italique, listes)
- [ ] Animation de typing indicator améliorée
- [ ] Pull-to-refresh dans l'historique des conversations
- [ ] Swipe-to-delete sur les conversations
- [ ] Dark mode

## 🟢 NICE TO HAVE

### Calendrier
- [ ] Sync bidirectionnelle avec le calendrier natif iOS/Android
- [ ] Vue semaine dans l'onglet calendrier
- [ ] Événements récurrents (hebdo, mensuel)
- [ ] Rappels multiples par événement

### Chat
- [ ] Réponses en streaming (SSE) pour affichage progressif
- [ ] Réactions sur les messages (👍, ❤️, etc.)
- [ ] Partage de messages/événements
- [ ] Recherche dans l'historique des conversations

### Tâches
- [ ] Drag & drop pour réordonner les tâches
- [ ] Sous-tâches
- [ ] Tags / labels colorés
- [ ] Vue Kanban

### Multi-provider IA
- [ ] Tester et optimiser le prompt pour OpenAI (actuellement configuré)
- [ ] Tester et optimiser pour Gemini
- [ ] Permettre de changer de provider dans les réglages (déjà partiellement fait)

### Sécurité
- [ ] Re-activer JWT verification sur l'Edge Function (actuellement --no-verify-jwt)
- [ ] Investiguer pourquoi le JWT expire / est invalide sur device
- [ ] Rate limiting sur l'Edge Function
- [ ] Audit des permissions RLS

## 🔧 BUGS CONNUS

- [ ] JWT "Invalid JWT" sur device → contourné avec --no-verify-jwt, à investiguer
- [ ] L'IA OpenAI n'utilise pas toujours `present_options` malgré le prompt
- [ ] Les messages user orphelins (sans réponse assistant) peuvent s'accumuler si erreur
- [ ] Le bouton micro ne fait rien
- [ ] Rebuild EAS nécessaire pour les modules natifs (expo-contacts, expo-location, expo-local-authentication)
