import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import api from '../api/config';

const ResendVerification = () => {
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      showError('Please enter your email address');
      return;
    }

    setLoading(true);
    
    try {
      const response = await api.post('/auth/resend-verification', { email });
      
      setSent(true);
      success('Verification email sent! Please check your inbox.');
      
    } catch (err) {
      console.error('Resend verification error:', err);
      const errorData = err.response?.data;
      
      if (err.response?.status === 429) {
        setRetryAfter(errorData?.retry_after || 60);
        showError(errorData?.message || 'Please wait before requesting another email');
      } else {
        showError(errorData?.message || 'Failed to send verification email');
      }
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer for retry
  useState(() => {
    if (retryAfter > 0) {
      const timer = setInterval(() => {
        setRetryAfter(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [retryAfter]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2
            className="mt-6 text-3xl font-bold text-[#F5F0E1] uppercase tracking-wide"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Resend Verification Email
          </h2>
          <p className="mt-2 text-sm text-[#A8A090]">
            Enter your email address to receive a new verification link
          </p>
        </div>

        <div className="bg-[#242424] border border-[#333] shadow-xl rounded-lg p-6">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#D4CFC0]">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 bg-[#1a1a1a] border border-[#444] placeholder-[#777] text-[#F5F0E1] rounded-md focus:outline-none focus:border-[#8B2332] sm:text-sm"
                  placeholder="Enter your email address"
                  disabled={loading || retryAfter > 0}
                />
              </div>

              {retryAfter > 0 && (
                <div className="bg-amber-950/80 border border-amber-700 rounded-md p-3">
                  <p className="text-sm text-amber-200">
                    Please wait {retryAfter} seconds before requesting another email.
                  </p>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading || retryAfter > 0}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-[#8B2332] hover:bg-[#A32A3B] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" text="Sending..." />
                  ) : retryAfter > 0 ? (
                    `Wait ${retryAfter}s`
                  ) : (
                    'Send Verification Email'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-950/80 border border-emerald-700 mb-4">
                <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#F5F0E1] mb-2">
                Verification Email Sent! 📧
              </h3>
              <p className="text-[#D4CFC0] mb-4">
                We've sent a new verification email to <strong className="text-[#F5F0E1]">{email}</strong>. 
                Please check your inbox and click the verification link.
              </p>
              <p className="text-sm text-[#A8A090] mb-4">
                Don't see the email? Check your spam folder.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
                className="text-[#B8860B] hover:text-[#d4a50d] text-sm transition-colors"
              >
                Send to a different email
              </button>
            </div>
          )}

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

export default ResendVerification;
