import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InlineLoader } from '../components/ui/LoadingSpinner';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import PasswordStrengthIndicator from '../components/ui/PasswordStrengthIndicator';
import { useLogo } from '../context/LogoContext';

const Register = () => {
  const { register, loading } = useAuth();
  const { logo } = useLogo();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    address: '',
    phone: ''
  });
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);



    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      // Remove confirmPassword from data sent to API
      const { confirmPassword, ...userData } = formData;

      const response = await register(userData);

      // Check if email verification is required
      if (response?.verification_required) {
        setApprovalRequired(true); // Reuse the same state for verification message
        setUserEmail(userData.email);
        setSuccess(false);
      } else {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Registration failed');

    }
  };


  
  return (
    <div className="min-h-screen backdrop-login flex items-center justify-center relative overflow-hidden">
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
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <div className="text-white text-center">
                  <div className="text-xs font-bold">MOD</div>
                  <div className="text-xs font-bold">PARTS</div>
                </div>
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-slate-100">Create Account</h1>
          <p className="text-slate-300 mb-6">Join ModParts for quality auto parts</p>
        </div>
      
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-900/20 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
            Registration successful! Redirecting to login...
          </div>
        )}

        {approvalRequired && (
          <div className="bg-yellow-900/20 border border-yellow-500/50 text-yellow-300 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <strong>Email Verification Required</strong>
            </div>
            <p className="mb-3">
              Your account has been created successfully! Please check your email to verify your account.
            </p>
            <p className="mb-3">
              <strong>Email:</strong> {userEmail}
            </p>
            <p className="mb-3">
              We've sent a verification link to your email address. Click the link to activate your account and start shopping!
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                to="/login"
                className="text-emerald-400 hover:text-emerald-300 underline font-medium"
              >
                Back to login
              </Link>
              <span className="hidden sm:inline text-yellow-500">•</span>
              <Link
                to="/"
                className="text-emerald-400 hover:text-emerald-300 underline font-medium"
              >
                Browse products
              </Link>
            </div>
          </div>
        )}
      
        <div className="card-elevated p-8">
          {/* Google Registration Button */}
          <div className="mb-6">
            <GoogleLoginButton
              text="Sign up with Google"
              disabled={loading || success}
            />
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-400">Or register with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-slate-300 mb-2 font-medium">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="form-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-2 font-medium">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="form-input w-full"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-slate-300 mb-2 font-medium">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input w-full"
                required
              />
            </div>
          
            <div className="mb-4">
              <label className="block text-slate-300 mb-2 font-medium">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input w-full"
              />
            </div>

            <div className="mb-4">
              <label className="block text-slate-300 mb-2 font-medium">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="form-input w-full"
                rows="2"
              ></textarea>
            </div>

            <div className="mb-4">
              <label className="block text-slate-300 mb-2 font-medium">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input w-full"
                required
                minLength="8"
                placeholder="Enter a strong password"
              />
            <PasswordStrengthIndicator
              password={formData.password}
              userInfo={{
                firstName: formData.first_name,
                lastName: formData.last_name,
                email: formData.email,
                phone: formData.phone
              }}
            />
            </div>

            <div className="mb-6">
              <label className="block text-slate-300 mb-2 font-medium">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input w-full"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center py-3"
              disabled={loading || success}
            >
              {loading ? (
                <InlineLoader text="Registering..." variant="gear" size="sm" />
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-300">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
