import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'POSL - Personal Online Social Life Automation',
  description: 'Automate your social media posting with AI-powered content generation',
  keywords: ['social media', 'automation', 'AI', 'content generation'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.className} h-full antialiased`}>
        <div id="__next" className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  )
}