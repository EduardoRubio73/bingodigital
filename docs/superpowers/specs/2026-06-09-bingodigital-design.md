# BingoDigital — Design Spec
**Data:** 2026-06-09  
**Organização:** Fraternidade Sem Fronteiras  
**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Supabase

---

## Contexto

Sistema de bingo digital para eventos presenciais da Fraternidade Sem Fronteiras. Jogadores acessam cartelas por link/QR code sem cadastro. Admin controla o sorteio. Telão projetado para o público. Versão especial para idosos com interface acessível.

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Acesso do jogador | Link/QR Code (sem login) | Simplicidade, sem fricção |
| Sorteio | Manual pelo admin | Controle total do apresentador |
| Condição de vitória | Flexível (linha/coluna/diagonal/cartela) | Admin escolhe por evento |
| Telão | Rota dedicada `/display/:eventId` | Abre no projetor em fullscreen |
| Eventos simultâneos | Um evento ativo por vez | Escopo da organização |
| Realtime | Supabase Realtime | Zero custo extra, suficiente para centenas de jogadores |

---

## Rotas

```
/                          → redirect → /admin (logado) ou /login
/login                     → Login do admin (Supabase Auth)
/admin                     → Dashboard: sortear números, ver BINGO claims
/admin/setup               → Criar evento: nome, nº de cartelas, condição de vitória
/admin/players             → Lista de jogadores + QR codes + links
/display/:eventId          → Telão fullscreen (projetor)
/card/:cardId              → Cartela do jogador (padrão)
/card-elderly/:cardId      → Cartela do jogador (versão idoso)
```

---

## Schema do Banco

```sql
-- Eventos de bingo
events (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text          NOT NULL,
  status          text          NOT NULL DEFAULT 'setup',  -- setup | active | finished
  win_condition   text          NOT NULL DEFAULT 'full_card', -- line | column | diagonal | full_card
  drawn_numbers   integer[]     NOT NULL DEFAULT '{}',
  created_at      timestamptz   NOT NULL DEFAULT now()
)

-- Cartelas dos jogadores
cards (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid          NOT NULL REFERENCES events(id),
  player_name     text          NOT NULL,
  numbers         integer[]     NOT NULL,  -- 25 números únicos de 1-75, grid 5x5
  marked_numbers  integer[]     NOT NULL DEFAULT '{}',
  bingo_claimed_at timestamptz,
  created_at      timestamptz   NOT NULL DEFAULT now()
)
```

**Geração de cartelas:** 25 números únicos aleatórios de 1–75 por cartela, gerados server-side na criação do evento.

**Fonte da verdade:** `events.drawn_numbers` — Supabase Realtime escuta UPDATE nessa coluna e propaga para todas as cartelas e telão.

**Índices obrigatórios:**
```sql
-- FK não é indexada automaticamente pelo Postgres
CREATE INDEX cards_event_id_idx ON cards (event_id);
```

**RLS Policies (padrão de performance: `(select auth.uid())` evita chamada por linha):**
```sql
-- events: leitura pública, escrita apenas admin autenticado
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;

CREATE POLICY events_read ON events FOR SELECT USING (true);
CREATE POLICY events_write ON events FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- cards: leitura pública por UUID, escrita de marked_numbers/bingo_claimed_at pública
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards FORCE ROW LEVEL SECURITY;

CREATE POLICY cards_read ON cards FOR SELECT USING (true);
CREATE POLICY cards_update ON cards FOR UPDATE
  USING (true)
  WITH CHECK (true);  -- proteção real é o UUID imprevisível da cartela
```

---

## Componentes

### Admin Dashboard (`/admin`)
- `DrawButton` — sorteia próximo número aleatório não sorteado ainda
- `DrawnNumbersGrid` — grid 1–75, números sorteados destacados
- `BingoClaimsList` — lista em tempo real de quem clicou BINGO (nome + horário)
- `EventStatusBadge` — setup / ativo / finalizado

### Setup de Evento (`/admin/setup`)
- Formulário: nome do evento, quantidade de cartelas, condição de vitória
- Geração automática das cartelas ao confirmar

### Players (`/admin/players`)
- Tabela: nome, link da cartela, QR code (download PNG)
- Toggle entre cartela normal e versão idoso

### Telão (`/display/:eventId`)
- Número atual em destaque (fonte 200px+, animação de entrada)
- Últimos 5 números sorteados
- Grid 1–75 com sorteados destacados
- Auto-fullscreen, sem UI de navegação

### Cartela Normal (`/card/:cardId`)
- Grid 5×5 responsivo
- Números sorteados → amarelo (automático via Realtime)
- Toque → marcar/desmarcar (roxo)
- Botão BINGO (ativo quando condição de vitória for atingida)
- Indicador de conexão Realtime

### Cartela Idoso (`/card-elderly/:cardId`)
- Mesma lógica da cartela normal
- Números 32px+, botões mínimo 70×70px
- Cores: cinza (não marcado), amarelo (sorteado), roxo escuro (marcado)
- Botão BINGO 24px, verde, texto simples
- Sem menus, sem navegação, sem elementos desnecessários

---

## Hooks Compartilhados

```typescript
useEvent(eventId)      // Realtime: escuta drawn_numbers, retorna estado do evento
useBingoCard(cardId)   // Gerencia estado local da cartela + sync com banco
useAdminDraw(eventId)  // Sorteia próximo número (apenas admin)
```

---

## Fluxo de Uso

### Antes do evento
1. Admin acessa `/admin/setup`
2. Preenche nome, quantidade de cartelas, condição de vitória
3. Sistema gera cartelas e salva no banco
4. Admin abre `/admin/players` → compartilha links/QR codes com jogadores
5. Abre `/display/:eventId` no projetor

### Durante o evento
1. Admin clica "Sortear" em `/admin`
2. Número é salvo em `events.drawn_numbers`
3. Realtime propaga para todas as cartelas abertas e para o telão
4. Jogadores veem o número ficar amarelo automaticamente
5. Jogadores tocam para marcar (roxo)
6. Jogador que completar clica BINGO → aparece em `BingoClaimsList` para admin validar

### Fim do evento
1. Admin marca evento como finalizado
2. Cartelas ficam em modo somente leitura

---

## Paleta de Cores

| Estado | Cor | Hex |
|--------|-----|-----|
| Não marcado | Cinza claro | #f3f4f6 |
| Sorteado | Amarelo | #fcd34d |
| Marcado | Roxo escuro | #5C1F47 |
| Primária admin | Roxo | #5C1F47 |
| BINGO button | Verde | #27ae60 |

---

## Fora do Escopo (v1)

- Multi-tenant (outras organizações)
- Som/áudio
- Modo escuro
- Histórico de eventos passados
- Relatórios/estatísticas
- PWA/push notifications
