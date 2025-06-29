'use client'

import { apiClient } from './api-client'

// Prefetch data for commonly accessed pages
export const prefetchManager = {
  // Cache for prefetched data
  cache: new Map<string, { data: any; timestamp: number }>(),
  
  // Cache duration in ms (5 minutes)
  CACHE_DURATION: 5 * 60 * 1000,
  
  // Check if cached data is still valid
  isCacheValid(key: string): boolean {
    const cached = this.cache.get(key)
    if (!cached) return false
    return Date.now() - cached.timestamp < this.CACHE_DURATION
  },
  
  // Get cached data
  getCached(key: string): any | null {
    if (!this.isCacheValid(key)) return null
    return this.cache.get(key)?.data || null
  },
  
  // Prefetch customers data
  async prefetchCustomers() {
    const key = 'customers'
    if (this.isCacheValid(key)) return
    
    try {
      const response = await apiClient.getCustomers()
      this.cache.set(key, { data: response.data, timestamp: Date.now() })
    } catch (error) {
      // Silently fail - prefetching is optional
    }
  },
  
  // Prefetch services data
  async prefetchServices() {
    const key = 'services'
    if (this.isCacheValid(key)) return
    
    try {
      const [services, categories] = await Promise.all([
        apiClient.getServices(),
        apiClient.getCategories()
      ])
      this.cache.set(key, { 
        data: { services, categories }, 
        timestamp: Date.now() 
      })
    } catch (error) {
      // Silently fail - prefetching is optional
    }
  },
  
  // Prefetch bookings data
  async prefetchBookings() {
    const key = 'bookings-today'
    if (this.isCacheValid(key)) return
    
    try {
      const data = await apiClient.getBookings(new Date())
      this.cache.set(key, { data, timestamp: Date.now() })
    } catch (error) {
      // Silently fail - prefetching is optional
    }
  },
  
  // Start prefetching common data
  startPrefetching() {
    // Only prefetch if user is authenticated
    const token = localStorage.getItem('access_token')
    if (!token) return
    
    // Prefetch after a short delay to not interfere with initial page load
    setTimeout(() => {
      this.prefetchCustomers()
      this.prefetchServices()
      // Skip bookings prefetch for now due to V2 API issues
      // TODO: Re-enable once V2 bookings endpoint is fixed
      // this.prefetchBookings()
    }, 2000)
  },
  
  // Clear all cached data
  clearCache() {
    this.cache.clear()
  }
}