-- ============================================
-- SCRIPT DE CONFIGURACIÓN SUPABASE
-- ============================================

-- 1. CREAR TABLAS
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  secret TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  status TEXT CHECK (status IN ('pending', 'delivered', 'failed')),
  response_status INTEGER,
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processed_webhooks (
  event_id TEXT NOT NULL,
  processor TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, processor)
);

-- 2. CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_subscriptions_event_type ON webhook_subscriptions(event_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON webhook_subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_subscription ON webhook_deliveries(subscription_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_event ON webhook_deliveries(event_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_processed_at ON processed_webhooks(processed_at);

-- 3. REGISTRAR SUSCRIPCIONES
-- ⚠️ IMPORTANTE: Reemplaza "lsckojdsitlkqzbugdfe" con tu Project ID real
INSERT INTO webhook_subscriptions (url, event_type, secret) VALUES
(
  'https://lsckojdsitlkqzbugdfe.supabase.co/functions/v1/webhook-event-logger',
  'adoption.completed',
  'mi-super-secreto-compartido-12345'
),
(
  'https://lsckojdsitlkqzbugdfe.supabase.co/functions/v1/webhook-external-notifier',
  'adoption.completed',
  'mi-super-secreto-compartido-12345'
)
ON CONFLICT DO NOTHING;

-- 4. VERIFICAR SUSCRIPCIONES
SELECT * FROM webhook_subscriptions;
