import React from 'react';

const AutoPartsLoader = ({ 
  size = 'md', 
  text = 'Loading...', 
  showText = true, 
  className = '',
  variant = 'multi-gear' // 'multi-gear', 'engine', 'wrench'
}) => {
  // Size configurations
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  // Multi-gear animation component
  const MultiGearLoader = ({ className }) => (
    <div className={`relative ${className}`}>
      {/* Main gear */}
      <svg 
        className="absolute inset-0 w-full h-full text-blue-600 animate-spin"
        style={{ animationDuration: '3s' }}
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"
          fill="currentColor"
        />
      </svg>
      
      {/* Small gear top-right */}
      <svg 
        className="absolute top-0 right-0 w-1/3 h-1/3 text-gray-500 animate-spin"
        style={{ animationDuration: '2s', animationDirection: 'reverse' }}
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"
          fill="currentColor"
        />
      </svg>
      
      {/* Small gear bottom-left */}
      <svg 
        className="absolute bottom-0 left-0 w-1/4 h-1/4 text-orange-500 animate-spin"
        style={{ animationDuration: '1.5s' }}
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );

  // Engine block animation
  const EngineLoader = ({ className }) => (
    <div className={`${className} text-blue-600`}>
      <svg 
        className="w-full h-full animate-pulse"
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 6h16v2H4V6zm0 4h16v8H4v-8zm2 2v4h12v-4H6zm-2 6h16v2H4v-2z"
          fill="currentColor"
        />
        <circle cx="7" cy="14" r="1" fill="white" />
        <circle cx="17" cy="14" r="1" fill="white" />
      </svg>
    </div>
  );

  // Wrench animation
  const WrenchLoader = ({ className }) => (
    <div className={`${className} text-blue-600`}>
      <svg 
        className="w-full h-full animate-spin"
        style={{ animationDuration: '4s' }}
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"
          fill="currentColor"
        />
      </svg>
    </div>
  );

  // Render the appropriate loader based on variant
  const renderLoader = () => {
    const loaderClass = sizeClasses[size];
    
    switch (variant) {
      case 'multi-gear':
        return <MultiGearLoader className={loaderClass} />;
      case 'engine':
        return <EngineLoader className={loaderClass} />;
      case 'wrench':
        return <WrenchLoader className={loaderClass} />;
      default:
        return <MultiGearLoader className={loaderClass} />;
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {renderLoader()}
      {showText && (
        <p className={`text-gray-600 font-medium ${textSizeClasses[size]} text-center`}>
          {text}
        </p>
      )}
    </div>
  );
};

// Full-screen auto parts loading overlay
export const AutoPartsOverlay = ({ 
  isVisible, 
  text = 'Processing your auto parts request...', 
  variant = 'multi-gear',
  backdrop = true 
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {backdrop && <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm"></div>}
      <div className="relative card-elevated p-8 max-w-sm mx-4">
        <AutoPartsLoader
          size="lg"
          text={text}
          variant={variant}
          className="text-center"
        />
      </div>
    </div>
  );
};

export default AutoPartsLoader;
