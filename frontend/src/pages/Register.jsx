import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InlineLoader } from '../components/ui/LoadingSpinner';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import ReCaptcha from '../components/security/ReCaptcha';

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
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate reCAPTCHA (only if configured)
    const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
    const isRecaptchaConfigured = siteKey &&
      siteKey !== 'your-recaptcha-site-key' &&
      siteKey !== '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

    if (isRecaptchaConfigured && !recaptchaToken) {
      setError('Please complete the reCAPTCHA verification');
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      // Remove confirmPassword from data sent to API and add reCAPTCHA token
      const { confirmPassword, ...userData } = formData;
      userData.recaptchaToken = recaptchaToken;

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
      // Reset reCAPTCHA on error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
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
  
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Register</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          Registration successful! Redirecting to login...
        </div>
      )}

      {approvalRequired && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-6">
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
              className="text-yellow-700 hover:text-yellow-900 underline font-medium"
            >
              Back to login
            </Link>
            <span className="hidden sm:inline text-yellow-600">•</span>
            <Link
              to="/"
              className="text-yellow-700 hover:text-yellow-900 underline font-medium"
            >
              Browse products
            </Link>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6">
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
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or register with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
          
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
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              rows="2"
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
              minLength="6"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
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
            className="w-full flex items-center justify-center bg-blue-800 text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            disabled={loading || success}
          >
            {loading ? (
              <InlineLoader text="Registering..." variant="gear" size="sm" />
            ) : (
              'Register'
            )}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
