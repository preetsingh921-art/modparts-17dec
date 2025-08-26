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
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Logo Management</h1>
          <p className="text-gray-600">
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
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Logo Preview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Header Preview */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-3">Header Navigation</h4>
              <div className="bg-white border-b shadow-sm p-4 rounded">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {currentLogo ? (
                      <img 
                        src={currentLogo} 
                        alt="Logo" 
                        className="h-8 w-auto"
                      />
                    ) : (
                      <div className="h-8 w-8 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-500">Logo</span>
                      </div>
                    )}
                    <span className="text-xl font-bold text-gray-900">ModParts</span>
                  </div>
                  <div className="flex space-x-4 text-sm text-gray-600">
                    <span>Home</span>
                    <span>Products</span>
                    <span>Contact</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Preview */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-3">Footer</h4>
              <div className="bg-gray-800 text-white p-4 rounded">
                <div className="flex items-center space-x-3 mb-2">
                  {currentLogo ? (
                    <img 
                      src={currentLogo} 
                      alt="Logo" 
                      className="h-6 w-auto filter brightness-0 invert"
                    />
                  ) : (
                    <div className="h-6 w-6 bg-gray-600 rounded flex items-center justify-center">
                      <span className="text-xs text-gray-300">Logo</span>
                    </div>
                  )}
                  <span className="font-semibold">ModParts</span>
                </div>
                <p className="text-sm text-gray-300">Your trusted auto parts supplier</p>
              </div>
            </div>

            {/* Browser Tab Preview */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-3">Browser Tab (Favicon)</h4>
              <div className="bg-gray-100 p-4 rounded">
                <div className="flex items-center space-x-2 bg-white border rounded p-2">
                  {currentLogo ? (
                    <img 
                      src={currentLogo} 
                      alt="Favicon" 
                      className="h-4 w-4"
                    />
                  ) : (
                    <div className="h-4 w-4 bg-gray-300 rounded-sm"></div>
                  )}
                  <span className="text-sm text-gray-700">ModParts - Auto Parts</span>
                </div>
              </div>
            </div>

            {/* Search Result Preview */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-3">Google Search Result</h4>
              <div className="bg-white p-4 rounded border-l-4 border-blue-500">
                <div className="flex items-start space-x-3">
                  {currentLogo ? (
                    <img 
                      src={currentLogo} 
                      alt="Site Icon" 
                      className="h-6 w-6 mt-1 rounded"
                    />
                  ) : (
                    <div className="h-6 w-6 mt-1 bg-gray-300 rounded"></div>
                  )}
                  <div>
                    <h5 className="text-blue-600 text-lg font-medium">ModParts - Auto Parts</h5>
                    <p className="text-green-600 text-sm">www.partsformyrd350.com</p>
                    <p className="text-gray-600 text-sm mt-1">
                      Quality auto parts for your vehicle. Fast shipping and competitive prices.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEO Benefits */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">SEO & Branding Benefits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Search Engine Benefits:</h4>
              <ul className="text-blue-700 space-y-1">
                <li>• Appears in Google search results</li>
                <li>• Improves brand recognition</li>
                <li>• Increases click-through rates</li>
                <li>• Professional appearance in SERPs</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">User Experience:</h4>
              <ul className="text-blue-700 space-y-1">
                <li>• Consistent branding across site</li>
                <li>• Easy site identification</li>
                <li>• Professional appearance</li>
                <li>• Improved trust and credibility</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technical Info */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Information</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Automatic Generation:</strong> Uploading a logo automatically creates favicons in multiple sizes (16x16, 32x32, 48x48, etc.)</p>
            <p><strong>File Formats:</strong> Supports JPG, PNG, GIF, WebP, and SVG formats</p>
            <p><strong>Optimization:</strong> Images are automatically optimized for web use</p>
            <p><strong>Responsive:</strong> Logo scales appropriately on different screen sizes</p>
            <p><strong>Cache Friendly:</strong> Proper caching headers for fast loading</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoManagement;
