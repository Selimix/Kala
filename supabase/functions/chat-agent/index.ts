import Anthropic from 'npm:@anthropic-ai/sdk@^0.39.0';
import { createClient } from 'npm:@supabase/supabase-js@^2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// System prompt (shared across all providers)
// ============================================================
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

// ============================================================
// Tool definitions (shared format, adapted per provider)
// ============================================================
const TOOLS_ANTHROPIC = [
  {
    name: 'create_event',
    description: "Crée un nouvel événement dans l'agenda de l'utilisateur.",
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
      properties: { event_id: { type: 'string' } },
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
// Tool executor (shared across all providers)
// ============================================================
async function executeTool(
  toolName: string,
  toolInput: any,
  supabaseUser: any,
  userId: string
): Promise<{ result: string; eventId?: string }> {
  switch (toolName) {
    case 'create_event': {
      const { data, error } = await supabaseUser
        .from('events')
        .insert({
          user_id: userId,
          title: toolInput.title,
          description: toolInput.description || null,
          start_time: toolInput.start_time,
          end_time: toolInput.end_time,
          location: toolInput.location || null,
          people: toolInput.people || [],
          category: toolInput.category,
          is_all_day: toolInput.is_all_day || false,
        })
        .select()
        .single();
      if (error) throw error;
      return { result: JSON.stringify({ success: true, event_id: data.id, event: data }), eventId: data.id };
    }
    case 'update_event': {
      const { data, error } = await supabaseUser
        .from('events')
        .update({ ...toolInput.updates, updated_at: new Date().toISOString() })
        .eq('id', toolInput.event_id)
        .select()
        .single();
      if (error) throw error;
      return { result: JSON.stringify({ success: true, event: data }), eventId: data.id };
    }
    case 'delete_event': {
      const { error } = await supabaseUser
        .from('events')
        .delete()
        .eq('id', toolInput.event_id);
      if (error) throw error;
      return { result: JSON.stringify({ success: true, deleted: toolInput.event_id }), eventId: toolInput.event_id };
    }
    case 'list_events': {
      const { data, error } = await supabaseUser
        .from('events')
        .select('*')
        .gte('start_time', toolInput.start_date)
        .lte('start_time', toolInput.end_date)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return { result: JSON.stringify({ events: data || [] }) };
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
  userId: string
) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configurée');

  const anthropic = new Anthropic({ apiKey });
  const eventsAffected: string[] = [];
  const toolCalls: any[] = [];

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
        const { result, eventId } = await executeTool(toolUse.name, toolUse.input, supabaseUser, userId);
        if (eventId) eventsAffected.push(eventId);
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: result });
      } catch (err: any) {
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ error: err.message }) });
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

  return { assistantMessage, toolCalls, eventsAffected };
}

// ============================================================
// Provider: OpenAI (ChatGPT)
// ============================================================
async function callOpenAI(
  messages: Array<{ role: string; content: any }>,
  systemPrompt: string,
  supabaseUser: any,
  userId: string
) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY non configurée');

  const eventsAffected: string[] = [];
  const toolCalls: any[] = [];

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

  while (data.choices?.[0]?.finish_reason === 'tool_calls') {
    const assistantMsg = data.choices[0].message;
    openaiMessages.push(assistantMsg);

    for (const tc of assistantMsg.tool_calls || []) {
      const fnName = tc.function.name;
      const fnArgs = JSON.parse(tc.function.arguments);
      toolCalls.push({ id: tc.id, name: fnName, input: fnArgs });

      try {
        const { result, eventId } = await executeTool(fnName, fnArgs, supabaseUser, userId);
        if (eventId) eventsAffected.push(eventId);
        openaiMessages.push({ role: 'tool', tool_call_id: tc.id, content: result });
      } catch (err: any) {
        openaiMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: err.message }) });
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
  return { assistantMessage, toolCalls, eventsAffected };
}

// ============================================================
// Provider: Gemini (Google)
// ============================================================
async function callGemini(
  messages: Array<{ role: string; content: any }>,
  systemPrompt: string,
  supabaseUser: any,
  userId: string
) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY non configurée');

  const eventsAffected: string[] = [];
  const toolCalls: any[] = [];

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
  let candidate = data.candidates?.[0];

  while (candidate?.content?.parts?.some((p: any) => p.functionCall)) {
    const functionCallParts = candidate.content.parts.filter((p: any) => p.functionCall);
    geminiContents.push({ role: 'model', parts: candidate.content.parts });

    const functionResponses: any[] = [];
    for (const part of functionCallParts) {
      const fnCall = part.functionCall;
      toolCalls.push({ id: fnCall.name, name: fnCall.name, input: fnCall.args });

      try {
        const { result, eventId } = await executeTool(fnCall.name, fnCall.args, supabaseUser, userId);
        if (eventId) eventsAffected.push(eventId);
        functionResponses.push({ functionResponse: { name: fnCall.name, response: JSON.parse(result) } });
      } catch (err: any) {
        functionResponses.push({ functionResponse: { name: fnCall.name, response: { error: err.message } } });
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
    candidate = data.candidates?.[0];
  }

  const textParts = candidate?.content?.parts?.filter((p: any) => p.text) || [];
  const assistantMessage = textParts.map((p: any) => p.text).join('\n') || 'Désolé, je n\'ai pas pu répondre.';

  return { assistantMessage, toolCalls, eventsAffected };
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

    const { conversation_id, user_message } = await req.json();
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

    const timezone = profile?.timezone || 'Europe/Paris';
    const aiProvider = profile?.ai_provider || 'claude';
    const currentDatetime = new Date().toLocaleString('fr-FR', { timeZone: timezone });
    const systemPrompt = SYSTEM_PROMPT(currentDatetime, timezone);

    // Load conversation history
    const { data: history } = await supabaseUser
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(20);

    // Save user message
    await supabaseUser.from('messages').insert({
      conversation_id,
      user_id: user.id,
      role: 'user',
      content: user_message,
    });

    // Build messages
    const messages: Array<{ role: string; content: any }> = [];
    if (history) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: 'user', content: user_message });

    // Call the selected AI provider
    let result: { assistantMessage: string; toolCalls: any[]; eventsAffected: string[] };

    switch (aiProvider) {
      case 'openai':
        result = await callOpenAI(messages, systemPrompt, supabaseUser, user.id);
        break;
      case 'gemini':
        result = await callGemini(messages, systemPrompt, supabaseUser, user.id);
        break;
      case 'claude':
      default:
        result = await callClaude(messages, systemPrompt, supabaseUser, user.id);
        break;
    }

    // Save assistant message
    const { data: savedMessage } = await supabaseUser.from('messages').insert({
      conversation_id,
      user_id: user.id,
      role: 'assistant',
      content: result.assistantMessage,
      tool_calls: result.toolCalls.length > 0 ? result.toolCalls : null,
      event_id: result.eventsAffected[0] || null,
    }).select().single();

    // Update conversation timestamp
    await supabaseUser
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation_id);

    return new Response(
      JSON.stringify({
        assistant_message: result.assistantMessage,
        tool_calls: result.toolCalls.length > 0 ? result.toolCalls : null,
        events_affected: result.eventsAffected,
        conversation_id,
        message_id: savedMessage?.id || '',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Edge Function error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
