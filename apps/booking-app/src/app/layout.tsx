import type { Metadata } from 'next'
import { DM_Sans, Manrope, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Toaster } from '@heya-pos/ui'
import { ErrorBoundary } from '@/components/error-boundary'
import { TimezoneProvider } from '@/contexts/timezone-context'

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

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Book Your Appointment',
  description: 'Book beauty and wellness services online',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${manrope.variable} ${playfair.variable} font-sans`}>
        <ErrorBoundary>
          <TimezoneProvider>
            {children}
            <Toaster />
          </TimezoneProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}