import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { getProductById, createProduct, updateProduct, uploadProductImage } from '../../api/products';
import { getCategories } from '../../api/categories';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { processImageUrl, handleImageError } from '../../utils/imageHelper';
import { InlineLoader } from '../../components/ui/LoadingSpinner';
import PlaceholderImage from '../../components/ui/PlaceholderImage';
import InlineBarcode from '../../components/ui/InlineBarcode';
import WebImageSearchModal from '../../components/admin/WebImageSearchModal';
import api from '../../api/config';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = !!id;
  const { success, error: showError } = useToast();
  const { user } = useAuth();

  // Get prefilled part_number from URL (from barcode scan)
  const prefilledPartNumber = searchParams.get('part_number') || '';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    condition_status: 'New',
    quantity: '0', // Default quantity is 0 - stock only increases when received via scan
    image_url: '',
    images: [],
    part_number: prefilledPartNumber,
    barcode: prefilledPartNumber, // Also use as barcode
    warehouse_id: user?.warehouse_id || '' // Auto-select admin's warehouse
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [aiCategorySuggestion, setAiCategorySuggestion] = useState(null); // AI category suggestion
  const [isWebSearchOpen, setIsWebSearchOpen] = useState(false);
  const [aiCategoryLoading, setAiCategoryLoading] = useState(false);

  // Multi-image helper functions
  const addImages = (newUrls) => {
    setFormData(prev => {
      const existing = Array.isArray(prev.images) && prev.images.length > 0 
        ? prev.images 
        : (prev.image_url ? [prev.image_url] : []);
      const combined = [...existing];
      for (const u of newUrls) {
        if (u && !combined.includes(u)) {
          combined.push(u);
        }
      }
      return {
        ...prev,
        images: combined,
        image_url: combined[0] || ''
      };
    });
    if (newUrls.length > 0 && !imagePreview) {
      setImagePreview(newUrls[0]);
    }
  };

  const setPrimaryImage = (index) => {
    setFormData(prev => {
      const imgs = [...(prev.images || [])];
      if (index >= 0 && index < imgs.length) {
        const [target] = imgs.splice(index, 1);
        imgs.unshift(target);
      }
      setImagePreview(imgs[0] || '');
      return {
        ...prev,
        images: imgs,
        image_url: imgs[0] || ''
      };
    });
  };

  const removeImage = (index) => {
    setFormData(prev => {
      const imgs = (prev.images || []).filter((_, i) => i !== index);
      setImagePreview(imgs[0] || '');
      return {
        ...prev,
        images: imgs,
        image_url: imgs[0] || ''
      };
    });
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);

        // Set default category if available
        if (data.length > 0 && !isEditMode) {
          setFormData(prev => ({ ...prev, category_id: data[0].id }));
        }

        // If we have a prefilled part number (from barcode scan), trigger AI categorization
        if (prefilledPartNumber && data.length > 0 && !isEditMode) {
          suggestCategory(prefilledPartNumber, data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, [isEditMode]);

  // AI Category Suggestion function
  const suggestCategory = async (partNumber, availableCategories) => {
    setAiCategoryLoading(true);
    try {
      const response = await api.post('/ai/categorize', {
        part_number: partNumber,
        name: partNumber // Use part number as name hint too
      });

      const suggestion = response.data;
      if (suggestion && suggestion.category_id) {
        setAiCategorySuggestion(suggestion);
        // Auto-select the AI-suggested category
        setFormData(prev => ({ ...prev, category_id: String(suggestion.category_id) }));
        console.log(`🤖 AI suggested category: ${suggestion.category_name} (${Math.round(suggestion.confidence * 100)}% confidence, method: ${suggestion.method})`);
      }
    } catch (err) {
      console.error('AI category suggestion failed:', err);
      // Silently fail - user can still manually select
    }
    setAiCategoryLoading(false);
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!isEditMode) return;

      setLoading(true);
      try {
        const data = await getProductById(id);
        const productImages = Array.isArray(data.images) && data.images.length > 0
          ? data.images
          : (data.image_url ? [data.image_url] : []);

        setFormData({
          name: data.name,
          description: data.description,
          price: data.price,
          category_id: data.category_id ? String(data.category_id) : '',
          condition_status: data.condition_status,
          quantity: data.quantity,
          image_url: data.image_url || productImages[0] || '',
          images: productImages,
          part_number: data.part_number || '',
          barcode: data.barcode || ''
        });

        // Set image preview
        const mainImg = productImages[0] || data.image_url || '';
        if (mainImg) {
          setImagePreview(mainImg);
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

      // Ensure we have a valid primary image URL and images array
      const allImages = Array.isArray(formData.images) && formData.images.length > 0
        ? formData.images
        : (formData.image_url ? [formData.image_url] : []);
      const primaryImageUrl = allImages[0] || formData.image_url || null;

      // Prepare the product data with proper type conversions
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        image_url: primaryImageUrl,
        images: allImages,
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
    <div className="container mx-auto px-4 max-w-6xl">
      <div className="mb-6">
        <Link to="/admin/products" className="text-amber-400 hover:text-amber-300 flex items-center font-medium transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Products
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-white" style={{ fontFamily: "'Oswald', sans-serif" }}>
        {isEditMode ? 'Edit Product' : 'Add New Product'}
      </h1>

      {error && (
        <div className="bg-red-950/60 border border-red-800/80 text-red-200 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-midnight-900 border border-midnight-700 rounded-xl shadow-xl p-6 text-white">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-midnight-200 text-sm font-medium mb-2">Product Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2.5 bg-midnight-800 border border-midnight-600 rounded-lg text-white placeholder-midnight-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-midnight-200 text-sm font-medium mb-2">
                Category
                {aiCategoryLoading && (
                  <span className="ml-2 text-sm text-amber-400 animate-pulse">🤖 AI analyzing...</span>
                )}
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full p-2.5 bg-midnight-800 border border-midnight-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                required
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
              {aiCategorySuggestion && (
                <div className="mt-2 p-2 bg-midnight-800 border border-midnight-600 rounded-lg text-xs flex items-center gap-2 text-midnight-200">
                  <span>{aiCategorySuggestion.method === 'ai' ? '🤖' : '🔤'}</span>
                  <span>
                    <strong className="text-amber-300">AI Suggestion:</strong> {aiCategorySuggestion.category_name}
                    <span className="ml-2 text-midnight-400">
                      ({Math.round(aiCategorySuggestion.confidence * 100)}% confidence)
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Part Number and Barcode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-midnight-200 text-sm font-medium mb-2">Part Number</label>
              <input
                type="text"
                name="part_number"
                value={formData.part_number}
                onChange={handleChange}
                className="w-full p-2.5 bg-midnight-800 border border-midnight-600 rounded-lg text-white placeholder-midnight-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                placeholder="e.g., YAM-RD350-001"
              />
              <p className="text-xs text-midnight-400 mt-1">Used to auto-generate barcode if not provided</p>
            </div>

            <div>
              <label className="block text-midnight-200 text-sm font-medium mb-2">Barcode</label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                className="w-full p-2.5 bg-midnight-950 border border-midnight-700 rounded-lg text-midnight-300 placeholder-midnight-500"
                placeholder="Auto-generated from part number"
                readOnly={isEditMode && !!formData.barcode}
              />
              {isEditMode && formData.barcode && (
                <div className="mt-2 p-3 bg-midnight-950 border border-midnight-700 rounded-lg">
                  <p className="text-xs text-midnight-400 mb-2">Barcode Preview:</p>
                  <div className="bg-white p-2 rounded inline-block">
                    <InlineBarcode barcode={formData.barcode} width={1.5} height={35} />
                  </div>
                  <p className="text-xs text-emerald-400 mt-2">✓ Barcode: {formData.barcode}</p>
                </div>
              )}
              {!formData.barcode && (
                <p className="text-xs text-midnight-400 mt-1">Will be auto-generated when product is saved</p>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-midnight-200 text-sm font-medium mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-2.5 bg-midnight-800 border border-midnight-600 rounded-lg text-white placeholder-midnight-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              rows="4"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-midnight-200 text-sm font-medium mb-2">Price ($)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full p-2.5 bg-midnight-800 border border-midnight-600 rounded-lg text-white placeholder-midnight-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-midnight-200 text-sm font-medium mb-2">Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full p-2.5 bg-midnight-800 border border-midnight-600 rounded-lg text-white placeholder-midnight-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-midnight-200 text-sm font-medium mb-2">Condition</label>
              <select
                name="condition_status"
                value={formData.condition_status}
                onChange={handleChange}
                className="w-full p-2.5 bg-midnight-800 border border-midnight-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
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
            <label className="block text-midnight-100 mb-2 text-lg font-semibold">Product Image</label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Upload Section */}
                <div className="border-2 border-dashed border-midnight-600 rounded-lg p-4 bg-midnight-800/40">
                  <label className="block text-midnight-200 font-medium text-sm mb-3">
                    📁 Upload Image from Computer
                  </label>

                  <div className="mb-3">
                    {/* Visible file input */}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/jpg"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      id="file-input"
                      className="w-full p-2 border border-midnight-600 rounded-lg bg-midnight-900 text-midnight-200 mb-3 text-sm"
                    />

                    {/* Alternative custom button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-midnight-700 hover:bg-midnight-600 text-midnight-100 py-2.5 px-4 rounded-lg font-medium transition-colors mb-3 border border-midnight-600 text-sm"
                    >
                      📂 Browse Files (Alternative)
                    </button>
                  </div>

                  {/* Show selected file name */}
                  {imageFile && (
                    <div className="bg-midnight-950 p-2.5 rounded-lg border border-midnight-700 mb-3">
                      <p className="text-xs text-midnight-200 font-medium">
                        <strong>Selected:</strong> {imageFile.name}
                      </p>
                      <p className="text-[11px] text-midnight-400">
                        Size: {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}

                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!imageFile || uploadLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-midnight-700 disabled:opacity-50 text-white py-2.5 px-4 rounded-lg font-medium transition-colors text-sm"
                  >
                    {uploadLoading ? '⏳ Uploading...' : '📤 Upload to Server'}
                  </button>

                  <div className="text-xs text-midnight-400 mt-3 p-2 bg-midnight-950/60 rounded border border-midnight-800">
                    📋 <strong>Supported formats:</strong> JPG, JPEG, PNG, GIF<br />
                    📏 <strong>Maximum size:</strong> 5MB
                  </div>
                </div>

                {/* Web Search Section */}
                <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-amber-300 text-sm flex items-center gap-1.5">
                      <span>🌐</span> Find Images on the Web
                    </span>
                    <span className="text-[11px] bg-amber-900/60 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-full font-medium">
                      Auto-Finder
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/80 mb-3">
                    Search parts catalogs and vintage archives for authentic OEM photos, then copy them directly to your server.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsWebSearchOpen(true)}
                    className="w-full bg-amber-700 hover:bg-amber-600 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow transition-colors text-sm"
                  >
                    <span>🔍</span> Search Web for Part Image
                  </button>
                </div>

                {/* URL Section */}
                <div className="border border-midnight-700 rounded-lg p-4 bg-midnight-800/40">
                  <label className="block text-midnight-200 mb-2 font-medium text-sm">🔗 Or Enter Image URL</label>
                  <input
                    type="text"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-midnight-900 border border-midnight-600 rounded-lg text-white placeholder-midnight-400 text-sm"
                    placeholder="https://example.com/image.jpg or /images/products/..."
                  />
                  <p className="text-xs text-midnight-400 mt-1">
                    Enter a direct URL or local path to an image file
                  </p>
                </div>
              </div>

              {/* Multi-Image Gallery Manager */}
              <div>
                {(formData.images && formData.images.length > 0) || imagePreview ? (
                  <div className="border border-midnight-700 rounded-lg p-4 bg-midnight-800/40 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-midnight-200 flex items-center gap-1.5">
                        <span>🖼️</span> Product Images ({formData.images?.length || (imagePreview ? 1 : 0)})
                      </p>
                      <span className="text-[11px] bg-amber-900/60 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-full font-medium">
                        ⭐ First is Cover
                      </span>
                    </div>

                    {/* Main Active Preview */}
                    <div className="relative w-full h-52 bg-midnight-950 border border-midnight-700 rounded-lg overflow-hidden shadow-sm flex items-center justify-center">
                      <PlaceholderImage
                        src={processImageUrl(imagePreview || formData.images?.[0])}
                        alt="Product preview"
                        className="object-contain w-full h-full"
                        placeholderText="Image Loading..."
                      />
                      <span className="absolute bottom-2 left-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                        Preview
                      </span>
                    </div>

                    {/* Thumbnails Strip */}
                    {formData.images && formData.images.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-midnight-300 mb-1.5">
                          Gallery Thumbnails (click to view, star to make cover):
                        </p>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          {formData.images.map((imgUrl, idx) => {
                            const isMain = idx === 0;
                            const isCurrentlyPreviewed = imagePreview === imgUrl;

                            return (
                              <div
                                key={idx}
                                onClick={() => setImagePreview(imgUrl)}
                                className={`group relative aspect-square bg-midnight-950 border-2 rounded-md overflow-hidden cursor-pointer transition-all ${
                                  isCurrentlyPreviewed
                                    ? 'border-amber-500 ring-2 ring-amber-400/80'
                                    : 'border-midnight-700 hover:border-midnight-500'
                                }`}
                              >
                                <img
                                  src={processImageUrl(imgUrl)}
                                  alt={`Thumbnail ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />

                                {/* Index / Cover Badge */}
                                <span
                                  className={`absolute top-1 left-1 text-[9px] font-bold px-1 rounded ${
                                    isMain
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-black/70 text-white'
                                  }`}
                                >
                                  {isMain ? '★ Cover' : `#${idx + 1}`}
                                </span>

                                {/* Controls on hover */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1">
                                  {!isMain && (
                                    <button
                                      type="button"
                                      title="Set as Main Cover"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPrimaryImage(idx);
                                      }}
                                      className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] p-1 rounded font-bold"
                                    >
                                      ★
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    title="Remove this image"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeImage(idx);
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white text-[10px] p-1 rounded font-bold"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-midnight-700 rounded-lg p-6 flex items-center justify-center h-52 bg-midnight-900/50">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📷</div>
                      <p className="text-midnight-300 font-medium text-sm">No images attached yet</p>
                      <p className="text-xs text-midnight-400 mt-1">Use "Search Web" above to find & select images</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              to="/admin/products"
              className="bg-midnight-800 hover:bg-midnight-700 text-midnight-200 border border-midnight-600 px-6 py-2.5 rounded-lg mr-3 transition-colors font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-[#8B2332] hover:bg-[#a32a3b] text-white px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
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

      {/* Web Image Search Modal */}
      <WebImageSearchModal
        isOpen={isWebSearchOpen}
        onClose={() => setIsWebSearchOpen(false)}
        initialQuery={`Yamaha RD350 ${formData.part_number || ''} ${formData.name || ''}`.trim()}
        partNumber={formData.part_number}
        productId={id}
        onSelectImages={(newUrls) => {
          addImages(newUrls);
        }}
        onSelectImage={(newUrl) => {
          addImages([newUrl]);
        }}
      />
    </div>
  );
};

export default ProductForm;
