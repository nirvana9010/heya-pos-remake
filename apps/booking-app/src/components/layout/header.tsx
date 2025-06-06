'use client'

import Link from 'next/link'
import { Phone, MapPin, Clock } from 'lucide-react'
import { Button } from '@heya-pos/ui'

export function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">Hamilton Beauty</h1>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/services"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Services
            </Link>
            <Link
              href="/about"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Contact
            </Link>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/booking">Book Now</Link>
            </Button>
          </nav>
        </div>

        <div className="border-t py-2">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
            <a
              href="tel:+1234567890"
              className="flex items-center gap-1 hover:text-gray-900"
            >
              <Phone className="h-4 w-4" />
              (123) 456-7890
            </a>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              123 Beauty Street, Hamilton
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Mon-Sat: 9AM-7PM
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}