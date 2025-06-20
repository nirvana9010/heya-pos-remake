'use client'

import { Search, User, Moon, Sun, Palette } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Input,
} from '@heya-pos/ui'
import { useState } from 'react'
import Link from 'next/link'
import { NotificationsDropdown } from '@/components/notifications-dropdown'

export function Topbar() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [searchQuery, setSearchQuery] = useState('')

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Use window.location for navigation to avoid webpack issues
      window.location.href = `/bookings?search=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '2rem' }}>
        {/* Enhanced Search */}
        <form onSubmit={handleSearch} style={{ 
          maxWidth: '400px', 
          width: '100%',
          margin: 0,
          position: 'relative'
        }}>
          <Search 
            size={18} 
            style={{ 
              position: 'absolute', 
              left: '0.75rem', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--color-text-secondary)',
              zIndex: 1
            }} 
          />
          <input
            type="search"
            placeholder="Search customers, bookings, services..."
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              paddingLeft: '2.5rem'
            }}
          />
        </form>

        {/* Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link href="/bookings/new">
            <button className="btn btn-secondary btn-sm">
              + New Booking
            </button>
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-sm"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <NotificationsDropdown />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '50%',
                padding: '2px'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}>
                HB
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ 
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <DropdownMenuLabel style={{ 
              color: 'var(--text-primary)',
              padding: 'var(--space-4)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ 
                  fontSize: 'var(--text-sm)', 
                  fontWeight: 'var(--font-semibold)'
                }}>
                  Hamilton Beauty
                </p>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--color-text-secondary)'
                }}>
                  admin@hamiltonbeauty.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator style={{ background: 'var(--color-border)' }} />
            
            <DropdownMenuItem style={{ 
              padding: '1rem',
              margin: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <User size={16} />
              <span style={{ color: 'var(--text-primary)' }}>Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem style={{ 
              padding: '1rem',
              margin: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Palette size={16} />
              <span style={{ color: 'var(--text-primary)' }}>Appearance</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator style={{ background: 'var(--color-border)' }} />
            
            <DropdownMenuItem style={{ 
              padding: '1rem',
              margin: '0.25rem',
              color: 'var(--color-error)'
            }}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}