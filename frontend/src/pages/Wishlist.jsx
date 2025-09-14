import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { processImageUrl, handleImageError } from '../utils/imageHelper';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PlaceholderImage from '../components/ui/PlaceholderImage';

const Wishlist = () => {
  const { wishlist, loading, error, removeItem, moveItemToCart } = useWishlist();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [movingToCart, setMovingToCart] = useState({});

  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">My Wishlist</h1>
          <p className="text-gray-600 mb-6">Please login to view your wishlist</p>
          <Link 
            to="/login" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  const handleMoveToCart = async (item, quantity = 1) => {
    setMovingToCart(prev => ({ ...prev, [item.product_id]: true }));
    
    try {
      // Use the cart context to add the item
      await addToCart(item.products, quantity);
      // Remove from wishlist
      await removeItem(item.product_id, item.products.name);
    } catch (error) {
      console.error('Error moving to cart:', error);
    } finally {
      setMovingToCart(prev => ({ ...prev, [item.product_id]: false }));
    }
  };

  const handleRemoveFromWishlist = async (item) => {
    await removeItem(item.product_id, item.products.name);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <LoadingSpinner size="xl" text="Loading your wishlist..." variant="gear" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Wishlist</h1>
        <div className="text-gray-600">
          {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {wishlist.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-6">
            <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-600 mb-4">Your wishlist is empty</h2>
          <p className="text-gray-500 mb-6">
            Start adding items to your wishlist by clicking the heart icon on products you love!
          </p>
          <Link 
            to="/products" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.filter(item => item && item.id && item.products && item.products.name).map((item) => (
            <div key={item.id} className="card-interactive overflow-hidden">
              <div className="relative">
                <Link to={`/products/${item.product_id}`}>
                  <PlaceholderImage
                    src={processImageUrl(item.products?.image_url)}
                    alt={item.products?.name}
                    className="w-full h-48 object-cover"
                    placeholderText="No Image Available"
                  />
                </Link>
                <button
                  onClick={() => handleRemoveFromWishlist(item)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                  title="Remove from wishlist"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="p-4">
                <Link to={`/products/${item.product_id}`}>
                  <h3 className="font-semibold text-lg mb-2 hover:text-blue-600 transition-colors">
                    {item.products.name}
                  </h3>
                </Link>
                
                <p className="text-gray-600 text-sm mb-2">
                  {item.products.categories?.name}
                </p>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-blue-600">
                    ${parseFloat(item.products.price).toFixed(2)}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    item.products.quantity > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.products.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleMoveToCart(item)}
                    disabled={item.products.quantity === 0 || movingToCart[item.product_id]}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      item.products.quantity === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {movingToCart[item.product_id] ? (
                      <div className="flex items-center justify-center">
                        <LoadingSpinner size="sm" showText={false} variant="gear" />
                        <span className="ml-2">Moving to Cart...</span>
                      </div>
                    ) : (
                      'Move to Cart'
                    )}
                  </button>
                  
                  <Link
                    to={`/products/${item.product_id}`}
                    className="block w-full py-2 px-4 border border-gray-300 rounded-lg text-center text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    View Details
                  </Link>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  Added {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
