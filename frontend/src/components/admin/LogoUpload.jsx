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
      const formData = new FormData();
      formData.append('logo', file);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/upload-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        success('Logo uploaded successfully!');
        setPreview(data.logoUrl);
        if (onLogoUpdate) {
          onLogoUpdate(data.logoUrl);
        }
        // Trigger page refresh to update logo across site
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Website Logo</h3>
      
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
