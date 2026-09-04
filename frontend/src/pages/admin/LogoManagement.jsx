import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import LogoUpload from '../../components/admin/LogoUpload';

const LogoManagement = () => {
  const { user, isAdmin } = useAuth();
  const { error } = useToast();
  const [currentLogo, setCurrentLogo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin()) {
      error('Admin access required');
      return;
    }
    
    fetchCurrentLogo();
  }, []);

  const fetchCurrentLogo = async () => {
    try {
      const response = await fetch('/api/admin/site-config');
      const data = await response.json();
      
      if (data.success && data.config.logo) {
        setCurrentLogo(data.config.logo);
      }
    } catch (err) {
      console.error('Error fetching current logo:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpdate = (newLogoUrl) => {
    setCurrentLogo(newLogoUrl);
  };

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight-950 text-white">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Logo Management
          </h1>
          <p className="text-midnight-300">
            Upload and manage your website logo. The logo will appear across your entire website 
            and in search results.
          </p>
        </div>

        {/* Logo Upload Component */}
        <LogoUpload 
          currentLogo={currentLogo}
          onLogoUpdate={handleLogoUpdate}
        />

        {/* Logo Preview Across Site */}
        <div className="mt-8 bg-midnight-900 border border-midnight-700 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-lg font-semibold text-white mb-4">Logo Preview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Header Preview */}
            <div className="border border-midnight-700 rounded-lg p-4 bg-midnight-950/60">
              <h4 className="font-medium text-midnight-200 mb-3">Header Navigation</h4>
              <div className="bg-[#1a1a1a] border border-[#333] shadow-sm p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {currentLogo ? (
                      <img 
                        src={currentLogo} 
                        alt="Logo" 
                        className="h-8 w-auto"
                      />
                    ) : (
                      <div className="h-8 w-8 bg-midnight-800 rounded flex items-center justify-center">
                        <span className="text-xs text-midnight-400">Logo</span>
                      </div>
                    )}
                    <span className="text-xl font-bold text-[#F5F0E1]">ModParts</span>
                  </div>
                  <div className="flex space-x-4 text-sm text-[#A8A090]">
                    <span>Home</span>
                    <span>Products</span>
                    <span>Contact</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Preview */}
            <div className="border border-midnight-700 rounded-lg p-4 bg-midnight-950/60">
              <h4 className="font-medium text-midnight-200 mb-3">Footer</h4>
              <div className="bg-[#141414] border border-[#2e2e2e] text-white p-4 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  {currentLogo ? (
                    <img 
                      src={currentLogo} 
                      alt="Logo" 
                      className="h-6 w-auto filter brightness-0 invert"
                    />
                  ) : (
                    <div className="h-6 w-6 bg-midnight-700 rounded flex items-center justify-center">
                      <span className="text-xs text-midnight-300">Logo</span>
                    </div>
                  )}
                  <span className="font-semibold text-[#F5F0E1]">ModParts</span>
                </div>
                <p className="text-sm text-[#A8A090]">Your trusted auto parts supplier</p>
              </div>
            </div>

            {/* Browser Tab Preview */}
            <div className="border border-midnight-700 rounded-lg p-4 bg-midnight-950/60">
              <h4 className="font-medium text-midnight-200 mb-3">Browser Tab (Favicon)</h4>
              <div className="bg-midnight-900 p-4 rounded-lg border border-midnight-800">
                <div className="flex items-center space-x-2 bg-midnight-800 border border-midnight-600 rounded p-2 text-white">
                  {currentLogo ? (
                    <img 
                      src={currentLogo} 
                      alt="Favicon" 
                      className="h-4 w-4"
                    />
                  ) : (
                    <div className="h-4 w-4 bg-midnight-600 rounded-sm"></div>
                  )}
                  <span className="text-sm text-midnight-200 font-medium">ModParts - Auto Parts</span>
                </div>
              </div>
            </div>

            {/* Search Result Preview */}
            <div className="border border-midnight-700 rounded-lg p-4 bg-midnight-950/60">
              <h4 className="font-medium text-midnight-200 mb-3">Google Search Result</h4>
              <div className="bg-midnight-950 p-4 rounded-lg border-l-4 border-amber-500 border-t border-r border-b border-midnight-700">
                <div className="flex items-start space-x-3">
                  {currentLogo ? (
                    <img 
                      src={currentLogo} 
                      alt="Site Icon" 
                      className="h-6 w-6 mt-1 rounded"
                    />
                  ) : (
                    <div className="h-6 w-6 mt-1 bg-midnight-700 rounded"></div>
                  )}
                  <div>
                    <h5 className="text-amber-400 text-lg font-medium">ModParts - Auto Parts</h5>
                    <p className="text-emerald-400 text-sm">www.partsformyrd350.com</p>
                    <p className="text-midnight-300 text-sm mt-1">
                      Quality auto parts for your vehicle. Fast shipping and competitive prices.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEO Benefits */}
        <div className="mt-8 bg-midnight-900 border border-midnight-700 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold text-white mb-4">SEO & Branding Benefits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-amber-300 mb-2">Search Engine Benefits:</h4>
              <ul className="text-midnight-300 space-y-1">
                <li>• Appears in Google search results</li>
                <li>• Improves brand recognition</li>
                <li>• Increases click-through rates</li>
                <li>• Professional appearance in SERPs</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-amber-300 mb-2">User Experience:</h4>
              <ul className="text-midnight-300 space-y-1">
                <li>• Consistent branding across site</li>
                <li>• Easy site identification</li>
                <li>• Professional appearance</li>
                <li>• Improved trust and credibility</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technical Info */}
        <div className="mt-8 bg-midnight-900 border border-midnight-700 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold text-white mb-4">Technical Information</h3>
          <div className="text-sm text-midnight-300 space-y-2">
            <p><strong className="text-white">Automatic Generation:</strong> Uploading a logo automatically creates favicons in multiple sizes (16x16, 32x32, 48x48, etc.)</p>
            <p><strong className="text-white">File Formats:</strong> Supports JPG, PNG, GIF, WebP, and SVG formats</p>
            <p><strong className="text-white">Optimization:</strong> Images are automatically optimized for web use</p>
            <p><strong className="text-white">Responsive:</strong> Logo scales appropriately on different screen sizes</p>
            <p><strong className="text-white">Cache Friendly:</strong> Proper caching headers for fast loading</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoManagement;
