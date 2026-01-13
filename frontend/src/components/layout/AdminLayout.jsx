import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AdminTabs from '../admin/AdminTabs';
import { useAuth } from '../../context/AuthContext';

const AdminLayout = () => {
  const { user } = useAuth();
  const [warehouseName, setWarehouseName] = useState(null);

  // Fetch warehouse name if admin has one assigned
  useEffect(() => {
    const fetchWarehouse = async () => {
      if (user?.warehouse_id) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/inventory/warehouses?id=${user.warehouse_id}`, {
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
    };
    fetchWarehouse();
  }, [user?.warehouse_id]);

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
