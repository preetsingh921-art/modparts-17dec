import { useState } from 'react';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const WishlistButton = ({ 
  product, 
  size = 'md', 
  variant = 'icon', // 'icon', 'button', 'text'
  className = '' 
}) => {
  const { isInWishlist, addItem, removeItem } = useWishlist();
  const { isAuthenticated } = useAuth();
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(false);

  const inWishlist = isAuthenticated() ? isInWishlist(product.id) : false;

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated()) {
      showError('Please login to add items to your wishlist');
      return;
    }

    setLoading(true);

    try {
      if (inWishlist) {
        await removeItem(product.id, product.name);
      } else {
        await addItem(product);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  // Size configurations
  const sizeClasses = {
    sm: 'w-6 h-6 p-1',
    md: 'w-8 h-8 p-1.5',
    lg: 'w-10 h-10 p-2',
    xl: 'w-12 h-12 p-2.5'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7'
  };

  const textSizes = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-2',
    lg: 'text-lg px-4 py-2',
    xl: 'text-xl px-5 py-3'
  };

  // Heart icon component
  const HeartIcon = ({ filled, className }) => (
    <svg 
      className={className} 
      fill={filled ? "currentColor" : "none"} 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
      />
    </svg>
  );

  // Loading spinner for small sizes
  const LoadingSpinner = ({ className }) => (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggleWishlist}
        disabled={loading}
        className={`
          ${sizeClasses[size]}
          ${inWishlist
            ? 'text-red-500 hover:text-red-600'
            : 'text-gray-400 hover:text-red-500'
          }
          ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          transition-colors duration-200 rounded-full hover:bg-gray-800/50
          ${className}
        `}
        title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        {loading ? (
          <LoadingSpinner className={iconSizes[size]} />
        ) : (
          <HeartIcon filled={inWishlist} className={iconSizes[size]} />
        )}
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={handleToggleWishlist}
        disabled={loading}
        className={`
          ${textSizes[size]}
          ${inWishlist
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          }
          ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2
          ${className}
        `}
      >
        {loading ? (
          <LoadingSpinner className="w-4 h-4" />
        ) : (
          <HeartIcon filled={inWishlist} className="w-4 h-4" />
        )}
        <span>
          {loading 
            ? 'Processing...' 
            : inWishlist 
              ? 'Remove from Wishlist' 
              : 'Add to Wishlist'
          }
        </span>
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleToggleWishlist}
        disabled={loading}
        className={`
          ${textSizes[size]}
          ${inWishlist
            ? 'text-red-500 hover:text-red-600'
            : 'text-gray-400 hover:text-red-500'
          }
          ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          transition-colors duration-200 flex items-center space-x-1
          ${className}
        `}
      >
        {loading ? (
          <LoadingSpinner className="w-4 h-4" />
        ) : (
          <HeartIcon filled={inWishlist} className="w-4 h-4" />
        )}
        <span>
          {loading 
            ? 'Processing...' 
            : inWishlist 
              ? 'In Wishlist' 
              : 'Add to Wishlist'
          }
        </span>
      </button>
    );
  }

  return null;
};

export default WishlistButton;
