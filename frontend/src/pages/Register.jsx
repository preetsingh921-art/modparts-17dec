import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InlineLoader } from '../components/ui/LoadingSpinner';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import PasswordStrengthIndicator from '../components/ui/PasswordStrengthIndicator';

const Register = () => {
  const { register, loading } = useAuth();
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const { confirmPassword, ...userData } = formData;
      const response = await register(userData);

      if (response?.verification_required) {
        setApprovalRequired(true);
        setUserEmail(userData.email);
        setSuccess(false);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

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
        <div className="w-full h-full bg-black/20" />
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 backdrop-vintage-paper flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Vintage Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/images/vintage-logo.png"
              alt="Vintage Yamaha Parts"
              className="h-24 w-auto drop-shadow-lg"
            />
          </div>

          {/* Heading */}
          <h1 className="heading-vintage text-center text-2xl">
            Create Your Account
          </h1>

          {/* Error Messages */}
          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Success Messages */}
          {success && (
            <div className="bg-green-100 border-2 border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
              Registration successful! Redirecting to login...
            </div>
          )}

          {/* Verification Required */}
          {approvalRequired && (
            <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg mb-6">
              <strong>Email Verification Required</strong>
              <p className="mt-2">We've sent a verification link to <strong>{userEmail}</strong>.</p>
              <p className="mt-2">Please check your email to activate your account.</p>
              <Link to="/login" className="link-vintage mt-3 inline-block">
                Back to Login
              </Link>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label-vintage">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="form-input-vintage"
                  required
                />
              </div>
              <div>
                <label className="form-label-vintage">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="form-input-vintage"
                  required
                />
              </div>
            </div>

            {/* Email */}
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

            {/* Phone */}
            <div>
              <label className="form-label-vintage">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input-vintage"
              />
            </div>

            {/* Address */}
            <div>
              <label className="form-label-vintage">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="form-input-vintage"
                rows="2"
              />
            </div>

            {/* Password */}
            <div>
              <label className="form-label-vintage">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input-vintage"
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

            {/* Confirm Password */}
            <div>
              <label className="form-label-vintage">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input-vintage"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-vintage-red w-full"
              disabled={loading || success}
            >
              {loading ? (
                <InlineLoader text="Creating Account..." variant="gear" size="sm" />
              ) : (
                'Create Account'
              )}
            </button>
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

          {/* Google Sign Up */}
          <GoogleLoginButton
            text="Sign up with Google"
            disabled={loading || success}
          />

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-[#3D3D3D]">
              Already have an account?{' '}
              <Link to="/login" className="link-vintage">
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
