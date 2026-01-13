import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AdminTabs from '../admin/AdminTabs';
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
    <div className="min-h-screen" style={{ background: '#D4C5A9' }}>
      {/* Admin Header with Tabs */}
      <div className="bg-[#1a1a1a] border-b border-[#333]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1
              className="text-2xl font-bold text-[#F5F0E1] uppercase tracking-wide"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Admin Panel
            </h1>
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
      <div className="container mx-auto px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
