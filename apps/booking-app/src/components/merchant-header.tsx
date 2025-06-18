"use client";

import { useMerchant } from "@/contexts/merchant-context";
import Link from "next/link";
import Image from "next/image";

export function MerchantHeader() {
  const { merchant } = useMerchant();

  if (!merchant) {
    return null;
  }

  return (
    <header className="w-full bg-white shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {merchant.logo ? (
              <div className="relative h-10 w-32">
                <Image
                  src={merchant.logo}
                  alt={`${merchant.name} logo`}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            ) : (
              <h1 className="text-xl font-bold text-gray-900">
                {merchant.name}
              </h1>
            )}
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link 
              href="/booking" 
              className="text-sm font-medium text-gray-700 hover:text-primary transition-colors"
            >
              Book Now
            </Link>
            <Link 
              href="/services" 
              className="text-sm font-medium text-gray-700 hover:text-primary transition-colors"
            >
              Services
            </Link>
            <Link 
              href="/contact" 
              className="text-sm font-medium text-gray-700 hover:text-primary transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}