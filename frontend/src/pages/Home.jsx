import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../api/products';
import { getCategories } from '../api/categories';
import { processImageUrl } from '../utils/imageHelper'
import LoadingSpinner from '../components/ui/LoadingSpinner';
import WishlistButton from '../components/ui/WishlistButton';
import PlaceholderImage from '../components/ui/PlaceholderImage';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const getCategoryImagePath = (categoryName) => {
    if (!categoryName) return null;
    const filename = categoryName.toLowerCase().replace(/\s+/g, '-');
    return `/images/categories/${filename}.jpg`;
  };

  const handleCategoryImageError = (e) => {
    e.target.style.display = 'none';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getProducts({ limit: 100 });
        const productsData = result.products || result;
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
    <div className="bg-[#1a1a1a]">
      {/* Hero Section */}
      <section
        className="relative py-24 mb-12 overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(rgba(26,26,26,0.6), rgba(26,26,26,0.9)), url(/images/login-motorcycle.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="container mx-auto px-4 text-center relative z-10">
          {/* Logo */}
          <div className="mb-8">
            <img
              src="/images/vintage-logo.png"
              alt="Vintage Yamaha Parts"
              className="h-40 md:h-52 w-auto mx-auto drop-shadow-2xl"
            />
          </div>

          <h1
            className="text-5xl md:text-7xl font-bold mb-6 text-[#F5F0E1] uppercase tracking-wider"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Vintage Yamaha Parts
          </h1>
          <p
            className="text-xl mb-10 text-[#D4CFC0] max-w-2xl mx-auto"
            style={{ fontFamily: "'Roboto Slab', serif" }}
          >
            Authentic parts for classic Yamaha motorcycles. RD, DT, and more.
          </p>
          <Link
            to="/products"
            className="btn-vintage-red inline-flex items-center space-x-3 text-lg px-10 py-5"
          >
            <span style={{ fontFamily: "'Oswald', sans-serif" }}>Browse Parts Catalog</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Categories Section */}
      <section className="mb-16 px-4">
        <h2
          className="text-3xl font-bold mb-10 text-center text-[#F5F0E1] uppercase tracking-wider"
          style={{ fontFamily: "'Oswald', sans-serif" }}
        >
          Shop by Category
        </h2>
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
                className="relative overflow-hidden rounded-lg text-center hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl group min-h-[200px] flex flex-col border border-[#333]"
              >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#2d2d2d] to-[#1a1a1a]">
                  <img
                    src={getCategoryImagePath(category.name)}
                    alt={`${category.name} category`}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300"
                    onError={handleCategoryImageError}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a]/90 via-[#1a1a1a]/50 to-transparent group-hover:from-[#1a1a1a]/80 transition-all duration-300" />
                </div>

                {/* Content */}
                <div className="relative z-10 p-6 flex flex-col justify-end h-full">
                  <div className="transform group-hover:translate-y-[-4px] transition-transform duration-300">
                    <h3
                      className="text-lg md:text-xl font-bold mb-2 text-[#F5F0E1] uppercase tracking-wide"
                      style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                      {category.name}
                    </h3>
                    <p className="text-[#A8A090] text-xs md:text-sm line-clamp-2">
                      {category.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Products Section */}
      <section className="mb-16 px-4">
        <h2
          className="text-3xl font-bold mb-10 text-center text-[#F5F0E1] uppercase tracking-wider"
          style={{ fontFamily: "'Oswald', sans-serif" }}
        >
          Featured Parts
        </h2>
        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner size="lg" text="Loading featured products..." variant="gear" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.filter(product => product && product.id && product.name).map(product => (
              <div key={product.id} className="bg-[#242424] border border-[#333] rounded-lg overflow-hidden group hover:border-[#8B2332] transition-all duration-300">
                <div className="h-48 relative">
                  <PlaceholderImage
                    src={processImageUrl(product.image_url)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    placeholderText="No Image"
                  />
                  <div className="absolute top-2 right-2">
                    <WishlistButton product={product} size="md" variant="icon" />
                  </div>
                </div>
                <div className="p-6">
                  <h3
                    className="text-lg font-semibold mb-2 text-[#F5F0E1] group-hover:text-[#B8860B] transition-colors uppercase"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    {product.name}
                  </h3>
                  <p className="text-[#A8A090] mb-4 text-sm">{product.category_name}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[#8B2332] font-bold text-xl">${parseFloat(product.price).toFixed(2)}</span>
                    <Link
                      to={`/products/${product.id}`}
                      className="btn-vintage-gray px-4 py-2 text-sm"
                    >
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
            className="btn-vintage-gray inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span style={{ fontFamily: "'Oswald', sans-serif" }}>View All Parts</span>
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-[#242424] py-16 px-4 border-t border-b border-[#333]">
        <div className="container mx-auto">
          <h2
            className="text-3xl font-bold mb-8 text-center text-[#F5F0E1] uppercase tracking-wider"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            About Vintage Yamaha Parts
          </h2>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg mb-6 text-[#D4CFC0] leading-relaxed" style={{ fontFamily: "'Roboto Slab', serif" }}>
              We specialize in providing authentic parts for classic Yamaha motorcycles.
              Whether you're restoring a vintage RD350 or maintaining your classic DT, we have the parts you need.
            </p>
            <p className="text-lg mb-6 text-[#D4CFC0] leading-relaxed" style={{ fontFamily: "'Roboto Slab', serif" }}>
              Our inventory includes genuine OEM parts and quality aftermarket alternatives,
              ensuring you can find exactly what you need at competitive prices.
            </p>
            <p className="text-lg text-[#D4CFC0] leading-relaxed" style={{ fontFamily: "'Roboto Slab', serif" }}>
              With over 15 years of experience in the vintage motorcycle parts industry, we pride ourselves on our knowledge,
              customer service, and fast worldwide shipping.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
