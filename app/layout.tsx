import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bingo Digital — Fraternidade Sem Fronteiras',
  description: 'Sistema de bingo digital para eventos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={geist.className}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
