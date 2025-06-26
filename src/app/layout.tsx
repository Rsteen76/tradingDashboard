import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'AI Trading Dashboard',
  description: 'Advanced ML-powered trading analysis and execution platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gradient-to-br from-trading-dark to-trading-darker min-h-screen text-gray-100`}>
        <div className="min-h-screen backdrop-blur-sm">
          <main className="container mx-auto p-4 relative">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
