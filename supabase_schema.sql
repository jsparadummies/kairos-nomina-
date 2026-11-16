-- ==========================================================
-- KAIROS - SCRIPT SQL DE INICIALIZACIÓN PARA SUPABASE
-- Pega este script en el "SQL Editor" de tu proyecto de Supabase
-- y haz clic en "RUN".
-- ==========================================================

-- 1. TABLA DE OPERARIOS / TRABAJADORES
CREATE TABLE IF NOT EXISTS public.workers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Operario de Obra',
  biweekly_salary NUMERIC NOT NULL DEFAULT 1285000,
  monthly_salary NUMERIC NOT NULL DEFAULT 2570000,
  active BOOLEAN NOT NULL DEFAULT true,
  pin TEXT NOT NULL DEFAULT '1234',
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA DE LIQUIDACIÓN DE QUINCENAS
CREATE TABLE IF NOT EXISTS public.records (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  period_half INTEGER NOT NULL,
  worked_full_period BOOLEAN NOT NULL DEFAULT true,
  missed_days_total INTEGER NOT NULL DEFAULT 0,
  missed_days_justified INTEGER NOT NULL DEFAULT 0,
  missed_days_unjustified INTEGER NOT NULL DEFAULT 0,
  justification_reason TEXT,
  shifts JSONB DEFAULT '[]'::jsonb,
  bonus NUMERIC DEFAULT 0,
  deduction NUMERIC DEFAULT 0,
  admin_notes TEXT,
  status TEXT NOT NULL DEFAULT 'enviado',
  summary JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA DE CONFIGURACIÓN DE EMPRESA Y SMLV
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- Permite lectura y escritura desde la aplicación (Anon Key)
-- ==========================================================

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Políticas para Workers
DROP POLICY IF EXISTS "Public access workers" ON public.workers;
CREATE POLICY "Public access workers" ON public.workers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para Records
DROP POLICY IF EXISTS "Public access records" ON public.records;
CREATE POLICY "Public access records" ON public.records
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para Settings
DROP POLICY IF EXISTS "Public access settings" ON public.settings;
CREATE POLICY "Public access settings" ON public.settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_workers_document ON public.workers(document_id);
CREATE INDEX IF NOT EXISTS idx_records_worker ON public.records(worker_id);
CREATE INDEX IF NOT EXISTS idx_records_period ON public.records(period_year, period_month, period_half);
