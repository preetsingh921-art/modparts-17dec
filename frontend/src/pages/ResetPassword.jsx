import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { InlineLoader } from '../components/ui/LoadingSpinner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(null); // null = checking, true = valid, false = invalid

  // Check if token is provided
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError('Invalid reset link. Please request a new password reset.');
    } else {
      setTokenValid(true);
    }
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.newPassword) {
      setError('New password is required');
      return false;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔐 Submitting password reset...');

      const response = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          newPassword: formData.newPassword
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Password reset successful');
        setSuccess(true);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Password reset successful! Please log in with your new password.' 
            }
          });
        }, 3000);
      } else {
        console.error('❌ Password reset failed:', data.message);
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      console.error('❌ Password reset error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show error if no token or invalid token
  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-4 py-12">
        <div className="max-w-md w-full bg-[#242424] border border-[#333] rounded-lg shadow-xl p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-950/80 border border-red-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2
            className="text-xl font-bold text-[#F5F0E1] mb-4 uppercase tracking-wide"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Invalid Reset Link
          </h2>
          <p className="text-[#D4CFC0] mb-6">
            This password reset link is invalid or has expired. Please request a new password reset.
          </p>
          <Link
            to="/login"
            className="inline-block bg-[#8B2332] text-white px-6 py-2 rounded font-semibold hover:bg-[#A32A3B] transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // Show success message
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-4 py-12">
        <div className="max-w-md w-full bg-[#242424] border border-[#333] rounded-lg shadow-xl p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-950/80 border border-emerald-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2
            className="text-xl font-bold text-[#F5F0E1] mb-4 uppercase tracking-wide"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Password Reset Successful!
          </h2>
          <p className="text-[#D4CFC0] mb-6">
            Your password has been reset successfully. You can now log in with your new password.
          </p>
          <p className="text-[#A8A090] text-sm">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2
            className="text-3xl font-bold text-[#F5F0E1] uppercase tracking-wide"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Reset Your Password
          </h2>
          <p className="mt-2 text-[#A8A090]">
            Enter your new password below
          </p>
        </div>

        <div className="bg-[#242424] border border-[#333] rounded-lg shadow-xl p-6">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-950/80 border border-red-800 text-red-200 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-[#D4CFC0] mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full p-3 bg-[#1a1a1a] border border-[#444] rounded text-[#F5F0E1] placeholder-[#777] focus:outline-none focus:border-[#8B2332]"
                  placeholder="Enter your new password"
                  disabled={loading}
                />
                <p className="text-xs text-[#A8A090] mt-1">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#D4CFC0] mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full p-3 bg-[#1a1a1a] border border-[#444] rounded text-[#F5F0E1] placeholder-[#777] focus:outline-none focus:border-[#8B2332]"
                  placeholder="Confirm your new password"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[#8B2332] text-white py-3 px-4 rounded font-semibold hover:bg-[#A32A3B] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <InlineLoader />
                  <span className="ml-2">Resetting Password...</span>
                </span>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-[#B8860B] hover:text-[#d4a50d] text-sm transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
