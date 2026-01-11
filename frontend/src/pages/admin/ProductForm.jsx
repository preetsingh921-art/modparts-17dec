import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProductById, createProduct, updateProduct, uploadProductImage } from '../../api/products';
import { getCategories } from '../../api/categories';
import { useToast } from '../../context/ToastContext';
import { processImageUrl, handleImageError } from '../../utils/imageHelper';
import { InlineLoader } from '../../components/ui/LoadingSpinner';
import PlaceholderImage from '../../components/ui/PlaceholderImage';
import InlineBarcode from '../../components/ui/InlineBarcode';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const { success, error: showError } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    condition_status: 'New',
    quantity: '',
    image_url: '',
    part_number: '',
    barcode: ''
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);

        // Set default category if available
        if (data.length > 0 && !isEditMode) {
          setFormData(prev => ({ ...prev, category_id: data[0].id }));
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, [isEditMode]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!isEditMode) return;

      setLoading(true);
      try {
        const data = await getProductById(id);
        setFormData({
          name: data.name,
          description: data.description,
          price: data.price,
          category_id: data.category_id ? String(data.category_id) : '',
          condition_status: data.condition_status,
          quantity: data.quantity,
          image_url: data.image_url || '',
          part_number: data.part_number || '',
          barcode: data.barcode || ''
        });

        // Set image preview if image_url exists
        if (data.image_url) {
          setImagePreview(data.image_url);
        }
      } catch (err) {
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, isEditMode]);

  // Update image preview when image_url changes
  useEffect(() => {
    if (formData.image_url) {
      setImagePreview(formData.image_url);
      console.log('Setting image preview from URL:', formData.image_url);
    }
  }, [formData.image_url]);

  // Log when component mounts or updates
  useEffect(() => {
    if (isEditMode && formData.image_url) {
      console.log('Edit mode active, image URL:', formData.image_url);
    }
  }, [isEditMode, formData.image_url]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      showError('Invalid file type. Please upload a JPG, PNG, or GIF image.');
      return;
    }

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showError('File size too large. Maximum size is 5MB.');
      return;
    }

    setImageFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!imageFile) {
      showError('Please select an image to upload.');
      return;
    }

    setUploadLoading(true);
    try {
      const response = await uploadProductImage(imageFile);

      // Log the response for debugging
      console.log('Upload response:', response);

      // The uploadProductImage function now returns the URL directly
      if (response) {
        const imageUrl = response; // response is now the URL string directly
        console.log('Setting image URL to:', imageUrl);

        setFormData(prev => ({ ...prev, image_url: imageUrl }));
        setImagePreview(imageUrl);
        success('Image uploaded successfully.');

        // Store the URL in localStorage for debugging
        const uploadHistory = JSON.parse(localStorage.getItem('uploadHistory') || '[]');
        uploadHistory.push({
          timestamp: new Date().toISOString(),
          url: imageUrl,
          productId: id || 'new'
        });
        localStorage.setItem('uploadHistory', JSON.stringify(uploadHistory));
      } else {
        throw new Error('No file URL received from server');
      }

      setImageFile(null);

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      showError(err.message || 'Failed to upload image.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Log the form data before submission
      console.log('Submitting product data:', formData);

      // Make sure the image URL is properly formatted
      let imageUrl = formData.image_url;

      // Ensure we have a valid image URL
      if (imageUrl) {
        console.log('Using image URL:', imageUrl);
      } else {
        console.log('No image URL provided');
      }

      // Prepare the product data with proper type conversions
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        image_url: imageUrl,
        part_number: formData.part_number || null,
        barcode: formData.barcode || null
      };

      console.log('Final product data for submission:', productData);

      if (isEditMode) {
        const response = await updateProduct({ id, ...productData });
        console.log('Product update response:', response);
        success('Product updated successfully');
      } else {
        const response = await createProduct(productData);
        console.log('Product creation response:', response);
        success('Product created successfully');
      }

      // Store the product data in localStorage for debugging
      const productHistory = JSON.parse(localStorage.getItem('productHistory') || '[]');
      productHistory.push({
        timestamp: new Date().toISOString(),
        action: isEditMode ? 'update' : 'create',
        productId: id || 'new',
        imageUrl: productData.image_url
      });
      localStorage.setItem('productHistory', JSON.stringify(productHistory));

      navigate('/admin/products');
    } catch (err) {
      console.error('Product submission error:', err);
      const errorMessage = err.message || `Failed to ${isEditMode ? 'update' : 'create'} product`;
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4">
      <div className="mb-6">
        <Link to="/admin/products" className="text-blue-600 hover:underline flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Products
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">
        {isEditMode ? 'Edit Product' : 'Add New Product'}
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 mb-2">Product Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Category</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Part Number and Barcode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 mb-2">Part Number</label>
              <input
                type="text"
                name="part_number"
                value={formData.part_number}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="e.g., YAM-RD350-001"
              />
              <p className="text-xs text-gray-500 mt-1">Used to auto-generate barcode if not provided</p>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Barcode</label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                className="w-full p-2 border rounded bg-gray-100"
                placeholder="Auto-generated from part number"
                readOnly={isEditMode && !!formData.barcode}
              />
              {isEditMode && formData.barcode && (
                <div className="mt-2 p-3 bg-white border rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Barcode Preview:</p>
                  <InlineBarcode barcode={formData.barcode} width={1.5} height={35} />
                  <p className="text-xs text-green-600 mt-2">✓ Barcode: {formData.barcode}</p>
                </div>
              )}
              {!formData.barcode && (
                <p className="text-xs text-gray-500 mt-1">Will be auto-generated when product is saved</p>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              rows="4"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 mb-2">Price ($)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Condition</label>
              <select
                name="condition_status"
                value={formData.condition_status}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              >
                <option value="New">New</option>
                <option value="Used - Like New">Used - Like New</option>
                <option value="Used - Good">Used - Good</option>
                <option value="Used - Fair">Used - Fair</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2 text-lg font-semibold">Product Image</label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Upload Section */}
                <div style={{
                  border: '2px dashed #3b82f6',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: '#eff6ff',
                  marginBottom: '16px'
                }}>
                  <label style={{
                    display: 'block',
                    color: '#374151',
                    marginBottom: '12px',
                    fontWeight: '500',
                    fontSize: '18px'
                  }}>
                    📁 Upload Image from Computer
                  </label>

                  <div style={{ marginBottom: '12px' }}>
                    {/* Visible file input */}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/jpg"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      id="file-input"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        marginBottom: '12px'
                      }}
                    />

                    {/* Alternative custom button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        width: '100%',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: '500',
                        cursor: 'pointer',
                        marginBottom: '12px'
                      }}
                    >
                      📂 Browse Files (Alternative)
                    </button>
                  </div>

                  {/* Show selected file name */}
                  {imageFile && (
                    <div style={{
                      backgroundColor: 'white',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      marginBottom: '12px'
                    }}>
                      <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                        <strong>Selected:</strong> {imageFile.name}
                      </p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                        Size: {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}

                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!imageFile || uploadLoading}
                    style={{
                      width: '100%',
                      backgroundColor: imageFile && !uploadLoading ? '#16a34a' : '#9ca3af',
                      color: 'white',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '500',
                      cursor: imageFile && !uploadLoading ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {uploadLoading ? '⏳ Uploading...' : '📤 Upload to Server'}
                  </button>

                  <p style={{
                    fontSize: '14px',
                    color: '#4b5563',
                    marginTop: '12px',
                    backgroundColor: 'white',
                    padding: '8px',
                    borderRadius: '4px',
                    margin: '12px 0 0 0'
                  }}>
                    📋 <strong>Supported formats:</strong> JPG, JPEG, PNG, GIF<br />
                    📏 <strong>Maximum size:</strong> 5MB
                  </p>
                </div>

                {/* URL Section */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <label className="block text-gray-700 mb-2 font-medium">🔗 Or Enter Image URL</label>
                  <input
                    type="text"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Enter a direct URL to an image file
                  </p>
                </div>
              </div>

              <div>
                {imagePreview ? (
                  <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
                    <p className="text-sm font-semibold mb-2 text-green-800">🖼️ Image Preview:</p>
                    <div className="w-full h-48 bg-white border rounded overflow-hidden">
                      <PlaceholderImage
                        src={processImageUrl(imagePreview)}
                        alt="Product preview"
                        className="object-contain w-full h-full"
                        placeholderText="Image Loading..."
                      />
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      ✅ Image loaded successfully
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center h-48 bg-gray-50">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📷</div>
                      <p className="text-gray-500 font-medium">No image preview</p>
                      <p className="text-sm text-gray-400">Upload an image or enter a URL to see preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              to="/admin/products"
              className="bg-gray-300 text-gray-800 px-6 py-2 rounded mr-2 hover:bg-gray-400"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-blue-800 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <InlineLoader text="Saving..." variant="gear" size="sm" />
              ) : (
                isEditMode ? 'Update Product' : 'Create Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
