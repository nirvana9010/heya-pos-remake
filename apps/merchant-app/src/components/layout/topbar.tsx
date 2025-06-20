'use client'

import { Bell, Search, User, Moon, Sun, Palette } from 'lucide-react'
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
import { useRouter } from 'next/navigation'

export function Topbar() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to bookings page with search query
      router.push(`/bookings?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleNewBooking = () => {
    router.push('/bookings/new')
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
          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleNewBooking}
          >
            + New Booking
          </button>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="btn btn-ghost btn-sm"
              style={{
                position: 'relative'
              }}
            >
              <Bell size={18} />
              <div className="badge badge-error" style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                minWidth: '18px',
                height: '18px',
                borderRadius: '50%',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                3
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ 
            width: '320px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.75rem'
          }}>
            <DropdownMenuLabel style={{ 
              color: 'var(--color-text-primary)',
              fontSize: '1.125rem',
              padding: '1rem'
            }}>
              Notifications
            </DropdownMenuLabel>
            <DropdownMenuSeparator style={{ background: 'var(--color-border)' }} />
            
            <DropdownMenuItem style={{ 
              padding: '1rem',
              margin: '0.25rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '600',
                  color: 'var(--color-text-primary)'
                }}>
                  New booking
                </p>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--color-text-secondary)'
                }}>
                  Sarah Johnson booked a hair appointment for tomorrow
                </p>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem style={{ 
              padding: '1rem',
              margin: '0.25rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '600',
                  color: 'var(--color-text-primary)'
                }}>
                  Payment received
                </p>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--color-text-secondary)'
                }}>
                  $120 payment from Michael Chen via Tyro
                </p>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem style={{ 
              padding: '1rem',
              margin: '0.25rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '600',
                  color: 'var(--color-text-primary)'
                }}>
                  Staff reminder
                </p>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--color-text-secondary)'
                }}>
                  Emma Wilson is on break in 15 minutes
                </p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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