-- ============================================================
-- BingoDigital — Events v2: preço, capacidade, condições com prêmios
-- ============================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS price_per_card  numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_cards       integer       NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS cards_sold      integer       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prize_conditions jsonb        NOT NULL DEFAULT '[]';

-- Remove a coluna win_condition legada (será substituída por prize_conditions)
-- Mantida por compatibilidade — pode ser removida em migration futura
-- prize_conditions formato:
-- [{"condition":"line","label":"Linha","prize":"R$ 50","won_by_card":null,"won_by_name":null,"won_at":null}, ...]
-- "full_card" sempre deve estar presente e encerra o evento quando vencida
