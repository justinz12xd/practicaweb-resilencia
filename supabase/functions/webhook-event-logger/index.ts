import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // 1. Leer headers de seguridad
    const signature = req.headers.get('x-signature');
    const timestamp = req.headers.get('x-timestamp');
    const eventId = req.headers.get('x-event-id');

    if (!signature || !timestamp || !eventId) {
      return new Response('Missing security headers', { status: 400 });
    }

    // 2. Leer body
    const body = await req.text();

    // 3. Validar firma HMAC-SHA256
    const expectedSignature = await generateSignature(body, WEBHOOK_SECRET);
    
    if (!timingSafeCompare(signature, expectedSignature)) {
      console.error('Invalid signature');
      return new Response('Invalid signature', { status: 403 });
    }

    console.log('✅ Firma validada correctamente');

    // 4. Validar timestamp (máximo 5 minutos de antigüedad)
    const eventTime = new Date(timestamp);
    const now = new Date();
    const diffMinutes = (now.getTime() - eventTime.getTime()) / 1000 / 60;

    if (diffMinutes > 5) {
      console.error('Timestamp too old:', diffMinutes, 'minutes');
      return new Response('Timestamp too old', { status: 400 });
    }

    console.log('✅ Timestamp validado');

    // 5. Crear cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 6. Verificar idempotencia
    const { data: existing } = await supabase
      .from('processed_webhooks')
      .select('event_id')
      .eq('event_id', eventId)
      .eq('processor', 'webhook-event-logger')
      .maybeSingle();

    if (existing) {
      console.log('⚠️ Evento ya procesado:', eventId);
      return new Response(
        JSON.stringify({ 
          status: 'already_processed',
          event_id: eventId 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Evento nuevo, procesando...');

    // 7. Parsear evento
    const event = JSON.parse(body);

    // 8. Guardar evento en webhook_events
    const { error: eventError } = await supabase
      .from('webhook_events')
      .insert({
        event_id: eventId,
        event_type: event.event_type,
        payload: event.payload,
      });

    if (eventError) {
      console.error('Error guardando evento:', eventError);
      throw eventError;
    }

    console.log('✅ Evento guardado');

    // 9. Marcar como procesado
    const { error: processedError } = await supabase
      .from('processed_webhooks')
      .insert({
        event_id: eventId,
        processor: 'webhook-event-logger',
      });

    if (processedError) {
      console.error('Error marcando como procesado:', processedError);
      throw processedError;
    }

    console.log('✅ Marcado como procesado');

    // 10. Retornar éxito
    return new Response(
      JSON.stringify({
        status: 'processed',
        event_id: eventId,
        event_type: event.event_type,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  const aBuffer = new TextEncoder().encode(a);
  const bBuffer = new TextEncoder().encode(b);
  
  return timingSafeEqual(aBuffer, bBuffer);
}