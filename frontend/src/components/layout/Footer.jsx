import { Link } from 'react-router-dom';
import { useLogo } from '../../context/LogoContext';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { logo } = useLogo();

  return (
    <footer className="bg-slate-900/95 backdrop-blur-sm text-slate-100 py-12 border-t border-slate-700">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-6 group">
              {logo ? (
                <img
                  src={logo}
                  alt="ModParts Logo"
                  className="h-8 w-auto group-hover:scale-110 transition-transform"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-soft">
                  <span className="text-xs font-bold text-white">MP</span>
                </div>
              )}
              <h3 className="text-xl font-bold group-hover:text-emerald-400 transition-colors">ModParts</h3>
            </div>
            <p className="text-slate-300 leading-relaxed text-sm">
              Your one-stop shop for quality automobile parts.
              We specialize in premium auto parts for all vehicle makes and models.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6 text-emerald-400">Contact Us</h3>
            <address className="not-italic text-slate-300 space-y-3">
              <p className="flex items-center text-sm">
                <svg className="w-4 h-4 mr-3 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                123 Motorcycle Lane, Bike City, BC 12345
              </p>
              <p className="flex items-center text-sm">
                <svg className="w-4 h-4 mr-3 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                (555) 123-4567
              </p>
              <p className="flex items-center text-sm">
                <svg className="w-4 h-4 mr-3 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                info@sardaarjiautoparts.com
              </p>
            </address>
          </div>
        </div>

        <div className="border-t border-slate-700 mt-8 pt-6 text-center">
          <p className="text-slate-400 text-sm">
            &copy; {currentYear} ModParts. All rights reserved. |
            <span className="text-emerald-400 ml-1">Quality Parts, Trusted Service</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
