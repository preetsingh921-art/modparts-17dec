import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InlineLoader } from '../components/ui/LoadingSpinner';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import HoneypotProtection from '../components/security/HoneypotProtection';
import { useLogo } from '../context/LogoContext';

const Login = () => {
  const { login, loading } = useAuth();
  const { logo } = useLogo();
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

    // Verify honeypot protection
    if (honeypotRef.current) {
      const isVerified = honeypotRef.current.verify();
      if (!isVerified) {
        setError('Security verification failed. Please try again.');
        return;
      }
    }

    try {
      console.log('Login form submitted with:', formData);

      // Login data (no token needed for honeypot)
      const loginData = { ...formData };
      const response = await login(loginData.email, loginData.password);
      console.log('Login successful, response:', response);

      // Add a small delay before navigation to ensure state is updated
      setTimeout(() => {
        console.log('Navigating to:', from);
        navigate(from, { replace: true });
      }, 500);
    } catch (err) {
      console.error('Login error in component:', err);
      setError(err.message || 'Login failed');
      // Reset honeypot on error
      if (honeypotRef.current) {
        honeypotRef.current.reset();
      }
    }
  };

  // Handle security verification
  const handleSecurityVerify = (isVerified) => {
    setIsSecurityVerified(isVerified);
    if (error && error.includes('security verification')) {
      setError(null);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: "url('/backdrops/login-backdrop.svg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Content overlay for better form readability */}
      <div className="absolute inset-0 bg-slate-900/10"></div>

      <div className="w-full max-w-md mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-large">
              {logo ? (
                <img
                  src={logo}
                  alt="ModParts Logo"
                  className="w-16 h-16 object-contain filter brightness-0 invert"
                />
              ) : (
                <div className="text-white text-center">
                  <div className="text-xs font-bold">MOD</div>
                  <div className="text-xs font-bold">PARTS</div>
                </div>
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-100 mb-2">Welcome to ModParts</h1>
          <p className="text-slate-400 text-lg">Log in to access your account.</p>
        </div>

        {/* Error Messages */}
        {error && (
          <div className={`border px-4 py-3 rounded-lg mb-6 backdrop-blur-sm ${
            error.includes('verify your email') || error.includes('pending admin approval')
              ? 'bg-yellow-900/50 border-yellow-600 text-yellow-200'
              : 'bg-red-900/50 border-red-600 text-red-200'
          }`}>
            {error}
            {error.includes('verify your email') && (
              <div className="mt-3 pt-3 border-t border-yellow-600/50">
                <p className="text-sm">
                  Check your email inbox (and spam folder) for the verification link. The link expires in 24 hours.
                </p>
              </div>
            )}
            {error.includes('pending admin approval') && (
              <div className="mt-3 pt-3 border-t border-yellow-600/50">
                <p className="text-sm">
                  Your account is waiting for admin approval. This usually takes 1-2 business days.
                </p>
              </div>
            )}
            {error.includes('rejected') && (
              <div className="mt-3 pt-3 border-t border-red-600/50">
                <p className="text-sm">
                  Please contact support for more information about your account status.
                </p>
              </div>
            )}
            {error.includes('suspended') && (
              <div className="mt-3 pt-3 border-t border-red-600/50">
                <p className="text-sm">
                  Please contact support to resolve any issues with your account.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Login Form */}
        <div className="space-y-6">
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
              <div className="w-full border-t border-slate-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-slate-900 text-slate-400">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email or Username"
                className="form-input w-full pl-12 pr-4 py-4"
                required
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="form-input w-full pl-12 pr-4 py-4"
                required
              />
            </div>

            {/* Security Protection */}
            <div className="mb-6">
              <HoneypotProtection
                ref={honeypotRef}
                onVerify={handleSecurityVerify}
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="btn-primary w-full py-4"
              disabled={loading}
            >
              {loading ? (
                <InlineLoader text="Logging in..." variant="gear" size="sm" />
              ) : (
                "Login"
              )}
            </button>

            {/* Reset Button */}
            <button
              type="button"
              className="btn-secondary w-full py-4"
              onClick={() => {
                setFormData({ email: '', password: '' });
                setError(null);
              }}
            >
              Reset
            </button>
          </form>

          {/* Forgot Password Link */}
          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
