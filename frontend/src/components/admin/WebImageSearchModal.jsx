import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';

const WebImageSearchModal = ({
  isOpen,
  onClose,
  initialQuery = '',
  partNumber = '',
  productId = null,
  onSelectImage,
  onSelectImages
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedUrls, setSelectedUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'batch' or specific url
  const [copiedUrl, setCopiedUrl] = useState(null);
  const { success, error: showError } = useToast();

  useEffect(() => {
    if (isOpen) {
      const defaultQ = initialQuery || (partNumber ? `Yamaha RD350 ${partNumber}` : 'Yamaha RD350');
      setQuery(defaultQ);
      setSelectedUrls([]);
      handleSearch(defaultQ);
    } else {
      setResults([]);
      setSelectedUrls([]);
      setActionLoading(null);
      setCopiedUrl(null);
    }
  }, [isOpen, initialQuery, partNumber]);

  const handleSearch = async (searchQ) => {
    const q = (searchQ !== undefined ? searchQ : query).trim();
    if (!q) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/search-image', {
        params: { query: q, limit: 16 },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data?.success) {
        setResults(response.data.results || []);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Image search error:', err);
      showError(err.response?.data?.message || 'Failed to search images');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (url) => {
    setSelectedUrls(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const selectAll = () => {
    setSelectedUrls(results.map(r => r.image).filter(Boolean));
  };

  const clearSelection = () => {
    setSelectedUrls([]);
  };

  const handleCopyUrlToClipboard = (e, url) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    success('Image URL copied to clipboard!');
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  // Single-image quick attach
  const handleChooseSingleImage = async (imgObj, copyLocal = true) => {
    setActionLoading(imgObj.image);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/admin/search-image',
        {
          product_id: productId || null,
          image_urls: [imgObj.image],
          part_number: partNumber || null,
          copy_local: copyLocal
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      if (response.data?.success) {
        const finalImages = response.data.images || [response.data.image_url];
        success(copyLocal ? 'Image copied to server and attached!' : 'Image URL attached!');
        if (onSelectImages) {
          onSelectImages(finalImages, response.data.local_copy);
        } else if (onSelectImage) {
          onSelectImage(finalImages[0], response.data.local_copy);
        }
        onClose();
      } else {
        throw new Error(response.data?.message || 'Failed to save image');
      }
    } catch (err) {
      console.error('Failed to attach image:', err);
      showError(err.response?.data?.message || err.message || 'Failed to attach image');
    } finally {
      setActionLoading(null);
    }
  };

  // Multi-image batch attach
  const handleBatchAttach = async (copyLocal = true) => {
    if (selectedUrls.length === 0) return;
    setActionLoading('batch');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/admin/search-image',
        {
          product_id: productId || null,
          image_urls: selectedUrls,
          part_number: partNumber || null,
          copy_local: copyLocal
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      if (response.data?.success) {
        const finalImages = response.data.images || [response.data.image_url];
        success(copyLocal ? `✅ ${finalImages.length} image(s) copied & attached!` : `✅ ${finalImages.length} image(s) attached!`);
        if (onSelectImages) {
          onSelectImages(finalImages, response.data.local_copy);
        } else if (onSelectImage) {
          onSelectImage(finalImages[0], response.data.local_copy);
        }
        onClose();
      } else {
        throw new Error(response.data?.message || 'Failed to save images');
      }
    } catch (err) {
      console.error('Batch attach failed:', err);
      showError(err.response?.data?.message || err.message || 'Failed to attach images');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-amber-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>🔍</span> Search & Select Part Images
            </h2>
            <p className="text-xs text-amber-200 mt-0.5">
              Select one or more vintage OEM photos from across the web to copy them permanently to your server.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-amber-200 hover:text-white text-2xl font-bold p-1 leading-none"
          >
            &times;
          </button>
        </div>

        {/* Search Bar & Controls */}
        <div className="p-4 border-b bg-gray-50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Yamaha RD350 Muffler, 360-14710-03-00..."
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-amber-800 focus:outline-none bg-white text-gray-800 text-sm"
              />
              <span className="absolute left-3 top-2.5 text-gray-400 text-lg">🔎</span>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-800 hover:bg-amber-900 text-white font-medium px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </button>
          </form>

          {/* Quick Query Chips & Multi-Select Helpers */}
          <div className="flex flex-wrap gap-2 mt-3 items-center justify-between text-xs">
            <div className="flex flex-wrap gap-2 items-center text-gray-600">
              <span className="font-semibold text-gray-700">Quick Filters:</span>
              {partNumber && (
                <button
                  type="button"
                  onClick={() => {
                    const q = `Yamaha RD350 ${partNumber}`;
                    setQuery(q);
                    handleSearch(q);
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-2.5 py-1 rounded-full transition-colors"
                >
                  Part #{partNumber}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const q = query.replace('Yamaha RD350', '').trim();
                  const newQ = `Yamaha RD350 OEM ${q}`;
                  setQuery(newQ);
                  handleSearch(newQ);
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-2.5 py-1 rounded-full transition-colors"
              >
                + OEM Vintage
              </button>
            </div>

            {results.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-amber-900 hover:text-amber-700 font-medium px-2 py-1 rounded hover:bg-amber-100 transition-colors"
                >
                  Select All ({results.length})
                </button>
                {selectedUrls.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                  >
                    Clear ({selectedUrls.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results Gallery */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <div className="animate-spin h-10 w-10 border-4 border-amber-800 border-t-transparent rounded-full mb-3"></div>
              <p className="text-sm font-medium">Scanning vintage parts catalogs & web archives...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-5xl mb-3">📷</div>
              <h3 className="text-base font-semibold text-gray-700">No images found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                Try searching with just the part number, or removing specific sub-assembly keywords.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {results.map((item, idx) => {
                const isSelected = selectedUrls.includes(item.image);
                const selectionIndex = selectedUrls.indexOf(item.image);
                const isProcessing = actionLoading === item.image;
                const isJustCopied = copiedUrl === item.image;

                return (
                  <div
                    key={idx}
                    onClick={() => toggleSelect(item.image)}
                    className={`group relative border-2 rounded-lg overflow-hidden bg-white cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-600 ring-2 ring-amber-400 shadow-md bg-amber-50/20'
                        : 'border-gray-200 hover:border-gray-400 hover:shadow'
                    }`}
                  >
                    {/* Image View */}
                    <div className="relative aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={item.thumbnail || item.image}
                        alt={item.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />

                      {/* Checkbox / Selection Badge */}
                      <div className="absolute top-2 left-2 z-10">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-all ${
                            isSelected
                              ? 'bg-amber-600 text-white scale-110'
                              : 'bg-white/80 text-gray-600 border border-gray-300 hover:bg-white'
                          }`}
                        >
                          {isSelected ? `✓${selectionIndex + 1}` : ''}
                        </div>
                      </div>

                      {/* Source & Dimension Badges */}
                      <div className="absolute bottom-1.5 left-1.5 flex flex-col gap-1 z-10">
                        {item.source && (
                          <span className="bg-black/75 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                            {item.source}
                          </span>
                        )}
                        {item.width && item.height && (
                          <span className="bg-black/75 text-amber-300 text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                            {item.width}×{item.height}
                          </span>
                        )}
                      </div>

                      {/* Copy URL Quick Button */}
                      <button
                        type="button"
                        title="Copy direct URL to clipboard"
                        onClick={(e) => handleCopyUrlToClipboard(e, item.image)}
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-700 hover:text-amber-900 p-1.5 rounded shadow text-xs transition-colors z-10"
                      >
                        {isJustCopied ? '✅ Copied' : '📋 URL'}
                      </button>

                      {/* Loading Overlay */}
                      {isProcessing && (
                        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white p-2 z-20">
                          <span className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full mb-1"></span>
                          <span className="text-xs">Saving...</span>
                        </div>
                      )}
                    </div>

                    {/* Meta & Quick Action */}
                    <div className="p-2.5 bg-white flex flex-col justify-between flex-1">
                      <p className="text-[11px] text-gray-800 line-clamp-2 font-medium mb-2" title={item.title}>
                        {item.title}
                      </p>

                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(item.image);
                          }}
                          className={`text-xs font-semibold py-1 px-2 rounded transition-colors ${
                            isSelected
                              ? 'text-amber-700 bg-amber-100'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {isSelected ? '✓ Selected' : '+ Select'}
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChooseSingleImage(item, true);
                          }}
                          className="text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white py-1 px-2 rounded font-medium transition-colors"
                          title="Attach only this image immediately"
                        >
                          ⚡ Attach Solo
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Multi-Select Floating Action Bar or Standard Footer */}
        {selectedUrls.length > 0 ? (
          <div className="px-6 py-3.5 bg-amber-950 text-white flex flex-wrap justify-between items-center gap-3 border-t border-amber-800 shadow-inner">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center bg-amber-500 text-black font-bold text-xs h-6 w-6 rounded-full">
                {selectedUrls.length}
              </span>
              <span className="text-sm font-semibold text-amber-100">
                {selectedUrls.length} image{selectedUrls.length > 1 ? 's' : ''} selected
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-amber-300 hover:text-white underline ml-2"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={actionLoading === 'batch'}
                onClick={() => handleBatchAttach(false)}
                className="bg-amber-900/80 hover:bg-amber-900 text-amber-200 border border-amber-700 text-xs font-medium py-2 px-3 rounded-lg transition-colors"
              >
                Attach Direct URLs ({selectedUrls.length})
              </button>

              <button
                type="button"
                disabled={actionLoading === 'batch'}
                onClick={() => handleBatchAttach(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 px-5 rounded-lg transition-colors shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading === 'batch' ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Copying {selectedUrls.length} Images...
                  </>
                ) : (
                  <>
                    <span>💾</span> Copy & Attach Selected ({selectedUrls.length})
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-3 bg-gray-50 border-t flex justify-between items-center text-xs text-gray-500">
            <span>
              💡 Click multiple images to select them, or use <strong>⚡ Attach Solo</strong> for a single image.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border rounded-md text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebImageSearchModal;
