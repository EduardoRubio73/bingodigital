import { createBrowserClient } from '@supabase/ssr'

// Sem generic Database para evitar conflito com a estrutura esperada pelo supabase-js v2.
// Os tipos das respostas são definidos explicitamente nos hooks e páginas.
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
