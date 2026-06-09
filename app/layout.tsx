import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bingo Digital — Fraternidade Sem Fronteiras',
  description: 'Sistema de bingo digital para eventos',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={dmSans.className}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
