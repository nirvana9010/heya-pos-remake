import type { Metadata } from 'next'
import { DM_Sans, Manrope, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Toaster } from '@heya-pos/ui'
import { ErrorBoundary } from '@/components/error-boundary'
import { TimezoneProvider } from '@/contexts/timezone-context'
import { MerchantProvider } from '@/contexts/merchant-context'
import { MerchantTheme } from '@/components/merchant-theme'
import { MerchantIndicator } from '@/components/merchant-indicator'
import { MerchantHeader } from '@/components/merchant-header'
import { headers } from 'next/headers'

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get the merchant subdomain from the middleware header
  const headersList = await headers()
  const merchantSubdomain = headersList.get('x-merchant-subdomain')
  
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${manrope.variable} ${playfair.variable} font-sans`}>
        <ErrorBoundary>
          <MerchantProvider initialSubdomain={merchantSubdomain}>
            <MerchantTheme>
              <TimezoneProvider>
                <MerchantHeader />
                {children}
                <Toaster />
                <MerchantIndicator />
              </TimezoneProvider>
            </MerchantTheme>
          </MerchantProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}