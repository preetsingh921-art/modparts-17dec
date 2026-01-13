import { createContext, useState, useEffect, useContext } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '../api/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiLogin(email, password);

      if (response.token) {
        // Save auth data to localStorage
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);

        // Fetch complete profile to get warehouse_id and other data
        try {
          const profileResponse = await fetch('/api/users/profile', {
            headers: { 'Authorization': `Bearer ${response.token}` }
          });
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            const completeUser = { ...response.user, ...profileData.data };
            localStorage.setItem('user', JSON.stringify(completeUser));
            setUser(completeUser);
            console.log('Profile fetched with warehouse_id:', completeUser.warehouse_id);
          }
        } catch (profileErr) {
          console.error('Failed to fetch profile:', profileErr);
          // Don't throw - login was still successful
        }

        // Check if there's a cart in localStorage that needs to be migrated
        const localCart = localStorage.getItem('cart');
        if (localCart) {
          try {
            // Import cart items from localStorage to database
            const { importCart } = await import('../api/cart');
            const cartItems = JSON.parse(localCart);

            console.log('Importing cart items to database:', cartItems);
            await importCart(cartItems);

            // Clear localStorage cart after successful import
            localStorage.removeItem('cart');
            console.log('Cart imported successfully and removed from localStorage');
          } catch (cartErr) {
            console.error('Failed to import cart:', cartErr);
            // Don't throw error here, as login was successful
          }
        }
      }

      return response;
    } catch (err) {
      setError(err.message || 'Failed to login');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRegister(userData);

      // Check if email verification is required
      if (response.verification_required) {
        // Don't auto-login, return response with verification info
        return response;
      } else if (response.token) {
        // Auto-login if no verification required
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
      }

      return response;
    } catch (err) {
      setError(err.message || 'Failed to register');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);

    try {
      await apiLogout();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  // Function to update user data in context
  const updateUserData = (newData) => {
    if (user) {
      const updatedUser = { ...user, ...newData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value = {
    user,
    setUser,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated,
    isAdmin,
    updateUserData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
