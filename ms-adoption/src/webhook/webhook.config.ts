
export const WEBHOOK_CONFIG = {
  SECRET: process.env.WEBHOOK_SECRET || 'mi-super-secreto-compartido-12345',
  
  MAX_RETRIES: 6,
  
  HTTP_TIMEOUT: 5000,
};
