-- ============================================================
-- BingoDigital — Cards v2: código alfanumérico e FK de venda
-- ============================================================

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS alphanumeric_code text,
  ADD COLUMN IF NOT EXISTS sale_id           uuid REFERENCES public.card_sales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sequence_number   integer;

-- alphanumeric_code: A1..A10, B1..B10 ... Z1..Z10, depois A11..A20, etc.
-- sequence_number: número sequencial dentro do evento (1, 2, 3...)
CREATE INDEX IF NOT EXISTS cards_sale_id_idx ON public.cards (sale_id);
