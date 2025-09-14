import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchProducts } from '../../api/products';

const SearchAutocomplete = ({ 
  placeholder = "Search products...", 
  className = "",
  onSearch,
  initialValue = ""
}) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced search function
  const debouncedSearch = async (searchQuery) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchProducts(searchQuery);
      // Limit to 8 suggestions and add unique key
      const limitedResults = results.slice(0, 8).map(product => ({
        ...product,
        searchKey: `${product.id}-${product.name}`
      }));
      setSuggestions(limitedResults);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      debouncedSearch(value);
    }, 300); // 300ms delay
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query.trim());
    }
  };

  // Perform search and navigate
  const performSearch = (searchQuery) => {
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (product) => {
    setQuery(product.name);
    setShowSuggestions(false);
    navigate(`/products/${product.id}`);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target) &&
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="flex">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className="w-full px-3 py-2 text-black rounded-l-md border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 pr-8"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            autoComplete="off"
          />
          
          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              title="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <button
          type="submit"
          className="bg-blue-600 px-3 py-2 rounded-r-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 flex items-center justify-center"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 card border border-slate-600 shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {suggestions.map((product, index) => (
            <div
              key={product.searchKey}
              className={`p-3 cursor-pointer border-b border-slate-600 last:border-b-0 hover:bg-slate-700 text-slate-100 ${
                index === selectedIndex ? 'bg-emerald-600' : ''
              }`}
              onClick={() => handleSuggestionClick(product)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded flex-shrink-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {product.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    ${parseFloat(product.price).toFixed(2)}
                  </p>
                  {product.quantity <= 0 && (
                    <p className="text-xs text-red-500">Out of stock</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
