import type { Metadata } from 'next'
import { DM_Sans, Manrope } from 'next/font/google'
import './globals.css'
import { Toaster } from '@heya-pos/ui'
import { Toaster as Sonner } from 'sonner'
import { Providers } from '@/components/providers'
import { ErrorBoundary } from '@/components/error-boundary'
import { Suspense } from 'react'
import { TyroScriptLoader } from '@/components/TyroScriptLoader'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

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
      <body className={`${dmSans.variable} ${manrope.variable} font-sans`}>
        <Providers>
          <ErrorBoundary>
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
              </div>
            }>
              {children}
            </Suspense>
          </ErrorBoundary>
        </Providers>
        <Toaster />
        <Sonner richColors position="top-right" />
        {/* Portal container for modals to prevent parent re-renders */}
        <div id="modal-portal" />
        {/* Tyro SDK loader - Client Component for event handlers */}
        <TyroScriptLoader />
      </body>
    </html>
  )
}