import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { InlineLoader } from '../components/ui/LoadingSpinner';
import ReCaptcha from '../components/security/ReCaptcha';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📧 Requesting password reset for:', email);

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, recaptchaToken }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Password reset request successful');
        setSuccess(true);
      } else {
        console.error('❌ Password reset request failed:', data.message);
        setError(data.message || 'Failed to send reset email');
      }
    } catch (err) {
      console.error('❌ Password reset request error:', err);
      setError('An error occurred. Please try again.');
      // Reset reCAPTCHA on error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle reCAPTCHA verification
  const handleRecaptchaVerify = (token) => {
    setRecaptchaToken(token);
    if (error && error.includes('reCAPTCHA')) {
      setError(null);
    }
  };

  const handleRecaptchaExpire = () => {
    setRecaptchaToken(null);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-green-900 mb-4">Check Your Email</h2>
          <p className="text-green-700 mb-6">
            If an account with that email exists, we've sent you a password reset link.
          </p>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4 text-left">
              <h3 className="font-medium text-blue-900 mb-2">What's next?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Check your email inbox (and spam folder)</li>
                <li>• Click the reset link in the email</li>
                <li>• The link expires in 1 hour</li>
                <li>• Create your new password</li>
              </ul>
            </div>
            <div className="flex space-x-3">
              <Link
                to="/login"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition duration-200 text-center"
              >
                Back to Login
              </Link>
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-50 transition duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Forgot Password?</h2>
          <p className="mt-2 text-gray-600">
            No worries! Enter your email address and we'll send you a reset link.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email address"
                disabled={loading}
              />
            </div>

            {/* reCAPTCHA */}
            <div className="mb-6">
              <ReCaptcha
                ref={recaptchaRef}
                onVerify={handleRecaptchaVerify}
                onExpire={handleRecaptchaExpire}
                size="normal"
                theme="light"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !recaptchaToken}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <InlineLoader />
                  <span className="ml-2">Sending Reset Link...</span>
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link
              to="/login"
              className="block text-blue-600 hover:text-blue-500 text-sm"
            >
              Back to Login
            </Link>
            <div className="text-gray-500 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-500">
                Sign up here
              </Link>
            </div>
          </div>
        </div>

        {/* Help section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">💡 Need Help?</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Make sure you enter the email address you used to register</p>
            <p>• Check your spam/junk folder if you don't see the email</p>
            <p>• The reset link expires in 1 hour for security</p>
            <p>• If you signed up with Google, you can still set a password</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
