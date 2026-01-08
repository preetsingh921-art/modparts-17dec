import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1a1a1a] text-[#F5F0E1] py-12 border-t-2 border-[#8B2332]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo & Description */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <img
                src="/images/vintage-logo.png"
                alt="Vintage Yamaha Parts"
                className="h-16 w-auto"
              />
              <div>
                <span
                  className="text-xl font-bold tracking-wide block"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  VINTAGE YAMAHA
                </span>
                <span
                  className="text-xs text-[#B8860B] tracking-widest"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  MOTORCYCLE PARTS
                </span>
              </div>
            </div>
            <p className="text-[#A8A090] leading-relaxed text-sm" style={{ fontFamily: "'Roboto Slab', serif" }}>
              Your premier source for vintage Yamaha motorcycle parts.
              Authentic parts for classic RD, DT, and more.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3
              className="text-lg font-semibold mb-6 text-[#B8860B] uppercase tracking-wider"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/products" className="text-[#A8A090] hover:text-[#F5F0E1] transition-colors">
                  Parts Catalog
                </Link>
              </li>
              <li>
                <Link to="/products/category/1" className="text-[#A8A090] hover:text-[#F5F0E1] transition-colors">
                  Engine Parts
                </Link>
              </li>
              <li>
                <Link to="/products/category/2" className="text-[#A8A090] hover:text-[#F5F0E1] transition-colors">
                  Electrical
                </Link>
              </li>
              <li>
                <Link to="/products/category/3" className="text-[#A8A090] hover:text-[#F5F0E1] transition-colors">
                  Bodywork
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3
              className="text-lg font-semibold mb-6 text-[#B8860B] uppercase tracking-wider"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Contact Us
            </h3>
            <address className="not-italic text-[#A8A090] space-y-3 text-sm">
              <p className="flex items-center">
                <svg className="w-4 h-4 mr-3 text-[#8B2332] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                123 Motorcycle Lane, Bike City
              </p>
              <p className="flex items-center">
                <svg className="w-4 h-4 mr-3 text-[#8B2332] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                (555) 123-4567
              </p>
              <p className="flex items-center">
                <svg className="w-4 h-4 mr-3 text-[#8B2332] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                info@vintageyamahaparts.com
              </p>
            </address>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#333] mt-10 pt-6 text-center">
          <p className="text-[#A8A090] text-sm" style={{ fontFamily: "'Roboto Slab', serif" }}>
            &copy; {currentYear} Vintage Yamaha Parts. All rights reserved.
          </p>
          <p className="text-[#B8860B] text-xs mt-2 uppercase tracking-widest" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Authentic Parts • Expert Knowledge • Fast Shipping
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
