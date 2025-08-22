import { useRef, forwardRef, useImperativeHandle, useEffect } from 'react';

const Turnstile = forwardRef(({ 
  onVerify, 
  onExpire, 
  onError,
  theme = 'light',
  size = 'normal',
  className = ''
}, ref) => {
  const turnstileRef = useRef(null);
  const widgetId = useRef(null);

  // Get site key from environment
  const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY;

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    reset: () => {
      if (window.turnstile && widgetId.current !== null) {
        window.turnstile.reset(widgetId.current);
      }
    },
    getResponse: () => {
      if (window.turnstile && widgetId.current !== null) {
        return window.turnstile.getResponse(widgetId.current);
      }
      return null;
    }
  }));

  // Handle verification callback
  const handleVerify = (token) => {
    console.log('🔐 Turnstile token received:', token ? 'Valid' : 'Expired/Reset');
    console.log('🔑 Site Key being used:', siteKey ? siteKey.substring(0, 10) + '...' : 'None');
    if (onVerify) {
      onVerify(token);
    }
  };

  // Handle expiration callback
  const handleExpire = () => {
    console.log('⏰ Turnstile token expired');
    if (onExpire) {
      onExpire();
    }
  };

  // Handle error callback
  const handleError = (error) => {
    console.error('❌ Turnstile error:', error);
    if (onError) {
      onError(error);
    }
  };

  // Load Turnstile script and render widget
  useEffect(() => {
    if (!siteKey || siteKey.includes('your-turnstile-site-key')) {
      return;
    }

    // Load Turnstile script if not already loaded
    if (!window.turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        renderTurnstile();
      };
      document.head.appendChild(script);
    } else {
      renderTurnstile();
    }

    function renderTurnstile() {
      if (turnstileRef.current && window.turnstile) {
        // Clear any existing widget
        if (widgetId.current !== null) {
          try {
            window.turnstile.remove(widgetId.current);
          } catch (e) {
            console.log('Turnstile widget cleanup:', e.message);
          }
        }

        // Render new widget
        widgetId.current = window.turnstile.render(turnstileRef.current, {
          sitekey: siteKey,
          callback: handleVerify,
          'expired-callback': handleExpire,
          'error-callback': handleError,
          theme: theme,
          size: size
        });
      }
    }

    // Cleanup function
    return () => {
      if (window.turnstile && widgetId.current !== null) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch (e) {
          console.log('Turnstile cleanup:', e.message);
        }
        widgetId.current = null;
      }
    };
  }, [siteKey, theme, size]);

  // Don't render if no site key is available
  if (!siteKey || siteKey === 'your-turnstile-site-key' || siteKey.includes('your-actual')) {
    console.log('🔍 Turnstile Debug - Site Key:', siteKey || 'undefined');
    console.log('🔍 Turnstile Debug - Environment:', process.env.NODE_ENV);
    
    return (
      <div className={`p-4 bg-blue-50 border border-blue-200 rounded ${className}`}>
        <p className="text-blue-800 text-sm font-medium">
          🔄 Switching to Cloudflare Turnstile
        </p>
        <p className="text-blue-700 text-xs mt-1">
          Site Key: {siteKey ? `${siteKey.substring(0, 10)}...` : 'Not Set'}
        </p>
        <p className="text-blue-700 text-xs">
          Forms will work temporarily without verification.
        </p>
      </div>
    );
  }

  return (
    <div className={`turnstile-container ${className}`}>
      <div ref={turnstileRef} />
    </div>
  );
});

Turnstile.displayName = 'Turnstile';

export default Turnstile;
