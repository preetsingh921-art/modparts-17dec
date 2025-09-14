import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Loading...', 
  showText = true, 
  className = '',
  variant = 'gear' // 'gear', 'simple', 'dots'
}) => {
  // Size configurations
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  // Gear SVG Component
  const GearIcon = ({ className }) => (
    <svg 
      className={className}
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"
        fill="currentColor"
      />
    </svg>
  );

  // Simple spinner component
  const SimpleSpinner = ({ className }) => (
    <div className={`${className} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}></div>
  );

  // Dots spinner component
  const DotsSpinner = ({ className }) => (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );

  // Render the appropriate spinner based on variant
  const renderSpinner = () => {
    const spinnerClass = `${sizeClasses[size]} text-blue-600`;
    
    switch (variant) {
      case 'gear':
        return <GearIcon className={`${spinnerClass} animate-spin`} />;
      case 'simple':
        return <SimpleSpinner className={spinnerClass} />;
      case 'dots':
        return <DotsSpinner className={spinnerClass} />;
      default:
        return <GearIcon className={`${spinnerClass} animate-spin`} />;
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderSpinner()}
      {showText && (
        <p className={`text-gray-600 font-medium ${textSizeClasses[size]}`}>
          {text}
        </p>
      )}
    </div>
  );
};

// Full-screen loading overlay component
export const LoadingOverlay = ({ 
  isVisible, 
  text = 'Loading...', 
  variant = 'gear',
  backdrop = true 
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {backdrop && <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm"></div>}
      <div className="relative card-elevated p-8">
        <LoadingSpinner
          size="lg"
          text={text}
          variant={variant}
          className="text-center"
        />
      </div>
    </div>
  );
};

// Inline loading component for smaller spaces
export const InlineLoader = ({ 
  text = 'Loading...', 
  variant = 'gear',
  size = 'sm' 
}) => (
  <div className="flex items-center space-x-2">
    <LoadingSpinner 
      size={size} 
      text="" 
      showText={false} 
      variant={variant}
    />
    <span className="text-gray-600 text-sm">{text}</span>
  </div>
);

export default LoadingSpinner;
