import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProductById } from '../api/products';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { processImageUrl, handleImageError } from '../utils/imageHelper';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import WishlistButton from '../components/ui/WishlistButton';
import PlaceholderImage from '../components/ui/PlaceholderImage';
import ProductReviews from '../components/product/ProductReviews';
import { RatingDisplay } from '../components/ui/StarRating';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, error: cartError } = useCart();
  const { success, error: showError } = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);

  // Handle cart errors
  useEffect(() => {
    if (cartError) {
      showError(cartError);
    }
  }, [cartError, showError]);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const data = await getProductById(id);
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
        setError(error.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value <= product.quantity) {
      setQuantity(value);
    }
  };

  const handleAddToCart = async () => {
    if (addingToCart) return; // Prevent double-clicks

    setAddingToCart(true);
    try {
      await addToCart(product, quantity);
      success(`${quantity} ${product.name} added to cart!`);
    } catch (error) {
      // Show the specific error message from the cart context
      const errorMessage = cartError || error.message || 'Failed to add item to cart';
      showError(errorMessage);
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (buyingNow) return; // Prevent double-clicks

    setBuyingNow(true);
    try {
      await addToCart(product, quantity);
      navigate('/cart');
    } catch (error) {
      // Show the specific error message from the cart context
      const errorMessage = cartError || error.message || 'Failed to add item to cart';
      showError(errorMessage);
      console.error('Failed to add to cart for buy now:', error);
    } finally {
      setBuyingNow(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner size="xl" text="Loading product details..." variant="gear" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/products" className="text-blue-600 hover:underline">
          Back to Products
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-xl mb-4">Product not found</p>
        <Link to="/products" className="text-blue-600 hover:underline">
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-[#1a1a1a] min-h-screen">
      <div className="mb-6">
        <Link to="/products" className="text-[#B8860B] hover:text-[#d4a50d] flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Parts Catalog
        </Link>
      </div>

      <div className="bg-[#242424] border border-[#333] rounded-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2 h-64 md:h-auto bg-[#333]">
            <PlaceholderImage
              src={processImageUrl(product.image_url)}
              alt={product.name}
              className="w-full h-full object-contain"
              placeholderText="No Image Available"
            />
          </div>

          <div className="md:w-1/2 p-6">
            <div className="mb-4">
              <h1
                className="text-3xl font-bold mb-2 text-[#F5F0E1] uppercase"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {product.name}
              </h1>
              <div className="mb-2">
                <RatingDisplay
                  rating={4.5}
                  reviewCount={0}
                  size="md"
                />
              </div>
              <p className="text-[#A8A090]">Category: {product.category_name}</p>
            </div>

            <div className="mb-6">
              <div className="flex items-center mb-2">
                <span className="bg-[#8B2332] text-[#F5F0E1] px-3 py-1 rounded-full text-sm font-semibold mr-3">
                  {product.condition_status}
                </span>
                <span className={`text-sm font-semibold ${product.quantity > 0 ? 'text-[#B8860B]' : 'text-red-400'}`}>
                  {product.quantity > 0 ? '✅ Available' : '❌ Out of stock'}
                </span>
              </div>

              <p className="text-3xl font-bold text-[#8B2332]">
                ${parseFloat(product.price).toFixed(2)}
              </p>
            </div>

            <div className="mb-6">
              <h2
                className="text-xl font-semibold mb-2 text-[#F5F0E1]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                Description
              </h2>
              <p className="text-[#D4CFC0]" style={{ fontFamily: "'Roboto Slab', serif" }}>{product.description}</p>
            </div>

            {product.quantity > 0 && (
              <div className="mb-6">
                <label className="block text-[#D4CFC0] mb-2">Quantity</label>
                <div className="flex items-center">
                  <button
                    className="bg-[#333] text-[#F5F0E1] px-3 py-1 rounded-l hover:bg-[#444] transition-colors"
                    onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={product.quantity}
                    value={quantity}
                    onChange={handleQuantityChange}
                    className="form-input-vintage w-16 text-center border-t border-b border-[#444] py-1 rounded-none"
                  />
                  <button
                    className="bg-[#333] text-[#F5F0E1] px-3 py-1 rounded-r hover:bg-[#444] transition-colors"
                    onClick={() => quantity < product.quantity && setQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={handleAddToCart}
                className={`btn-vintage-red flex items-center justify-center ${product.quantity <= 0 || addingToCart
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                  }`}
                disabled={product.quantity <= 0 || addingToCart}
              >
                {addingToCart ? (
                  <>
                    {/* Gear spinning animation */}
                    <svg
                      className="animate-spin h-5 w-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Add to Cart
                  </>
                )}
              </button>

              {/* Wishlist Button */}
              <WishlistButton
                product={product}
                size="lg"
                variant="button"
                className="flex-shrink-0"
              />
              <button
                onClick={handleBuyNow}
                className={`btn-vintage-gray flex items-center justify-center ${product.quantity <= 0 || buyingNow
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                  }`}
                disabled={product.quantity <= 0 || buyingNow}
              >
                {buyingNow ? (
                  <>
                    {/* Gear spinning animation */}
                    <svg
                      className="animate-spin h-5 w-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Buy Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Reviews Section */}
      <div className="mt-12">
        <ProductReviews
          productId={product.id}
          productName={product.name}
        />
      </div>
    </div>
  );
};

export default ProductDetail;
