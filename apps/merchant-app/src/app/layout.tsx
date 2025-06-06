import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@heya-pos/ui'
import { Providers } from '@/components/providers'
import { TopLoadingBar } from '@/components/TopLoadingBar'
import { Suspense } from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Heya POS - Merchant App',
  description: 'Point of Sale system for beauty and wellness businesses',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script src="/js/iclient-with-ui-v1.js"></script>
      </head>
      <body className={inter.className}>
        <Suspense fallback={null}>
          <TopLoadingBar />
        </Suspense>
        <Providers>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          }>
            {children}
          </Suspense>
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}