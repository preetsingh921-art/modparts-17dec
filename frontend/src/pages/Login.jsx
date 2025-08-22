import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InlineLoader } from '../components/ui/LoadingSpinner';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import Turnstile from '../components/security/Turnstile';

const Login = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const turnstileRef = useRef(null);

  // Get the redirect path from location state or default to home
  const from = location.state?.from || '/';

  // Handle OAuth status messages
  useEffect(() => {
    const status = searchParams.get('status');
    const email = searchParams.get('email');
    const errorParam = searchParams.get('error');

    if (status === 'pending_verification' && email) {
      setError(`Please verify your email address (${email}) to complete your registration. Check your inbox for the verification link.`);
    } else if (status === 'pending_approval' && email) {
      setError(`Your account (${email}) is pending admin approval. You will be notified once approved.`);
    } else if (errorParam) {
      switch (errorParam) {
        case 'oauth_failed':
        case 'oauth_error':
        case 'oauth_no_user':
        case 'callback_error':
          setError('Google authentication failed. Please try again or use email login.');
          break;
        case 'account_rejected':
          setError('Your account has been rejected. Please contact support.');
          break;
        case 'account_suspended':
          setError('Your account has been suspended. Please contact support.');
          break;
        case 'account_inactive':
          setError('Your account is not active. Please contact support.');
          break;
        default:
          setError('Authentication failed. Please try again.');
      }
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate Turnstile (skip if not configured)
    const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY;
    const isTurnstileConfigured = siteKey &&
      !siteKey.includes('your-turnstile-site-key') &&
      !siteKey.includes('your-actual');

    if (isTurnstileConfigured && !turnstileToken) {
      setError('Please complete the security verification to continue');
      return;
    }

    try {
      console.log('Login form submitted with:', formData);

      // Add Turnstile token to login data
      const loginData = { ...formData, turnstileToken };
      const response = await login(loginData.email, loginData.password, loginData.turnstileToken);
      console.log('Login successful, response:', response);

      // Add a small delay before navigation to ensure state is updated
      setTimeout(() => {
        console.log('Navigating to:', from);
        navigate(from, { replace: true });
      }, 500);
    } catch (err) {
      console.error('Login error in component:', err);
      setError(err.message || 'Login failed');
      // Reset Turnstile on error
      if (turnstileRef.current) {
        turnstileRef.current.reset();
        setTurnstileToken(null);
      }
    }
  };

  // Handle Turnstile verification
  const handleTurnstileVerify = (token) => {
    setTurnstileToken(token);
    if (error && error.includes('security verification')) {
      setError(null);
    }
  };

  const handleTurnstileExpire = () => {
    setTurnstileToken(null);
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>

      {error && (
        <div className={`border px-4 py-3 rounded mb-6 ${
          error.includes('verify your email') || error.includes('pending admin approval')
            ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          {error}
          {error.includes('verify your email') && (
            <div className="mt-3 pt-3 border-t border-yellow-300">
              <p className="text-sm">
                Check your email inbox (and spam folder) for the verification link. The link expires in 24 hours.
              </p>
            </div>
          )}
          {error.includes('pending admin approval') && (
            <div className="mt-3 pt-3 border-t border-yellow-300">
              <p className="text-sm">
                Your account is waiting for admin approval. This usually takes 1-2 business days.
              </p>
            </div>
          )}
          {error.includes('rejected') && (
            <div className="mt-3 pt-3 border-t border-red-300">
              <p className="text-sm">
                Please contact support for more information about your account status.
              </p>
            </div>
          )}
          {error.includes('suspended') && (
            <div className="mt-3 pt-3 border-t border-red-300">
              <p className="text-sm">
                Please contact support to resolve any issues with your account.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        {/* Google Login Button */}
        <div className="mb-6">
          <GoogleLoginButton
            text="Sign in with Google"
            disabled={loading}
          />
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          {/* Cloudflare Turnstile */}
          <div className="mb-6">
            <Turnstile
              ref={turnstileRef}
              onVerify={handleTurnstileVerify}
              onExpire={handleTurnstileExpire}
              size="normal"
              theme="light"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center bg-blue-800 text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            disabled={loading}
          >
            {loading ? (
              <InlineLoader text="Logging in..." variant="gear" size="sm" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Login
              </>
            )}
          </button>
        </form>

        {/* Forgot Password Link */}
        <div className="mt-4 text-center">
          <Link
            to="/forgot-password"
            className="text-blue-600 hover:underline text-sm"
          >
            Forgot your password?
          </Link>
        </div>

        <div className="mt-4 text-center">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
