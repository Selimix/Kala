import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { fsq_id } = await req.json();
    if (!fsq_id) {
      return new Response(
        JSON.stringify({ error: 'fsq_id manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fsqApiKey = Deno.env.get('FOURSQUARE_API_KEY');
    if (!fsqApiKey) {
      return new Response(
        JSON.stringify({ error: 'FOURSQUARE_API_KEY non configurée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try the new places-api endpoint first (matches our search endpoint)
    const detailUrl = `https://places-api.foursquare.com/places/${fsq_id}`;
    console.log('[FSQ Details] Fetching:', detailUrl);

    const fsqResponse = await fetch(detailUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${fsqApiKey}`,
        'X-Places-Api-Version': '2025-02-05',
      },
    });

    console.log('[FSQ Details] Status:', fsqResponse.status);

    if (fsqResponse.ok) {
      const data = await fsqResponse.json();
      console.log('[FSQ Details] Keys:', Object.keys(data).join(', '));
      const result = mapFoursquareDetails(data);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If new API fails, try legacy v3 endpoint
    const errBody = await fsqResponse.text();
    console.warn('[FSQ Details] New API error:', errBody);

    const v3Url = `https://api.foursquare.com/v3/places/${fsq_id}`;
    console.log('[FSQ Details] Trying v3:', v3Url);

    const v3Response = await fetch(v3Url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': fsqApiKey,
      },
    });

    if (v3Response.ok) {
      const v3Data = await v3Response.json();
      const result = mapFoursquareDetails(v3Data);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const v3Err = await v3Response.text();
    console.warn('[FSQ Details] v3 error:', v3Err);
    return new Response(
      JSON.stringify({ error: 'Impossible de récupérer les détails' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[restaurant-details] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function mapFoursquareDetails(fp: any) {
  // Build photo URLs - handle both old and new format
  const rawPhotos = fp.photos || [];
  const photos = rawPhotos.slice(0, 8).map((p: any) => {
    if (p.prefix && p.suffix) {
      return {
        url: `${p.prefix}600x400${p.suffix}`,
        thumb: `${p.prefix}200x200${p.suffix}`,
      };
    }
    // New API might have different photo format
    return { url: p.url || p.href || '', thumb: p.url || p.href || '' };
  }).filter((p: any) => p.url);

  // Extract hours
  const hours = fp.hours ? {
    display: fp.hours.display || null,
    open_now: fp.hours.open_now ?? false,
    regular: (fp.hours.regular || []).map((h: any) => ({
      day: h.day,
      open: h.open,
      close: h.close,
    })),
  } : null;

  // Extract tips/reviews (max 10)
  const rawTips = fp.tips || [];
  const tips = rawTips.slice(0, 10).map((t: any) => ({
    text: t.text,
    created_at: t.created_at || t.createdAt || '',
  }));

  // Extract category name
  const category = fp.categories?.[0]?.name || null;

  // Tastes
  const tastes = fp.tastes || [];

  // Stats
  const stats = fp.stats || null;

  return {
    fsq_id: fp.fsq_place_id || fp.fsq_id || fp.id || null,
    name: fp.name || 'Inconnu',
    address: fp.location?.formatted_address || fp.location?.address || null,
    description: fp.description || null,
    tel: fp.tel || null,
    website: fp.website || null,
    category,
    fsq_rating: fp.rating ? Math.round(fp.rating / 2 * 10) / 10 : null,
    fsq_price: fp.price || null,
    photos,
    hours,
    tips,
    tastes,
    stats,
    social_media: fp.social_media || null,
  };
}
