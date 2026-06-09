-- ============================================================
-- BingoDigital — Tabela de vendas de cartelas
-- ============================================================

CREATE TABLE IF NOT EXISTS public.card_sales (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid          NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  buyer_name      text          NOT NULL,
  buyer_contact   text,
  quantity        integer       NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount_paid     numeric(10,2) NOT NULL DEFAULT 0,
  payment_method  text          CHECK (payment_method IN ('pix', 'dinheiro', 'cartao', 'outro')),
  payment_status  text          NOT NULL DEFAULT 'pendente'
                                CHECK (payment_status IN ('pendente', 'pago', 'cancelado')),
  registered_by   text,
  notes           text,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS card_sales_event_id_idx ON public.card_sales (event_id);

ALTER TABLE public.card_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_sales FORCE ROW LEVEL SECURITY;

CREATE POLICY card_sales_select ON public.card_sales
  FOR SELECT USING (true);

CREATE POLICY card_sales_insert ON public.card_sales
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY card_sales_update ON public.card_sales
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY card_sales_delete ON public.card_sales
  FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE public.card_sales;
