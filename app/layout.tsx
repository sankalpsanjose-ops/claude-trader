import type { Metadata } from 'next'
import { Ubuntu, Ubuntu_Mono } from 'next/font/google'
import './globals.css'

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-ubuntu',
})

const ubuntuMono = Ubuntu_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-ubuntu-mono',
})

export const metadata: Metadata = {
  title: 'Claude Trader — AI-Powered Paper Trading',
  description: 'Watch Claude autonomously trade Indian stocks with ₹50,000. Real decisions, real reasoning, no real money.',
  openGraph: {
    title: 'Claude Trader',
    description: 'Watch Claude autonomously trade Indian stocks with ₹50,000.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ubuntu.variable} ${ubuntuMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0d1117] text-[#e6edf3]" style={{ fontFamily: 'var(--font-ubuntu), system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
