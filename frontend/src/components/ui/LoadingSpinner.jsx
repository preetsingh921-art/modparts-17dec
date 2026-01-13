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

  // Dual Gear Component - Three interlocking gears with gradient colors matching site theme
  const DualGearIcon = () => {
    const gearSizes = {
      sm: { container: 50, large: 32, small: 24, tiny: 18 },
      md: { container: 80, large: 48, small: 36, tiny: 28 },
      lg: { container: 100, large: 60, small: 45, tiny: 35 },
      xl: { container: 130, large: 80, small: 60, tiny: 45 }
    };
    const sizes = gearSizes[size] || gearSizes.md;

    // SVG Gear path generator
    const createGearPath = (cx, cy, outerR, innerR, teeth) => {
      const toothDepth = (outerR - innerR) * 0.5;
      const toothWidth = (2 * Math.PI) / (teeth * 2);
      let path = '';

      for (let i = 0; i < teeth; i++) {
        const angle1 = (i * 2 * Math.PI) / teeth;
        const angle2 = angle1 + toothWidth * 0.3;
        const angle3 = angle1 + toothWidth * 0.7;
        const angle4 = angle1 + toothWidth;

        const x1 = cx + outerR * Math.cos(angle1);
        const y1 = cy + outerR * Math.sin(angle1);
        const x2 = cx + (outerR + toothDepth) * Math.cos(angle2);
        const y2 = cy + (outerR + toothDepth) * Math.sin(angle2);
        const x3 = cx + (outerR + toothDepth) * Math.cos(angle3);
        const y3 = cy + (outerR + toothDepth) * Math.sin(angle3);
        const x4 = cx + outerR * Math.cos(angle4);
        const y4 = cy + outerR * Math.sin(angle4);

        path += `L${x1},${y1} L${x2},${y2} L${x3},${y3} L${x4},${y4} `;
      }

      return `M${cx + outerR},${cy} ${path}Z`;
    };

    return (
      <div className="relative" style={{ width: sizes.container, height: sizes.container }}>
        <svg
          width={sizes.container}
          height={sizes.container}
          viewBox={`0 0 ${sizes.container} ${sizes.container}`}
        >
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="gearGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B2332" />
              <stop offset="100%" stopColor="#6B1A26" />
            </linearGradient>
            <linearGradient id="gearGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4A84B" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
            <linearGradient id="gearGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A83244" />
              <stop offset="100%" stopColor="#8B2332" />
            </linearGradient>
            <filter id="gearShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Large gear - rotates clockwise */}
          <g
            style={{
              transformOrigin: `${sizes.container * 0.35}px ${sizes.container * 0.4}px`,
              animation: 'spin 3s linear infinite'
            }}
            filter="url(#gearShadow)"
          >
            <circle
              cx={sizes.container * 0.35}
              cy={sizes.container * 0.4}
              r={sizes.large * 0.5}
              fill="url(#gearGradient1)"
            />
            <path
              d={createGearPath(sizes.container * 0.35, sizes.container * 0.4, sizes.large * 0.42, sizes.large * 0.3, 12)}
              fill="url(#gearGradient1)"
            />
            <circle
              cx={sizes.container * 0.35}
              cy={sizes.container * 0.4}
              r={sizes.large * 0.15}
              fill="#1a1a1a"
            />
            {/* Gear detail circles */}
            <circle
              cx={sizes.container * 0.35}
              cy={sizes.container * 0.4}
              r={sizes.large * 0.25}
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="1"
              opacity="0.3"
            />
          </g>

          {/* Medium gear - rotates counter-clockwise */}
          <g
            style={{
              transformOrigin: `${sizes.container * 0.7}px ${sizes.container * 0.35}px`,
              animation: 'spin 2.2s linear infinite reverse'
            }}
            filter="url(#gearShadow)"
          >
            <circle
              cx={sizes.container * 0.7}
              cy={sizes.container * 0.35}
              r={sizes.small * 0.5}
              fill="url(#gearGradient2)"
            />
            <path
              d={createGearPath(sizes.container * 0.7, sizes.container * 0.35, sizes.small * 0.42, sizes.small * 0.3, 10)}
              fill="url(#gearGradient2)"
            />
            <circle
              cx={sizes.container * 0.7}
              cy={sizes.container * 0.35}
              r={sizes.small * 0.12}
              fill="#1a1a1a"
            />
          </g>

          {/* Small gear - rotates clockwise */}
          <g
            style={{
              transformOrigin: `${sizes.container * 0.55}px ${sizes.container * 0.72}px`,
              animation: 'spin 1.8s linear infinite'
            }}
            filter="url(#gearShadow)"
          >
            <circle
              cx={sizes.container * 0.55}
              cy={sizes.container * 0.72}
              r={sizes.tiny * 0.5}
              fill="url(#gearGradient3)"
            />
            <path
              d={createGearPath(sizes.container * 0.55, sizes.container * 0.72, sizes.tiny * 0.42, sizes.tiny * 0.3, 8)}
              fill="url(#gearGradient3)"
            />
            <circle
              cx={sizes.container * 0.55}
              cy={sizes.container * 0.72}
              r={sizes.tiny * 0.1}
              fill="#1a1a1a"
            />
          </g>
        </svg>

        {/* CSS for spin animation */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  };

  // Simple spinner component
  const SimpleSpinner = ({ className }) => (
    <div className={`${className} border-4 border-slate-600 border-t-emerald-500 rounded-full animate-spin`}></div>
  );

  // Dots spinner component
  const DotsSpinner = ({ className }) => (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );

  // Render the appropriate spinner based on variant
  const renderSpinner = () => {
    const spinnerClass = `${sizeClasses[size]} text-emerald-500`;

    switch (variant) {
      case 'gear':
      case 'rusted':
        return <DualGearIcon />;
      case 'simple':
        return <SimpleSpinner className={spinnerClass} />;
      case 'dots':
        return <DotsSpinner className={spinnerClass} />;
      default:
        return <DualGearIcon />;
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
