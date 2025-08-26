import { Link } from 'react-router-dom';
import { useLogo } from '../../context/LogoContext';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { logo } = useLogo();

  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              {logo && (
                <img
                  src={logo}
                  alt="ModParts Logo"
                  className="h-8 w-auto filter brightness-0 invert"
                />
              )}
              <h3 className="text-xl font-bold">ModParts</h3>
            </div>
            <p className="text-gray-300">
              Your one-stop shop for quality automobile parts.
              We specialize in premium auto parts for all vehicle makes and models.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Contact Us</h3>
            <address className="not-italic text-gray-300">
              <p>123 Motorcycle Lane</p>
              <p>Bike City, BC 12345</p>
              <p className="mt-2">Phone: (555) 123-4567</p>
              <p>Email: info@sardaarjiautoparts.com</p>
            </address>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400">
          <p>&copy; {currentYear} ModParts. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
