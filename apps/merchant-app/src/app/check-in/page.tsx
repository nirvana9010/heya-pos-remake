'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui'
import { Button } from '@heya-pos/ui'
import { Input } from '@heya-pos/ui'
import { apiClient } from '../../lib/api-client'
import { useToast } from '@heya-pos/ui'
import { CheckCircle, Users, Gift, TrendingUp } from 'lucide-react'

export default function CheckInPage() {
  const { toast } = useToast()
  const [stats, setStats] = useState({
    todayCheckins: 0,
    totalCustomers: 0,
    activeRewards: 0,
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // Load today's check-ins
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const [bookingsResponse, customersResponse] = await Promise.all([
        apiClient.get(`/bookings`, {
          params: {
            startTime: today.toISOString(),
            status: 'COMPLETED'
          }
        }),
        apiClient.get('/customers')
      ])

      setStats({
        todayCheckins: bookingsResponse.data?.length || 0,
        totalCustomers: customersResponse.data?.length || 0,
        activeRewards: 0 // TODO: Implement rewards tracking
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const generateCheckInUrl = () => {
    const merchant = JSON.parse(localStorage.getItem('merchant') || '{}')
    if (merchant.subdomain) {
      const baseUrl = window.location.origin.replace('merchant-app', 'booking-app')
      return `${baseUrl}/check-in?subdomain=${merchant.subdomain}`
    }
    return ''
  }

  const copyCheckInUrl = () => {
    const url = generateCheckInUrl()
    if (url) {
      navigator.clipboard.writeText(url)
      toast({
        title: "Copied!",
        description: "Check-in URL copied to clipboard",
      })
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Check-In Kiosk</h1>
        <p className="text-gray-600">
          Simple check-in system for customer loyalty tracking
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Check-ins
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCheckins}</div>
            <p className="text-xs text-muted-foreground">
              Customers checked in today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Registered customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Rewards
            </CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRewards}</div>
            <p className="text-xs text-muted-foreground">
              Customers with rewards
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Check-In URL Section */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Check-In URL</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Share this URL with customers or display it on a tablet at your location for self check-in.
          </p>
          <div className="flex gap-2">
            <Input
              value={generateCheckInUrl()}
              readOnly
              className="flex-1"
            />
            <Button onClick={copyCheckInUrl}>
              Copy URL
            </Button>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">How it works:</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Customers visit the check-in URL</li>
              <li>They enter their phone number and name</li>
              <li>Each check-in counts towards loyalty rewards</li>
              <li>No appointments or services needed</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Recent Check-ins */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            View recent check-ins in the Bookings page
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.href = '/bookings'}
          >
            View All Bookings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}