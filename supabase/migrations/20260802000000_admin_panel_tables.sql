-- Admin panel tables for LicitaClub procurement intelligence
-- Created: 2026-08-02

-- =============================================
-- TENDERS (Licitaciones de Mercado Público)
-- =============================================
CREATE TABLE IF NOT EXISTS public.tenders (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text        UNIQUE,
  title       text        NOT NULL,
  organization text,
  region      text,
  budget      numeric     DEFAULT 0,
  status      text        DEFAULT 'published',
  close_date  timestamptz,
  created_at  timestamptz DEFAULT now()
);

-- =============================================
-- SUPPLIERS (Proveedores)
-- =============================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  category      text,
  rating        numeric     DEFAULT 0,
  reviews_count int         DEFAULT 0,
  phone         text,
  website       text,
  address       text,
  created_at    timestamptz DEFAULT now()
);

-- =============================================
-- MATCHES (Oportunidades: tender × supplier)
-- =============================================
CREATE TABLE IF NOT EXISTS public.matches (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id   uuid        REFERENCES public.tenders(id) ON DELETE CASCADE,
  supplier_id uuid        REFERENCES public.suppliers(id) ON DELETE CASCADE,
  score       numeric     DEFAULT 0,
  status      text        DEFAULT 'pending',   -- pending | approved | rejected
  reasons     jsonb,
  created_at  timestamptz DEFAULT now()
);

-- =============================================
-- DEMANDAS (alias de tenders para el dashboard)
-- =============================================
CREATE TABLE IF NOT EXISTS public.demandas (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id  text        UNIQUE,
  title        text        NOT NULL,
  organization text,
  region       text,
  budget       numeric     DEFAULT 0,
  status       text        DEFAULT 'published',
  close_date   timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- =============================================
-- OUTREACH (Contactos enviados)
-- =============================================
CREATE TABLE IF NOT EXISTS public.outreach (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    uuid        REFERENCES public.matches(id) ON DELETE CASCADE,
  supplier_id uuid        REFERENCES public.suppliers(id) ON DELETE CASCADE,
  status      text        DEFAULT 'queued',    -- queued | sent | blocked | failed
  sent_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);

-- =============================================
-- STATS VIEW (resumen para KPIs del dashboard)
-- =============================================
CREATE OR REPLACE VIEW public.stats AS
SELECT
  (SELECT count(*) FROM public.tenders  WHERE status = 'published')::int   AS tenders,
  (SELECT count(*) FROM public.matches  WHERE status = 'pending')::int     AS "matchesPending",
  (SELECT count(*) FROM public.matches  WHERE status = 'approved')::int    AS "matchesApproved",
  (SELECT count(*) FROM public.suppliers)::int                             AS suppliers,
  (SELECT count(*) FROM public.outreach WHERE status = 'blocked')::int     AS "outreachBlocked",
  (SELECT count(*) FROM public.outreach WHERE status = 'queued')::int      AS "outreachQueued",
  (SELECT count(*) FROM public.outreach WHERE status = 'sent')::int        AS "outreachSent";

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.tenders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach  ENABLE ROW LEVEL SECURITY;

-- Allow anon read (panel admin uses anon key)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenders'   AND policyname='anon_read') THEN
    CREATE POLICY anon_read ON public.tenders   FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='suppliers' AND policyname='anon_read') THEN
    CREATE POLICY anon_read ON public.suppliers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matches'   AND policyname='anon_read') THEN
    CREATE POLICY anon_read ON public.matches   FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='demandas'  AND policyname='anon_read') THEN
    CREATE POLICY anon_read ON public.demandas  FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outreach'  AND policyname='anon_read') THEN
    CREATE POLICY anon_read ON public.outreach  FOR SELECT USING (true);
  END IF;
END $$;

-- Allow service_role full write
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenders'   AND policyname='service_write') THEN
    CREATE POLICY service_write ON public.tenders   FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='suppliers' AND policyname='service_write') THEN
    CREATE POLICY service_write ON public.suppliers FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matches'   AND policyname='service_write') THEN
    CREATE POLICY service_write ON public.matches   FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='demandas'  AND policyname='service_write') THEN
    CREATE POLICY service_write ON public.demandas  FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outreach'  AND policyname='service_write') THEN
    CREATE POLICY service_write ON public.outreach  FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
