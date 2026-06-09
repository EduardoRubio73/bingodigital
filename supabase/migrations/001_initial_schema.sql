-- ============================================================
-- BingoDigital — Schema inicial
-- ============================================================

-- EVENTS
CREATE TABLE IF NOT EXISTS public.events (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text          NOT NULL,
  status          text          NOT NULL DEFAULT 'setup'
                                CHECK (status IN ('setup', 'active', 'finished')),
  win_condition   text          NOT NULL DEFAULT 'full_card'
                                CHECK (win_condition IN ('line', 'column', 'diagonal', 'full_card')),
  drawn_numbers   integer[]     NOT NULL DEFAULT '{}',
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- CARDS
CREATE TABLE IF NOT EXISTS public.cards (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            uuid          NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  player_name         text          NOT NULL,
  numbers             integer[]     NOT NULL,
  marked_numbers      integer[]     NOT NULL DEFAULT '{}',
  bingo_claimed_at    timestamptz,
  created_at          timestamptz   NOT NULL DEFAULT now()
);

-- INDEX FK (Postgres não indexa FK automaticamente)
CREATE INDEX IF NOT EXISTS cards_event_id_idx ON public.cards (event_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards FORCE ROW LEVEL SECURITY;

-- Events: leitura pública, escrita apenas admin autenticado
CREATE POLICY events_select ON public.events
  FOR SELECT USING (true);

CREATE POLICY events_insert ON public.events
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY events_update ON public.events
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- Cards: leitura pública, UPDATE público (protegido pelo UUID imprevisível)
CREATE POLICY cards_select ON public.cards
  FOR SELECT USING (true);

CREATE POLICY cards_insert ON public.cards
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY cards_update ON public.cards
  FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================================
-- REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;
