import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import SearchAutocomplete from '../ui/SearchAutocomplete';

const Header = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { getItemCount } = useCart();
  const { getWishlistCount } = useWishlist();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-[#1a1a1a] text-[#F5F0E1] shadow-lg sticky top-0 z-50 border-b-2 border-[#8B2332]">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity group">
              <img
                src="/images/vintage-logo.png"
                alt="Vintage Yamaha Parts"
                className="h-14 w-auto"
              />
              <div className="hidden sm:block">
                <span className="text-xl font-bold tracking-wide" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  VINTAGE YAMAHA
                </span>
                <span className="block text-xs text-[#B8860B] tracking-widest" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  MOTORCYCLE PARTS
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            <nav className="flex items-center space-x-2">
              <Link
                to="/"
                className="px-4 py-2 rounded-lg font-semibold uppercase tracking-wide text-sm hover:bg-[#8B2332] hover:text-white transition-all duration-200"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                Home
              </Link>
              <Link
                to="/products"
                className="px-4 py-2 rounded-lg font-semibold uppercase tracking-wide text-sm hover:bg-[#8B2332] hover:text-white transition-all duration-200"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                Parts Catalog
              </Link>
              {isAuthenticated() && (
                <Link
                  to="/orders"
                  className="px-4 py-2 rounded-lg font-semibold uppercase tracking-wide text-sm hover:bg-[#8B2332] hover:text-white transition-all duration-200"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  My Orders
                </Link>
              )}
              {isAdmin() && (
                <Link
                  to="/admin"
                  className="px-4 py-2 rounded-lg font-semibold uppercase tracking-wide text-sm bg-[#B8860B] hover:bg-[#996f09] text-white transition-all duration-200"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  Admin
                </Link>
              )}
            </nav>

            {/* Search */}
            <SearchAutocomplete
              placeholder="Search parts..."
              className="w-48"
            />

            {/* Cart, Wishlist and User */}
            <div className="flex items-center space-x-3">
              {/* Wishlist */}
              {isAuthenticated() && (
                <Link to="/wishlist" className="relative p-2 hover:bg-[#333] rounded-lg transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {getWishlistCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#8B2332] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {getWishlistCount()}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart */}
              <Link to="/cart" className="relative p-2 hover:bg-[#333] rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {getItemCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#8B2332] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getItemCount()}
                  </span>
                )}
              </Link>

              {/* User Actions */}
              {isAuthenticated() ? (
                <div className="flex items-center space-x-2">
                  <Link to="/profile" className="px-3 py-2 rounded-lg hover:bg-[#333] transition-colors text-sm">
                    Hi, {user.first_name}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 rounded-lg hover:bg-[#8B2332] transition-colors text-sm"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="btn-vintage-red px-4 py-2 text-sm"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-[#333] transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} border-t border-[#333] pb-4`}>
          <div className="px-2 pt-2 space-y-1">
            <Link
              to="/"
              className="block px-4 py-3 rounded-lg hover:bg-[#333] font-semibold uppercase tracking-wide"
              onClick={() => setIsMenuOpen(false)}
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Home
            </Link>
            <Link
              to="/products"
              className="block px-4 py-3 rounded-lg hover:bg-[#333] font-semibold uppercase tracking-wide"
              onClick={() => setIsMenuOpen(false)}
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Parts Catalog
            </Link>
            {isAuthenticated() && (
              <>
                <Link
                  to="/orders"
                  className="block px-4 py-3 rounded-lg hover:bg-[#333] font-semibold uppercase tracking-wide"
                  onClick={() => setIsMenuOpen(false)}
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  My Orders
                </Link>
                <Link
                  to="/wishlist"
                  className="block px-4 py-3 rounded-lg hover:bg-[#333] font-semibold uppercase tracking-wide"
                  onClick={() => setIsMenuOpen(false)}
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  Wishlist ({getWishlistCount()})
                </Link>
              </>
            )}
            <Link
              to="/cart"
              className="block px-4 py-3 rounded-lg hover:bg-[#333] font-semibold uppercase tracking-wide"
              onClick={() => setIsMenuOpen(false)}
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Cart ({getItemCount()})
            </Link>
            {isAdmin() && (
              <Link
                to="/admin"
                className="block px-4 py-3 rounded-lg bg-[#B8860B] hover:bg-[#996f09] font-semibold uppercase tracking-wide"
                onClick={() => setIsMenuOpen(false)}
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                Admin Panel
              </Link>
            )}

            {/* Mobile Search */}
            <div className="pt-2">
              <SearchAutocomplete placeholder="Search parts..." className="w-full" />
            </div>

            {/* Mobile Auth */}
            <div className="pt-2 border-t border-[#333]">
              {isAuthenticated() ? (
                <>
                  <Link
                    to="/profile"
                    className="block px-4 py-3 rounded-lg hover:bg-[#333]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile ({user.first_name})
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 rounded-lg hover:bg-[#8B2332] text-[#F5F0E1]"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block px-4 py-3 rounded-lg bg-[#8B2332] hover:bg-[#9B3342] font-semibold uppercase tracking-wide text-center"
                    onClick={() => setIsMenuOpen(false)}
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block px-4 py-3 mt-2 rounded-lg border border-[#8B2332] hover:bg-[#8B2332] font-semibold uppercase tracking-wide text-center"
                    onClick={() => setIsMenuOpen(false)}
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
