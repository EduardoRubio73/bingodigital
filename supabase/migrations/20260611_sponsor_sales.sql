-- Migration: adicionar payment_method em sponsors + criar tabela sponsor_sales

-- 1. Adicionar coluna payment_method na tabela sponsors (se ainda não existir)
ALTER TABLE sponsors
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL;

-- 2. Criar tabela sponsor_sales para registrar recebimentos de patrocínio
CREATE TABLE IF NOT EXISTS sponsor_sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id      UUID REFERENCES sponsors(id) ON DELETE SET NULL,
  sponsor_name    TEXT NOT NULL,
  tier            TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method  TEXT NOT NULL DEFAULT 'pix',
  payment_status  TEXT NOT NULL DEFAULT 'pendente' CHECK (payment_status IN ('pago', 'pendente', 'cancelado')),
  notes           TEXT DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para consultas por status e data
CREATE INDEX IF NOT EXISTS idx_sponsor_sales_status ON sponsor_sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_sponsor_sales_created ON sponsor_sales(created_at DESC);
