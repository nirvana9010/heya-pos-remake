'use client'

import { useEffect, useState } from 'react'
import { Button } from '@heya-pos/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui'

export default function TestPerformancePage() {
  const [navigationTimes, setNavigationTimes] = useState<number[]>([])
  const [startTime, setStartTime] = useState<number>(0)
  
  useEffect(() => {
    // Record when this page loads
    const loadTime = performance.now() - startTime
    if (startTime > 0) {
      setNavigationTimes(prev => [...prev, loadTime])
      console.log(`[Performance Test] Page loaded in ${Math.round(loadTime)}ms`)
    }
  }, [startTime])
  
  const handleNavigationTest = () => {
    setStartTime(performance.now())
    // Navigate to dashboard
    window.location.href = '/dashboard'
  }
  
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Navigation Performance Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>This page helps test navigation performance.</p>
            
            <div>
              <h3 className="font-semibold mb-2">Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the button below to navigate to dashboard</li>
                <li>Use browser back button to return here</li>
                <li>Check console for timing information</li>
              </ol>
            </div>
            
            <Button onClick={handleNavigationTest}>
              Test Navigation to Dashboard
            </Button>
            
            {navigationTimes.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Navigation Times:</h3>
                <ul className="space-y-1">
                  {navigationTimes.map((time, index) => (
                    <li key={index}>
                      Navigation {index + 1}: {Math.round(time)}ms
                    </li>
                  ))}
                </ul>
                <p className="mt-2">
                  Average: {Math.round(navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length)}ms
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}