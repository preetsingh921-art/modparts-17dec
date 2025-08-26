import { useState, useRef } from 'react';
import { useToast } from '../../context/ToastContext';

const LogoUpload = ({ currentLogo, onLogoUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(currentLogo);
  const fileInputRef = useRef(null);
  const { success, error } = useToast();

  // Supported image formats
  const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  const validateFile = (file) => {
    if (!supportedFormats.includes(file.type)) {
      error('Please upload a valid image file (JPG, PNG, GIF, WebP, SVG)');
      return false;
    }
    
    if (file.size > maxFileSize) {
      error('File size must be less than 5MB');
      return false;
    }
    
    return true;
  };

  const handleFileSelect = (file) => {
    if (!validateFile(file)) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadLogo(file);
  };

  const uploadLogo = async (file) => {
    setUploading(true);

    try {
      console.log('Uploading logo file:', file.name, 'Size:', file.size, 'Type:', file.type);

      // Convert file to base64 - EXACT SAME METHOD AS PRODUCT UPLOAD
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          // Remove the data URL prefix (e.g., "data:image/png;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      console.log('Logo file converted to base64, length:', base64Data.length);

      // Get auth token from localStorage - EXACT SAME METHOD AS PRODUCT UPLOAD
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = user.token || localStorage.getItem('token') || '';

      console.log('Using auth token:', token ? 'Token exists' : 'No token');

      if (!token) {
        error('No authentication token found. Please login again.');
        return;
      }

      const headers = {
        'Content-Type': 'application/json'
      };

      // Add Authorization header
      headers['Authorization'] = `Bearer ${token}`;

      // Prepare JSON payload - EXACT SAME FORMAT AS PRODUCT UPLOAD
      const payload = {
        filename: file.name,
        mimetype: file.type,
        data: base64Data
      };

      console.log('Making logo upload request to:', '/api/admin/logo-upload');
      console.log('Headers:', headers);
      console.log('Payload size:', JSON.stringify(payload).length, 'bytes');

      // Use the new logo upload endpoint that mirrors product upload
      const response = await fetch('/api/admin/logo-upload', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      console.log('Logo upload response:', response.status, response.statusText);

      const data = await response.json();
      console.log('Logo upload response data:', data);

      if (data.success) {
        // Check for logoUrl first (new format), then fall back to file_url (product format)
        const logoUrl = data.logoUrl || data.file_url || data.data?.url;

        if (logoUrl) {
          console.log('Logo upload successful:', logoUrl);
          success('Logo uploaded successfully!');
          setPreview(logoUrl);
          if (onLogoUpdate) {
            onLogoUpdate(logoUrl);
          }
          // Trigger page refresh to update logo across site
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          console.error('No logo URL found in response:', data);
          error('No logo URL received from server');
          setPreview(currentLogo); // Reset preview
        }
      } else {
        console.error('❌ Logo upload failed:', data);
        error(data.message || 'Failed to upload logo');
        setPreview(currentLogo); // Reset preview
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      error('Failed to upload logo');
      setPreview(currentLogo); // Reset preview
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Test admin access
  const testAdminAccess = async () => {
    const token = localStorage.getItem('token');
    console.log('🧪 Testing admin access...', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0
    });

    try {
      const response = await fetch('/api/admin/test-logo', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('🧪 Test result:', data);

      if (data.success) {
        success('✅ Admin access verified!');
      } else {
        error(`❌ Admin access failed: ${data.message}`);
      }
    } catch (err) {
      console.error('🧪 Test error:', err);
      error('Failed to test admin access');
    }
  };

  const removeLogo = async () => {
    if (!window.confirm('Are you sure you want to remove the current logo?')) {
      return;
    }

    setUploading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/remove-logo', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        success('Logo removed successfully!');
        setPreview(null);
        if (onLogoUpdate) {
          onLogoUpdate(null);
        }
        // Trigger page refresh to update logo across site
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        error(data.message || 'Failed to remove logo');
      }
    } catch (err) {
      console.error('Logo removal error:', err);
      error('Failed to remove logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Website Logo</h3>
        <button
          onClick={testAdminAccess}
          className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
        >
          Test Admin Access
        </button>
      </div>
      
      {/* Current Logo Preview */}
      {preview && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Current Logo</label>
          <div className="flex items-center space-x-4">
            <div className="w-32 h-32 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
              <img 
                src={preview} 
                alt="Current Logo" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">
                This logo appears in the header, footer, and as the website favicon.
              </p>
              <button
                onClick={removeLogo}
                disabled={uploading}
                className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
              >
                Remove Logo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />
        
        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Uploading logo...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-2">
              {dragActive ? 'Drop your logo here' : 'Upload Website Logo'}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Drag and drop your logo here, or click to browse
            </p>
            <button
              onClick={triggerFileInput}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Choose File
            </button>
          </div>
        )}
      </div>

      {/* File Requirements */}
      <div className="mt-4 text-sm text-gray-600">
        <p className="font-medium mb-2">Requirements:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Supported formats: JPG, PNG, GIF, WebP, SVG</li>
          <li>Maximum file size: 5MB</li>
          <li>Recommended size: 200x200px or larger</li>
          <li>Square or rectangular logos work best</li>
        </ul>
      </div>

      {/* Logo Usage Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Where your logo will appear:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Website header (navigation bar)</li>
          <li>• Website footer</li>
          <li>• Browser tab (favicon)</li>
          <li>• Google search results</li>
          <li>• Social media shares</li>
          <li>• Email templates</li>
        </ul>
      </div>
    </div>
  );
};

export default LogoUpload;
