import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InlineLoader } from '../components/ui/LoadingSpinner';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import HoneypotProtection from '../components/security/HoneypotProtection';

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
  const [isSecurityVerified, setIsSecurityVerified] = useState(false);
  const honeypotRef = useRef(null);

  // Get the redirect path from location state or default to home
  const from = location.state?.from || '/';

  // Handle OAuth status messages
  useEffect(() => {
    const status = searchParams.get('status');
    const email = searchParams.get('email');
    const errorParam = searchParams.get('error');

    if (status === 'pending_verification' && email) {
      setError(`Please verify your email address (${email}) to complete your registration.`);
    } else if (status === 'pending_approval' && email) {
      setError(`Your account (${email}) is pending admin approval.`);
    } else if (errorParam) {
      switch (errorParam) {
        case 'oauth_failed':
        case 'oauth_error':
        case 'oauth_no_user':
        case 'callback_error':
          setError('Google authentication failed. Please try again.');
          break;
        case 'account_rejected':
          setError('Your account has been rejected. Please contact support.');
          break;
        case 'account_suspended':
          setError('Your account has been suspended. Please contact support.');
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

    // Verify honeypot protection
    if (honeypotRef.current) {
      const isVerified = honeypotRef.current.verify();
      if (!isVerified) {
        setError('Security verification failed. Please try again.');
        return;
      }
    }

    try {
      const response = await login(formData.email, formData.password);
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    } catch (err) {
      setError(err.message || 'Login failed');
      if (honeypotRef.current) {
        honeypotRef.current.reset();
      }
    }
  };

  const handleSecurityVerify = (isVerified) => {
    setIsSecurityVerified(isVerified);
    if (error && error.includes('security verification')) {
      setError(null);
    }
  };

  // Oil Can SVG Icon
  const OilCanIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19,7H18V6A1,1,0,0,0,17,5H7A1,1,0,0,0,6,6V7H5A1,1,0,0,0,4,8V19a3,3,0,0,0,3,3H17a3,3,0,0,0,3-3V8A1,1,0,0,0,19,7ZM8,7h8V8H8ZM18,19a1,1,0,0,1-1,1H7a1,1,0,0,1-1-1V10H18ZM14,3V4H10V3a1,1,0,0,1,2,0h0a1,1,0,0,1,2,0Z" />
    </svg>
  );

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Motorcycle Image */}
      <div
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/images/login-motorcycle.jpg)',
          filter: 'grayscale(100%)'
        }}
      >
        {/* Dark overlay for better contrast */}
        <div className="w-full h-full bg-black/20" />
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 backdrop-vintage-paper flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Vintage Logo */}
          <div className="flex justify-center mb-8">
            <img
              src="/images/vintage-logo.png"
              alt="Vintage Yamaha Parts"
              className="h-32 w-auto drop-shadow-lg"
            />
          </div>

          {/* Heading */}
          <h1 className="heading-vintage text-center">
            Login to Your Garage
          </h1>

          {/* Error Messages */}
          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="form-label-vintage">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input-vintage"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="form-label-vintage">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input-vintage"
                required
              />
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link to="/forgot-password" className="link-vintage">
                Forgot Password?
              </Link>
            </div>

            {/* Security Protection (hidden) */}
            <div className="hidden">
              <HoneypotProtection
                ref={honeypotRef}
                onVerify={handleSecurityVerify}
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="btn-vintage-red w-full"
              disabled={loading}
            >
              {loading ? (
                <InlineLoader text="Logging in..." variant="gear" size="sm" />
              ) : (
                <>
                  <OilCanIcon />
                  <span>Log In</span>
                </>
              )}
            </button>

            {/* Create Account Button */}
            <Link
              to="/register"
              className="btn-vintage-gray w-full block text-center"
            >
              Create Account
            </Link>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-[#C0B8A8]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#F5F0E1] text-[#666] font-medium uppercase tracking-wide">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Login */}
          <GoogleLoginButton
            text="Sign in with Google"
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
