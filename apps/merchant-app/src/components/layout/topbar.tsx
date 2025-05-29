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

export function Topbar() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 'var(--space-lg)' }}>
        {/* Enhanced Search */}
        <div style={{ 
          maxWidth: '400px', 
          width: '100%',
          margin: 0,
          position: 'relative'
        }}>
          <Search 
            size={18} 
            style={{ 
              position: 'absolute', 
              left: 'var(--space-3)', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--text-secondary)',
              zIndex: 1
            }} 
          />
          <input
            type="search"
            placeholder="Search customers, bookings, services..."
            className="form-input"
            style={{ 
              paddingLeft: 'var(--space-10)'
            }}
          />
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary btn-sm">
            + New Booking
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
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
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <DropdownMenuLabel style={{ 
              color: 'var(--text-primary)',
              fontSize: 'var(--text-lg)',
              padding: 'var(--space-4)'
            }}>
              Notifications
            </DropdownMenuLabel>
            <DropdownMenuSeparator style={{ background: 'var(--border)' }} />
            
            <DropdownMenuItem style={{ 
              padding: 'var(--space-4)',
              margin: 'var(--space-1)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ 
                  fontSize: 'var(--text-sm)', 
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--text-primary)'
                }}>
                  New booking
                </p>
                <p style={{ 
                  fontSize: 'var(--text-xs)', 
                  color: 'var(--text-secondary)'
                }}>
                  Sarah Johnson booked a hair appointment for tomorrow
                </p>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem style={{ 
              padding: 'var(--space-4)',
              margin: 'var(--space-1)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ 
                  fontSize: 'var(--text-sm)', 
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--text-primary)'
                }}>
                  Payment received
                </p>
                <p style={{ 
                  fontSize: 'var(--text-xs)', 
                  color: 'var(--text-secondary)'
                }}>
                  $120 payment from Michael Chen via Tyro
                </p>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem style={{ 
              padding: 'var(--space-4)',
              margin: 'var(--space-1)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ 
                  fontSize: 'var(--text-sm)', 
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--text-primary)'
                }}>
                  Staff reminder
                </p>
                <p style={{ 
                  fontSize: 'var(--text-xs)', 
                  color: 'var(--text-secondary)'
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
                borderRadius: 'var(--radius-full)',
                padding: '2px'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'var(--font-semibold)',
                fontSize: 'var(--text-sm)'
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
                  fontSize: 'var(--text-xs)', 
                  color: 'var(--text-secondary)'
                }}>
                  admin@hamiltonbeauty.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator style={{ background: 'var(--border)' }} />
            
            <DropdownMenuItem style={{ 
              padding: 'var(--space-4)',
              margin: 'var(--space-1)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <User size={16} />
              <span style={{ color: 'var(--text-primary)' }}>Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem style={{ 
              padding: 'var(--space-4)',
              margin: 'var(--space-1)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <Palette size={16} />
              <span style={{ color: 'var(--text-primary)' }}>Appearance</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator style={{ background: 'var(--border)' }} />
            
            <DropdownMenuItem style={{ 
              padding: 'var(--space-4)',
              margin: 'var(--space-1)',
              color: 'var(--error)'
            }}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}