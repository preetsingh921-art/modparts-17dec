import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';

const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  const [bypassChecked, setBypassChecked] = useState(false);
  const [isBypassEnabled, setIsBypassEnabled] = useState(false);

  useEffect(() => {
    // Check if we have a user in localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user && (user.role === 'admin' || user.role === 'superadmin')) {
          console.log('Admin bypass enabled via localStorage');
          setIsBypassEnabled(true);
        }
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
    setBypassChecked(true);
  }, []);

  // Show loading while checking bypass
  if (loading || !bypassChecked) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // Allow access if user is admin or bypass is enabled
  if (isAdmin() || isBypassEnabled) {
    return children;
  }

  // Otherwise redirect to home
  return <Navigate to="/" replace />;
};

export default AdminRoute;
