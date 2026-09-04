import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        
        // Get parameters from URL
        const token = searchParams.get('token');
        const userStr = searchParams.get('user');
        const oauthSuccess = searchParams.get('oauth_success');
        const error = searchParams.get('error');

        if (error) {
          console.error('❌ OAuth error:', error);
          setStatus('error');
          
          switch (error) {
            case 'oauth_failed':
              setMessage('Google authentication failed. Please try again.');
              break;
            case 'oauth_error':
              setMessage('An error occurred during authentication. Please try again.');
              break;
            case 'oauth_no_user':
              setMessage('Unable to retrieve user information from Google. Please try again.');
              break;
            case 'account_rejected':
              setMessage('Your account has been rejected. Please contact support.');
              break;
            case 'account_suspended':
              setMessage('Your account has been suspended. Please contact support.');
              break;
            case 'account_inactive':
              setMessage('Your account is not active. Please contact support.');
              break;
            case 'callback_error':
              setMessage('An error occurred processing your authentication. Please try again.');
              break;
            default:
              setMessage('Authentication failed. Please try again.');
          }
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        if (oauthSuccess === 'true' && token && userStr) {
          console.log('✅ OAuth success, processing user data...');
          
          try {
            const user = JSON.parse(userStr);
            
            // Save auth data to localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            // Update auth context
            if (setUser) {
              setUser(user);
            }
            
            console.log('✅ User authenticated successfully:', user.email);
            setStatus('success');
            setMessage(`Welcome, ${user.first_name || user.email}! Redirecting...`);
            
            // Check if there's a cart in localStorage that needs to be migrated
            const localCart = localStorage.getItem('cart');
            if (localCart) {
              try {
                console.log('🛒 Migrating cart from localStorage...');
                const { importCart } = await import('../api/cart');
                const cartItems = JSON.parse(localCart);
                
                await importCart(cartItems);
                localStorage.removeItem('cart');
                console.log('✅ Cart migrated successfully');
              } catch (cartErr) {
                console.error('❌ Failed to migrate cart:', cartErr);
                // Don't fail the login for cart migration issues
              }
            }
            
            // Redirect to home page after 2 seconds
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 2000);
            
          } catch (parseError) {
            console.error('❌ Error parsing user data:', parseError);
            setStatus('error');
            setMessage('Error processing authentication data. Please try logging in again.');
            
            setTimeout(() => {
              navigate('/login', { replace: true });
            }, 3000);
          }
          
        } else {
          console.error('❌ Missing required OAuth parameters');
          setStatus('error');
          setMessage('Invalid authentication response. Please try again.');
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        }
        
      } catch (error) {
        console.error('❌ OAuth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
        
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-4">
      <div className="max-w-md w-full bg-[#242424] border border-[#333] rounded-xl shadow-2xl p-8 text-center text-[#F5F0E1]">
        {status === 'processing' && (
          <>
            <LoadingSpinner size="lg" />
            <h2 className="text-xl font-bold text-[#F5F0E1] mt-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Authenticating...
            </h2>
            <p className="text-[#A8A090] mt-2">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-950/80 border border-emerald-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-emerald-300" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Authentication Successful!
            </h2>
            <p className="text-emerald-200/90 mt-2">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-red-950/80 border border-red-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-300" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Authentication Failed
            </h2>
            <p className="text-red-200/90 mt-2">{message}</p>
            <p className="text-[#A8A090] text-sm mt-4">
              Redirecting to login page...
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
