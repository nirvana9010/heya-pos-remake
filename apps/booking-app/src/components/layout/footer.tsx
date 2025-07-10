'use client';

import { useMerchant } from '@/contexts/merchant-context';

export function Footer() {
  const { merchant, loading } = useMerchant();

  // Show a minimal footer while loading
  if (loading || !merchant) {
    return (
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
          </div>
        </div>
      </footer>
    );
  }

  // Parse address to separate lines if it contains commas or newlines
  const addressLines = merchant.address
    ? merchant.address.split(/[,\n]/).map(line => line.trim()).filter(Boolean)
    : [];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">{merchant.name}</h3>
            {merchant.description && (
              <p className="text-gray-400">
                {merchant.description}
              </p>
            )}
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/services" className="hover:text-white">View All Services</a></li>
              <li><a href="/booking" className="hover:text-white">Book Now</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Hours</h4>
            <ul className="space-y-2 text-gray-400">
              <li>Check our booking calendar for availability</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400">
              {addressLines.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
              {merchant.phone && <li>{merchant.phone}</li>}
              {merchant.email && <li>{merchant.email}</li>}
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} {merchant.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}