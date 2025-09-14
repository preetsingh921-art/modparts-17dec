import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../api/products';
import { getCategories } from '../api/categories';
import { processImageUrl, handleImageError } from '../utils/imageHelper'
import LoadingSpinner from '../components/ui/LoadingSpinner';
import WishlistButton from '../components/ui/WishlistButton';
import PlaceholderImage from '../components/ui/PlaceholderImage';
import { useLogo } from '../context/LogoContext';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { logo } = useLogo();

  // Function to get category image path
  const getCategoryImagePath = (categoryName) => {
    if (!categoryName) return null;
    // Convert category name to lowercase and replace spaces with hyphens for filename
    const filename = categoryName.toLowerCase().replace(/\s+/g, '-');
    return `/images/categories/${filename}.jpg`;
  };

  // Function to handle image load error
  const handleCategoryImageError = (e) => {
    // Hide the image if it fails to load
    e.target.style.display = 'none';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getProducts({ limit: 100 }); // Get more products for better random selection
        const productsData = result.products || result; // Handle both old and new API format

        // Get 4 random products as featured
        const randomProducts = productsData
          .sort(() => 0.5 - Math.random())
          .slice(0, 4);
        setFeaturedProducts(randomProducts);

        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="backdrop-hero text-slate-100 py-20 rounded-2xl mb-12 relative overflow-hidden border border-slate-700 shadow-large">

        <div className="container mx-auto px-4 text-center relative z-10">
          {/* Logo */}
          {logo && (
            <div className="mb-8">
              <img
                src={logo}
                alt="ModParts Logo"
                className="h-20 w-auto mx-auto"
              />
            </div>
          )}
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-slate-100 to-emerald-400 bg-clip-text text-transparent">
            ModParts
          </h1>
          <p className="text-xl mb-10 text-slate-300 max-w-2xl mx-auto">Quality auto parts for all vehicle makes and models</p>
          <Link
            to="/products"
            className="btn-primary inline-flex items-center space-x-2 text-lg px-8 py-4"
          >
            <span>Shop Now</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Categories Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-10 text-center text-slate-100">Shop by Category</h2>
        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner size="lg" text="Loading categories..." variant="gear" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {categories.filter(category => category && category.id && category.name).map(category => (
              <Link
                key={category.id}
                to={`/products/category/${category.id}`}
                className="relative overflow-hidden rounded-2xl text-center hover:scale-105 transition-all duration-300 shadow-medium hover:shadow-large group min-h-[200px] flex flex-col"
              >
                {/* Backdrop Image */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-emerald-800">
                  <img
                    src={getCategoryImagePath(category.name)}
                    alt={`${category.name} category`}
                    className="w-full h-full object-cover opacity-75 group-hover:opacity-85 transition-opacity duration-300"
                    onError={handleCategoryImageError}
                  />
                  {/* Overlay for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/30 to-slate-900/40 group-hover:from-slate-900/60 group-hover:via-slate-900/20 group-hover:to-slate-900/30 transition-all duration-300"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 p-6 flex flex-col justify-end h-full text-white">
                  <div className="transform group-hover:translate-y-[-4px] transition-transform duration-300">
                    <h3 className="text-lg md:text-xl font-bold mb-2 drop-shadow-lg leading-tight">{category.name}</h3>
                    <p className="text-slate-200 text-xs md:text-sm drop-shadow-md opacity-90 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2">
                      {category.description}
                    </p>
                  </div>

                  {/* Hover indicator */}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Products Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-10 text-center text-slate-100">Featured Products</h2>
        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner size="lg" text="Loading featured products..." variant="gear" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.filter(product => product && product.id && product.name).map(product => (
              <div key={product.id} className="card-interactive group overflow-hidden">
                <div className="h-48 relative">
                  <PlaceholderImage
                    src={processImageUrl(product.image_url)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    placeholderText="No Image Available"
                  />
                  {/* Wishlist Button Overlay */}
                  <div className="absolute top-2 right-2">
                    <WishlistButton product={product} size="md" variant="icon" />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2 text-slate-100 group-hover:text-emerald-400 transition-colors">{product.name}</h3>
                  <p className="text-slate-400 mb-4 text-sm">{product.category_name}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-400 font-bold text-xl">${parseFloat(product.price).toFixed(2)}</span>
                    <Link
                      to={`/products/${product.id}`}
                      className="btn-primary flex items-center text-sm px-4 py-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="text-center mt-12">
          <Link
            to="/products"
            className="btn-secondary inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            View All Products
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section className="card py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center text-slate-100">About Sardaarji Auto Parts</h2>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg mb-6 text-slate-300 leading-relaxed">
              We specialize in providing high-quality auto parts for all vehicle makes and models.
              Whether you're maintaining your daily driver or working on a restoration project, we have the parts you need.
            </p>
            <p className="text-lg mb-6 text-slate-300 leading-relaxed">
              Our inventory includes both new and carefully inspected used parts, ensuring you can find exactly what you need
              for your project at competitive prices.
            </p>
            <p className="text-lg text-slate-300 leading-relaxed">
              With over 15 years of experience in the motorcycle parts industry, we pride ourselves on our knowledge,
              customer service, and fast shipping.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
