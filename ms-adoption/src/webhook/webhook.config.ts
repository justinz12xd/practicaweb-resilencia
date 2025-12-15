/**
 * Configuración de Webhooks
 * 
 * IMPORTANTE: Este secret DEBE ser el mismo que configuraste en Supabase
 * con: supabase secrets set WEBHOOK_SECRET=mi-super-secreto-compartido-12345
 */
export const WEBHOOK_CONFIG = {
  // Secret compartido para firmar webhooks con HMAC-SHA256
  SECRET: process.env.WEBHOOK_SECRET || 'mi-super-secreto-compartido-12345',
  
  // Número máximo de reintentos antes de enviar a DLQ
  MAX_RETRIES: 6,
  
  // Timeout para las peticiones HTTP (milisegundos)
  HTTP_TIMEOUT: 5000,
};
