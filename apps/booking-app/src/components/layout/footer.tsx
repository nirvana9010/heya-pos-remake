export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Hamilton Beauty</h3>
            <p className="text-gray-400">
              Your premier destination for beauty and wellness services.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/services/hair" className="hover:text-white">Hair</a></li>
              <li><a href="/services/nails" className="hover:text-white">Nails</a></li>
              <li><a href="/services/skincare" className="hover:text-white">Skincare</a></li>
              <li><a href="/services/massage" className="hover:text-white">Massage</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Hours</h4>
            <ul className="space-y-2 text-gray-400">
              <li>Monday - Friday: 9:00 AM - 7:00 PM</li>
              <li>Saturday: 9:00 AM - 6:00 PM</li>
              <li>Sunday: Closed</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400">
              <li>123 Beauty Street</li>
              <li>Hamilton, ON L8P 4S6</li>
              <li>(123) 456-7890</li>
              <li>info@hamiltonbeauty.com</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Hamilton Beauty. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}