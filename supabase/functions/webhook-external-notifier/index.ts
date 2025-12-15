// supabase/functions/webhook-external-notifier/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { timingSafeEqual } from 'https://deno.land/std@0.168.0/crypto/timing_safe_equal.ts';

const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!;
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // 1. Validar headers
    const signature = req.headers.get('x-signature');
    const timestamp = req.headers.get('x-timestamp');
    const eventId = req.headers.get('x-event-id');

    if (!signature || !timestamp || !eventId) {
      return new Response('Missing security headers', { status: 400 });
    }

    // 2. Validar firma
    const body = await req.text();
    const expectedSignature = await generateSignature(body, WEBHOOK_SECRET);
    
    if (!timingSafeCompare(signature, expectedSignature)) {
      return new Response('Invalid signature', { status: 403 });
    }

    console.log('✅ Firma validada');

    // 3. Validar timestamp
    const eventTime = new Date(timestamp);
    const now = new Date();
    const diffMinutes = (now.getTime() - eventTime.getTime()) / 1000 / 60;

    if (diffMinutes > 5) {
      return new Response('Timestamp too old', { status: 400 });
    }

    // 4. Verificar idempotencia
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: existing } = await supabase
      .from('processed_webhooks')
      .select('event_id')
      .eq('event_id', eventId)
      .eq('processor', 'webhook-external-notifier')
      .maybeSingle();

    if (existing) {
      console.log('⚠️ Ya notificado:', eventId);
      return new Response(
        JSON.stringify({ status: 'already_notified' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Parsear evento
    const event = JSON.parse(body);

    // 6. Construir mensaje
    let message = '';
    
    if (event.event_type === 'adoption.completed') {
      message = `
🎉 *Nueva Adopción Completada*

🐾 Animal ID: \`${event.payload.animal_id}\`
👤 Adoptante: *${event.payload.adopter_name}*
📅 Fecha: ${new Date(event.payload.adopted_at).toLocaleString('es-ES')}
🆔 Adopción ID: \`${event.payload.adoption_id}\`
      `.trim();
    } else if (event.event_type === 'animal.created') {
      message = `
🆕 *Nuevo Animal Registrado*

📛 Nombre: *${event.payload.name}*
🦴 Especie: ${event.payload.species}
🆔 Animal ID: \`${event.payload.animal_id}\`
📅 Fecha: ${new Date(event.payload.created_at).toLocaleString('es-ES')}
      `.trim();
    }

    // 7. Enviar a Telegram
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    if (!telegramResponse.ok) {
      const error = await telegramResponse.text();
      console.error('Error enviando a Telegram:', error);
      throw new Error('Failed to send Telegram notification');
    }

    console.log('✅ Notificación enviada a Telegram');

    // 8. Marcar como procesado
    await supabase.from('processed_webhooks').insert({
      event_id: eventId,
      processor: 'webhook-external-notifier',
    });

    // 9. Retornar éxito
    return new Response(
      JSON.stringify({
        status: 'notified',
        event_id: eventId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    
    // Retornar 500 para que el publisher reintente
    return new Response(
      JSON.stringify({ error: error.message }),
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