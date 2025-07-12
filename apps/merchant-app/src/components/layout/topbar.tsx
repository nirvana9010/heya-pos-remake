'use client'

import { Search, User, Moon, Sun, Palette, Plus } from 'lucide-react'
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
import { GlobalSearch } from '@/components/global-search'
import { useAuth } from '@/lib/auth/auth-provider'
import { useBooking } from '@/contexts/booking-context'
import { CacheBuster } from '@/components/CacheBuster'

export function Topbar() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const { logout, merchant, user } = useAuth()
  const { openBookingSlideout, openQuickSale } = useBooking()

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return (
    <header 
      className="topbar"
      style={{
        position: 'sticky',
        top: 0,
        height: '64px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 30
      }}>
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '2rem' }}>
        {/* Global Search with Suggestions */}
        <GlobalSearch />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Theme Toggle - Hidden for MVP */}
        {/* <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-sm"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button> */}

        {/* Quick Sale Button */}
        <Button 
          size="sm" 
          onClick={openQuickSale}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Quick Sale
        </Button>

        {/* Cache Buster (Dev only) */}
        <CacheBuster />

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
                {merchant?.name ? merchant.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2) : 'UN'}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{merchant?.name || 'Unknown Merchant'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || merchant?.email || 'No email'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Palette className="mr-2 h-4 w-4" />
              <span>Appearance</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              className="text-red-600 cursor-pointer"
              onClick={() => logout()}
            >
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}