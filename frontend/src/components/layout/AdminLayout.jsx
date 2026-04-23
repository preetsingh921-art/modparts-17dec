import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AdminTabs from '../admin/AdminTabs';
import AIChatBot from '../admin/AIChatBot';
import { useAuth } from '../../context/AuthContext';

const AdminLayout = () => {
  const { user, setUser } = useAuth();
  const [warehouseName, setWarehouseName] = useState(null);
  const [loadingWarehouse, setLoadingWarehouse] = useState(true);

  // Fetch warehouse name - also fetch profile if warehouse_id missing from user
  useEffect(() => {
    const fetchWarehouseInfo = async () => {
      setLoadingWarehouse(true);
      const token = localStorage.getItem('token');

      let warehouseId = user?.warehouse_id;

      // If warehouse_id is missing from user context, fetch profile to get it
      if (!warehouseId && token) {
        try {
          const profileResponse = await fetch('/api/users/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            warehouseId = profileData.data?.warehouse_id;

            // Update user context and localStorage with warehouse_id
            if (warehouseId && user) {
              const updatedUser = { ...user, warehouse_id: warehouseId };
              localStorage.setItem('user', JSON.stringify(updatedUser));
              if (setUser) setUser(updatedUser);
            }
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
        }
      }

      // Now fetch warehouse name if we have an ID
      if (warehouseId) {
        try {
          const response = await fetch(`/api/inventory/warehouses?id=${warehouseId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setWarehouseName(data.warehouse?.name || null);
          }
        } catch (error) {
          console.error('Error fetching warehouse:', error);
        }
      }
      setLoadingWarehouse(false);
    };
    fetchWarehouseInfo();
  }, [user?.warehouse_id, user, setUser]);

  return (
    <div className="min-h-screen bg-black">
      {/* Admin Header with Tabs */}
      <div className="bg-[#1a1a1a] border-b border-[#333]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1
                className="text-2xl font-bold text-[#F5F0E1] uppercase tracking-wide"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                Admin Panel
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-gray-500 bg-[#242424] border border-[#333] px-2 py-0.5 rounded font-mono" title={`Built from commit ${typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : '?'} on ${typeof __COMMIT_DATE__ !== 'undefined' ? __COMMIT_DATE__ : '?'}`}>
                <span className="text-[#8B2332]">⬤</span>
                {typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev'}
                <span className="text-gray-600">|</span>
                {typeof __COMMIT_DATE__ !== 'undefined' ? new Date(__COMMIT_DATE__).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </div>
            {/* Display assigned warehouse */}
            {warehouseName && (
              <div className="flex items-center space-x-2 bg-[#B8860B] px-4 py-2 rounded-lg">
                <span className="text-white text-sm font-semibold">🏭 {warehouseName}</span>
              </div>
            )}
            {user?.warehouse_id && !warehouseName && (
              <div className="text-gray-400 text-sm">Loading warehouse...</div>
            )}
            {!user?.warehouse_id && (
              <div className="flex items-center space-x-2 bg-[#8B2332] px-4 py-2 rounded-lg">
                <span className="text-white text-sm">⚠️ No warehouse assigned</span>
              </div>
            )}
          </div>
        </div>
        <AdminTabs />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 relative">
        <Outlet />
      </div>
      
      {/* AI Chat Bot floating in the corner */}
      <AIChatBot />
    </div>
  );
};

export default AdminLayout;
