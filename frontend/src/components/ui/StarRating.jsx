// Star Rating Component
// Displays and allows interaction with star ratings

import { useState } from 'react';

const StarRating = ({ 
  rating = 0, 
  maxRating = 5, 
  size = 'md', 
  interactive = false, 
  onChange = null,
  showValue = false,
  className = '',
  precision = 1 // 1 for whole stars, 0.5 for half stars
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [tempRating, setTempRating] = useState(rating);

  // Size configurations
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const starSize = sizeClasses[size] || sizeClasses.md;
  const textSize = textSizeClasses[size] || textSizeClasses.md;

  const handleStarClick = (starValue) => {
    if (!interactive || !onChange) return;
    
    setTempRating(starValue);
    onChange(starValue);
  };

  const handleStarHover = (starValue) => {
    if (!interactive) return;
    setHoverRating(starValue);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setHoverRating(0);
  };

  const getStarFillPercentage = (starIndex) => {
    const currentRating = interactive && hoverRating > 0 ? hoverRating : (tempRating || rating);
    const starValue = starIndex + 1;
    
    if (currentRating >= starValue) {
      return 100; // Fully filled
    } else if (currentRating > starIndex && currentRating < starValue) {
      // Partially filled
      const percentage = (currentRating - starIndex) * 100;
      return Math.min(100, Math.max(0, percentage));
    } else {
      return 0; // Empty
    }
  };

  const renderStar = (index) => {
    const fillPercentage = getStarFillPercentage(index);
    const starValue = index + 1;
    const isClickable = interactive && onChange;
    
    return (
      <div
        key={index}
        className={`relative inline-block ${isClickable ? 'cursor-pointer' : ''}`}
        onClick={() => handleStarClick(starValue)}
        onMouseEnter={() => handleStarHover(starValue)}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background star (empty) */}
        <svg
          className={`${starSize} text-gray-300`}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        
        {/* Foreground star (filled) */}
        {fillPercentage > 0 && (
          <div
            className="absolute top-0 left-0 overflow-hidden"
            style={{ width: `${fillPercentage}%` }}
          >
            <svg
              className={`${starSize} text-yellow-400`}
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        )}
      </div>
    );
  };

  const displayRating = interactive && hoverRating > 0 ? hoverRating : (tempRating || rating);

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Stars */}
      <div className="flex items-center space-x-0.5">
        {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
      </div>
      
      {/* Rating value */}
      {showValue && (
        <span className={`ml-2 font-medium text-[#D4CFC0] ${textSize}`}>
          {displayRating > 0 ? displayRating.toFixed(1) : '0.0'}
        </span>
      )}
    </div>
  );
};

// Rating Display Component (read-only with count)
export const RatingDisplay = ({ 
  rating = 0, 
  reviewCount = 0, 
  size = 'md',
  showCount = true,
  className = '' 
}) => {
  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const textSize = textSizeClasses[size] || textSizeClasses.md;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <StarRating 
        rating={rating} 
        size={size} 
        interactive={false} 
        showValue={true}
      />
      {showCount && (
        <span className={`text-[#A8A090] ${textSize}`}>
          ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
};

// Rating Input Component (for forms)
export const RatingInput = ({ 
  value = 0, 
  onChange, 
  size = 'lg', 
  required = false, 
  error = null, 
  label = 'Rating',
  className = '' 
}) => {
  const [localValue, setLocalValue] = useState(value);

  const handleChange = (newRating) => {
    setLocalValue(newRating);
    if (onChange) {
      onChange(newRating);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-[#D4CFC0]">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      
      <div className="flex items-center space-x-3">
        <StarRating 
          rating={localValue} 
          size={size} 
          interactive={true} 
          onChange={handleChange}
          showValue={false}
        />
        <span className="text-sm text-[#A8A090]">
          {localValue > 0 ? `${localValue} star${localValue > 1 ? 's' : ''}` : 'Click to rate'}
        </span>
      </div>
      
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
};

// Rating Distribution Component
export const RatingDistribution = ({ 
  distribution = {}, 
  totalReviews = 0,
  className = '' 
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {[5, 4, 3, 2, 1].map(rating => {
        const count = distribution[rating] || 0;
        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
        
        return (
          <div key={rating} className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 w-12">
              <span className="text-sm font-medium text-[#F5F0E1]">{rating}</span>
              <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            
            <div className="flex-1 bg-[#333] rounded-full h-2">
              <div 
                className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            <span className="text-sm text-[#A8A090] w-8 text-right">{count}</span>
          </div>
        );
      })}
    </div>
  );
};

export default StarRating;
