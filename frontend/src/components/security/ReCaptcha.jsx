import { useRef, forwardRef, useImperativeHandle } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

const ReCaptcha = forwardRef(({ 
  onVerify, 
  onExpire, 
  onError,
  size = 'normal', // 'compact', 'normal', 'invisible'
  theme = 'light', // 'light', 'dark'
  className = ''
}, ref) => {
  const recaptchaRef = useRef(null);

  // Get site key from environment
  const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

  useImperativeHandle(ref, () => ({
    // Reset the reCAPTCHA
    reset: () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
    },
    
    // Get the current reCAPTCHA value
    getValue: () => {
      if (recaptchaRef.current) {
        return recaptchaRef.current.getValue();
      }
      return null;
    },
    
    // Execute reCAPTCHA (for invisible reCAPTCHA)
    execute: () => {
      if (recaptchaRef.current) {
        return recaptchaRef.current.execute();
      }
      return null;
    }
  }));

  const handleChange = (token) => {
    console.log('🔐 reCAPTCHA token received:', token ? 'Valid' : 'Expired/Reset');
    console.log('🔑 Site Key being used:', siteKey ? siteKey.substring(0, 10) + '...' : 'None');
    if (onVerify) {
      onVerify(token);
    }
  };

  const handleExpired = () => {
    console.log('⏰ reCAPTCHA expired');
    if (onExpire) {
      onExpire();
    }
  };

  const handleError = (error) => {
    console.error('❌ reCAPTCHA error:', error);
    if (onError) {
      onError(error);
    }
  };

  // Don't render if no site key is available
  if (!siteKey || siteKey === 'your-recaptcha-site-key' || siteKey.includes('your-actual')) {
    console.log('🔍 reCAPTCHA Debug - Site Key:', siteKey || 'undefined');
    console.log('🔍 reCAPTCHA Debug - Environment:', process.env.NODE_ENV);

    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded ${className}`}>
        <p className="text-yellow-800 text-sm font-medium">
          ⚠️ reCAPTCHA Configuration Issue
        </p>
        <p className="text-yellow-700 text-xs mt-1">
          Site Key: {siteKey ? `${siteKey.substring(0, 10)}...` : 'Not Set'}
        </p>
        <p className="text-yellow-700 text-xs">
          Forms will work temporarily without verification.
        </p>
      </div>
    );
  }

  return (
    <div className={`recaptcha-container ${className}`}>
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={siteKey}
        onChange={handleChange}
        onExpired={handleExpired}
        onError={handleError}
        size={size}
        theme={theme}
      />
    </div>
  );
});

ReCaptcha.displayName = 'ReCaptcha';

export default ReCaptcha;
