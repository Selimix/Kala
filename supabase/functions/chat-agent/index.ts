import Anthropic from 'npm:@anthropic-ai/sdk@^0.39.0';
import { createClient } from 'npm:@supabase/supabase-js@^2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = (currentDatetime: string, userTimezone: string) => `Tu es Kala, un assistant intelligent de gestion d'agenda. Tu parles en français.

Ton rôle:
- Aider l'utilisateur à gérer son agenda de manière naturelle et conversationnelle
- Interpréter les demandes en langage naturel pour créer, modifier ou supprimer des événements
- Reformuler les événements de manière claire dans ta réponse
- Donner des récapitulatifs quand on te le demande

Règles:
- Réponds toujours en français
- Quand l'utilisateur mentionne un événement, utilise l'outil create_event
- Si des informations manquent (date, heure), pose des questions avant de créer l'événement
- Pour les heures non précisées, propose un horaire raisonnable
- La durée par défaut d'un événement est 1 heure
- Choisis la catégorie la plus appropriée en fonction du contexte
- Sois concis et chaleureux dans tes réponses
- Utilise le format 24h pour les heures (standard français)
- Quand tu crées un événement, confirme avec un résumé clair

Contexte temporel:
- Date et heure actuelles: ${currentDatetime}
- Fuseau horaire de l'utilisateur: ${userTimezone}`;

const TOOLS = [
  {
    name: 'create_event',
    description:
      "Crée un nouvel événement dans l'agenda de l'utilisateur.",
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: "Titre court et descriptif" },
        description: { type: 'string', description: "Description optionnelle" },
        start_time: { type: 'string', description: "Date/heure début ISO 8601" },
        end_time: { type: 'string', description: "Date/heure fin ISO 8601" },
        location: { type: 'string', description: "Lieu si mentionné" },
        people: { type: 'array', items: { type: 'string' }, description: "Personnes impliquées" },
        category: {
          type: 'string',
          enum: ['travail', 'personnel', 'sante', 'social', 'sport', 'administratif', 'autre'],
        },
        is_all_day: { type: 'boolean' },
      },
      required: ['title', 'start_time', 'end_time', 'category'],
    },
  },
  {
    name: 'update_event',
    description: "Modifie un événement existant.",
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string' },
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
        event_id: { type: 'string' },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'list_events',
    description: "Récupère les événements sur une période donnée.",
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: "Date début ISO 8601" },
        end_date: { type: 'string', description: "Date fin ISO 8601" },
      },
      required: ['start_date', 'end_date'],
    },
  },
];

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Auth: get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

    // Client with user's JWT for RLS
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse request
    const { conversation_id, user_message } = await req.json();
    if (!conversation_id || !user_message) {
      return new Response(JSON.stringify({ error: 'Paramètres manquants' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Get user profile for timezone
    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .single();

    const timezone = profile?.timezone || 'Europe/Paris';
    const currentDatetime = new Date().toLocaleString('fr-FR', { timeZone: timezone });

    // 4. Load conversation history (last 20 messages)
    const { data: history } = await supabaseUser
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(20);

    // 5. Save user message
    await supabaseUser.from('messages').insert({
      conversation_id,
      user_id: user.id,
      role: 'user',
      content: user_message,
    });

    // 6. Build Claude messages
    const claudeMessages: Array<{ role: string; content: any }> = [];

    if (history) {
      for (const msg of history) {
        claudeMessages.push({ role: msg.role, content: msg.content });
      }
    }
    claudeMessages.push({ role: 'user', content: user_message });

    // 7. Call Claude API with tool loop
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT(currentDatetime, timezone),
      tools: TOOLS as any,
      messages: claudeMessages as any,
    });

    const eventsAffected: string[] = [];
    let toolCalls: any[] = [];

    // Tool execution loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block: any) => block.type === 'tool_use'
      );

      const toolResults: any[] = [];

      for (const toolUse of toolUseBlocks) {
        toolCalls.push({
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input,
        });

        let result: string;

        try {
          switch (toolUse.name) {
            case 'create_event': {
              const input = toolUse.input as any;
              const { data, error } = await supabaseUser
                .from('events')
                .insert({
                  user_id: user.id,
                  title: input.title,
                  description: input.description || null,
                  start_time: input.start_time,
                  end_time: input.end_time,
                  location: input.location || null,
                  people: input.people || [],
                  category: input.category,
                  is_all_day: input.is_all_day || false,
                })
                .select()
                .single();

              if (error) throw error;
              eventsAffected.push(data.id);
              result = JSON.stringify({ success: true, event_id: data.id, event: data });
              break;
            }

            case 'update_event': {
              const input = toolUse.input as any;
              const { data, error } = await supabaseUser
                .from('events')
                .update({ ...input.updates, updated_at: new Date().toISOString() })
                .eq('id', input.event_id)
                .select()
                .single();

              if (error) throw error;
              eventsAffected.push(data.id);
              result = JSON.stringify({ success: true, event: data });
              break;
            }

            case 'delete_event': {
              const input = toolUse.input as any;
              const { error } = await supabaseUser
                .from('events')
                .delete()
                .eq('id', input.event_id);

              if (error) throw error;
              eventsAffected.push(input.event_id);
              result = JSON.stringify({ success: true, deleted: input.event_id });
              break;
            }

            case 'list_events': {
              const input = toolUse.input as any;
              const { data, error } = await supabaseUser
                .from('events')
                .select('*')
                .gte('start_time', input.start_date)
                .lte('start_time', input.end_date)
                .order('start_time', { ascending: true });

              if (error) throw error;
              result = JSON.stringify({ events: data || [] });
              break;
            }

            default:
              result = JSON.stringify({ error: 'Outil inconnu' });
          }
        } catch (err: any) {
          result = JSON.stringify({ error: err.message });
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Continue conversation with tool results
      claudeMessages.push({ role: 'assistant', content: response.content });
      claudeMessages.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT(currentDatetime, timezone),
        tools: TOOLS as any,
        messages: claudeMessages as any,
      });
    }

    // 8. Extract final text response
    const textBlocks = response.content.filter(
      (block: any) => block.type === 'text'
    );
    const assistantMessage = textBlocks.map((b: any) => b.text).join('\n');

    // 9. Save assistant message
    const { data: savedMessage } = await supabaseUser.from('messages').insert({
      conversation_id,
      user_id: user.id,
      role: 'assistant',
      content: assistantMessage,
      tool_calls: toolCalls.length > 0 ? toolCalls : null,
      event_id: eventsAffected[0] || null,
    }).select().single();

    // 10. Update conversation timestamp
    await supabaseUser
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation_id);

    // 11. Return response
    return new Response(
      JSON.stringify({
        assistant_message: assistantMessage,
        tool_calls: toolCalls.length > 0 ? toolCalls : null,
        events_affected: eventsAffected,
        conversation_id,
        message_id: savedMessage?.id || '',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Edge Function error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur interne' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
