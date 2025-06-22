import { headers } from 'next/headers'

export interface Session {
  userId: string
  merchantId: string
  userType: string
}

/**
 * Get the authenticated session from request headers
 * This is set by the middleware after validating the JWT
 * 
 * @returns Session data or null if not authenticated
 */
export function getSession(): Session | null {
  const headersList = headers()
  const userId = headersList.get('x-user-id')
  const merchantId = headersList.get('x-merchant-id')
  const userType = headersList.get('x-user-type')

  if (!userId || !merchantId) {
    // This should not happen for protected routes if middleware is configured correctly
    return null
  }

  return {
    userId,
    merchantId,
    userType: userType || 'merchant',
  }
}