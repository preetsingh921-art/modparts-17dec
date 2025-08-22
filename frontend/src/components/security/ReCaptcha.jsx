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
  const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Test key

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
  if (!siteKey || siteKey === 'your-recaptcha-site-key') {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded ${className}`}>
        <p className="text-yellow-800 text-sm">
          ⚠️ reCAPTCHA not configured. Please set REACT_APP_RECAPTCHA_SITE_KEY environment variable.
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
