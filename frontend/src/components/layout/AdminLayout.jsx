import { Outlet } from 'react-router-dom';
import AdminTabs from '../admin/AdminTabs';

const AdminLayout = () => {
  return (
    <div className="min-h-screen" style={{ background: '#D4C5A9' }}>
      {/* Admin Header with Tabs */}
      <div className="bg-[#1a1a1a] border-b border-[#333]">
        <div className="container mx-auto px-4 py-4">
          <h1
            className="text-2xl font-bold text-[#F5F0E1] uppercase tracking-wide"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Admin Panel
          </h1>
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
