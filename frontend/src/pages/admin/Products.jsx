import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, deleteProduct, bulkCreateProducts } from '../../api/products';
import { getCategories } from '../../api/categories';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import useConfirm from '../../hooks/useConfirm';
import { processImageUrl, handleImageError } from '../../utils/imageHelper';
import CSVImportModal from '../../components/admin/CSVImportModal';
import Pagination from '../../components/ui/Pagination';
import ProgressBar from '../../components/ui/ProgressBar';
import { exportToPDF, exportToXLSX } from '../../utils/exportUtils';
import PlaceholderImage from '../../components/ui/PlaceholderImage';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import InlineBarcode from '../../components/ui/InlineBarcode';
import { printBulkBarcodeLabels } from '../../utils/barcodeUtils';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' is a string
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { success, error: showError } = useToast();
  const { isOpen, confirm, handleClose, handleConfirm, dialogProps } = useConfirm();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Export state
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);

  // Import progress state
  const [importProgress, setImportProgress] = useState(null); // { current, total, created, skipped, failed, currentName, status }

  // Selection state
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [expandedRows, setExpandedRows] = useState([]);

  const toggleRow = (id) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printSizeLevel, setPrintSizeLevel] = useState(3);

  useEffect(() => {
    const fetchData = async (retryCount = 0) => {
      setLoading(true);
      try {
        const [productsResult, categoriesData] = await Promise.all([
          getProducts({ limit: 1000 }), // Get all products for admin
          getCategories()
        ]);

        const productsData = productsResult.products || productsResult; // Handle both old and new API format

        // If we got zero products and haven't retried yet, retry once after a delay
        // (handles transient rate-limit or network hiccups)
        if ((!productsData || productsData.length === 0) && retryCount < 1) {
          console.warn('Got 0 products, retrying in 1s...');
          setTimeout(() => fetchData(retryCount + 1), 1000);
          return;
        }

        console.log('Products data:', productsData?.length, 'items');
        console.log('Categories data:', categoriesData?.length, 'items');

        setProducts(productsData || []);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (retryCount < 1) {
          console.warn('Fetch failed, retrying in 1s...');
          setTimeout(() => fetchData(retryCount + 1), 1000);
          return;
        }
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDelete = async (id) => {
    try {
      await confirm({
        title: 'Delete Product',
        message: 'Are you sure you want to delete this product? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmButtonClass: 'bg-red-600 hover:bg-red-700'
      });

      // If user confirms, proceed with deletion
      try {
        await deleteProduct(id);
        setProducts(products.filter(product => product.id !== id));
        success('Product deleted successfully');
      } catch (err) {
        showError(err.message || 'Failed to delete product');
      }
    } catch {
      // User cancelled the dialog
      console.log('Product deletion cancelled');
    }
  };

  const handleImport = async (productsData) => {
    setImportProgress({ current: 0, total: productsData.length, created: 0, skipped: 0, failed: 0, currentName: 'Preparing...', status: 'preparing' });
    try {
      const results = await bulkCreateProducts(productsData, (progress) => {
        setImportProgress(progress);
      });

      // Refresh the products list
      const updatedProducts = await getProducts();
      setProducts(updatedProducts);

      // Build summary message
      const parts = [];
      if (results.created.length > 0) parts.push(`${results.created.length} imported`);
      if (results.skipped.length > 0) parts.push(`${results.skipped.length} skipped (duplicates)`);
      if (results.failed.length > 0) parts.push(`${results.failed.length} failed`);
      success(parts.join(', '));
    } catch (err) {
      console.error('Error during import:', err);
      showError(err.message || 'Failed to import products');
    } finally {
      // Keep progress visible for 2 seconds after completion before clearing
      setTimeout(() => {
        setImportProgress(null);
      }, 2000);
    }
  };

  // Log filter values when they change
  useEffect(() => {
    console.log('Filter values changed:');
    console.log('Selected category:', selectedCategory);
    console.log('Search query:', searchQuery);
  }, [selectedCategory, searchQuery]);

  // Process products to ensure consistent data types
  const processedProducts = useMemo(() => {
    return products.map(product => ({
      ...product,
      // Ensure category_id is a string for consistent comparison
      category_id: product.category_id ? String(product.category_id) : null
    }));
  }, [products]);

  // Log processed products for debugging
  useEffect(() => {
    if (processedProducts.length > 0) {
      console.log('Processed products with consistent category IDs:');
      processedProducts.slice(0, 3).forEach(product => {
        console.log(`Product: ${product.name}, Category ID: ${product.category_id}, Type: ${typeof product.category_id}`);
      });
    }
  }, [processedProducts]);

  // Filter products by category and search query
  const filteredProducts = useMemo(() => {
    console.log('Filtering products with selectedCategory:', selectedCategory);

    return processedProducts.filter(product => {
      // Category filtering
      const matchesCategory = selectedCategory === 'all' ||
        (product.category_id === selectedCategory);

      // Search filtering
      const productName = (product.name || '').toLowerCase();
      const productDesc = (product.description || '').toLowerCase();
      const searchQueryLower = searchQuery.toLowerCase();

      const matchesSearch = productName.includes(searchQueryLower) ||
        productDesc.includes(searchQueryLower);

      // For debugging specific products
      if (!matchesCategory && selectedCategory !== 'all') {
        console.log(`Product ${product.name} doesn't match category. Product category: ${product.category_id}, Selected: ${selectedCategory}`);
      }

      return matchesCategory && matchesSearch;
    });
  }, [processedProducts, selectedCategory, searchQuery]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Get current products for pagination
  // If itemsPerPage is -1, show all products
  const currentProducts = itemsPerPage === -1
    ? filteredProducts
    : filteredProducts.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

  // Calculate indices for display purposes
  const indexOfFirstProduct = itemsPerPage === -1 ? 1 : (currentPage - 1) * itemsPerPage + 1;
  const indexOfLastProduct = itemsPerPage === -1 ? filteredProducts.length : Math.min(currentPage * itemsPerPage, filteredProducts.length);

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    setSelectAll(e.target.checked);
    if (e.target.checked) {
      // Select all products on the current page
      setSelectedProducts(currentProducts.map(product => product.id));
    } else {
      // Deselect all products
      setSelectedProducts([]);
    }
  };

  // Handle individual product selection
  const handleSelectProduct = (productId, isChecked) => {
    if (isChecked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
      setSelectAll(false);
    }
  };

  // Handle export of selected products
  const handleExportSelected = async (format) => {
    if (selectedProducts.length === 0) {
      showError('No products selected');
      return;
    }

    // Get the selected products data
    const productsToExport = products.filter(product =>
      selectedProducts.includes(product.id)
    );

    if (format === 'pdf') {
      await handleExportToPDF(productsToExport);
    } else if (format === 'xlsx') {
      await handleExportToExcel(productsToExport);
    }
  };

  // Handle bulk delete of selected products
  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      showError('No products selected');
      return;
    }

    try {
      await confirm({
        title: 'Delete Selected Products',
        message: `Are you sure you want to delete ${selectedProducts.length} selected products? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmButtonClass: 'bg-red-600 hover:bg-red-700'
      });

      // If user confirms, proceed with deletion
      let successCount = 0;
      let errorCount = 0;

      for (const productId of selectedProducts) {
        try {
          await deleteProduct(productId);
          successCount++;
        } catch (err) {
          console.error(`Error deleting product ${productId}:`, err);
          errorCount++;
        }
      }

      // Refresh product list
      const updatedProducts = await getProducts();
      setProducts(updatedProducts);

      // Reset selection
      setSelectedProducts([]);
      setSelectAll(false);

      if (errorCount === 0) {
        success(`Successfully deleted ${successCount} products`);
      } else {
        showError(`Deleted ${successCount} products, but failed to delete ${errorCount} products`);
      }
    } catch {
      // User cancelled the dialog
      console.log('Bulk deletion cancelled');
    }
  };

  // Handle export to PDF
  const handleExportToPDF = async (productsToExport = null) => {
    // If no specific products are provided, export all filtered products
    let dataToExport = productsToExport || filteredProducts;

    try {
      setExportFormat('pdf');
      setIsExporting(true);
      setExportProgress(0);

      // Ensure dataToExport is an array
      if (!Array.isArray(dataToExport)) {
        console.error('dataToExport is not an array:', dataToExport);
        dataToExport = Array.isArray(dataToExport) ? dataToExport : (dataToExport ? [dataToExport] : []);
      }

      // Log data for debugging
      console.log(`Preparing to export ${dataToExport.length} products to PDF`);

      // Define columns for PDF
      const columns = [
        { header: 'ID', dataKey: 'id' },
        { header: 'Name', dataKey: 'name' },
        { header: 'Category', dataKey: 'category_name' },
        { header: 'Price', dataKey: 'price' },
        { header: 'Quantity', dataKey: 'quantity' },
        { header: 'Condition', dataKey: 'condition_status' }
      ];

      // Format data for better display in PDF with error handling
      const formattedData = [];
      for (const product of dataToExport) {
        if (!product) continue;

        try {
          formattedData.push({
            ...product,
            price: `$${parseFloat(product.price || 0).toFixed(2)}`,
            category_name: product.category_name || 'Uncategorized',
            quantity: product.quantity || 0,
            condition_status: product.condition_status || 'Unknown'
          });
        } catch (err) {
          console.error('Error formatting product data:', err, product);
        }
      }

      console.log(`Formatted ${formattedData.length} products for PDF export`);

      await exportToPDF(
        formattedData,
        columns,
        'products_export',
        'Products Report',
        setExportProgress
      );

      success('Products exported to PDF successfully');
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      showError(`Failed to export products to PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle export to Excel
  const handleExportToExcel = async (productsToExport = null) => {
    // If no specific products are provided, export all filtered products
    let dataToExport = productsToExport || filteredProducts;

    try {
      setExportFormat('xlsx');
      setIsExporting(true);
      setExportProgress(0);

      // Ensure dataToExport is an array
      if (!Array.isArray(dataToExport)) {
        console.error('dataToExport is not an array:', dataToExport);
        dataToExport = Array.isArray(dataToExport) ? dataToExport : (dataToExport ? [dataToExport] : []);
      }

      // Log data for debugging
      console.log(`Preparing to export ${dataToExport.length} products to Excel`);

      // Define columns for Excel
      const columns = [
        { header: 'ID', dataKey: 'id' },
        { header: 'Name', dataKey: 'name' },
        { header: 'Description', dataKey: 'description' },
        { header: 'Category', dataKey: 'category_name' },
        { header: 'Price', dataKey: 'price' },
        { header: 'Quantity', dataKey: 'quantity' },
        { header: 'Condition', dataKey: 'condition_status' },
        { header: 'Created At', dataKey: 'created_at' },
        { header: 'Updated At', dataKey: 'updated_at' }
      ];

      // Format data for better display in Excel with error handling
      const formattedData = [];
      for (const product of dataToExport) {
        if (!product) continue;

        try {
          formattedData.push({
            ...product,
            price: parseFloat(product.price || 0).toFixed(2),
            category_name: product.category_name || 'Uncategorized',
            quantity: product.quantity || 0,
            condition_status: product.condition_status || 'Unknown',
            description: product.description || '',
            created_at: product.created_at ? new Date(product.created_at).toLocaleString() : '',
            updated_at: product.updated_at ? new Date(product.updated_at).toLocaleString() : ''
          });
        } catch (err) {
          console.error('Error formatting product data:', err, product);
        }
      }

      console.log(`Formatted ${formattedData.length} products for Excel export`);

      await exportToXLSX(
        formattedData,
        columns,
        'products_export',
        'Products',
        setExportProgress
      );

      success('Products exported to Excel successfully');
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      showError(`Failed to export products to Excel: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={dialogProps.title}
        message={dialogProps.message}
        confirmText={dialogProps.confirmText}
        cancelText={dialogProps.cancelText}
        confirmButtonClass={dialogProps.confirmButtonClass}
      />

      {/* Export Progress Bar */}
      <ProgressBar
        progress={exportProgress}
        isVisible={isExporting}
        onComplete={() => setIsExporting(false)}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white">Manage Products</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center bg-slate-700 text-slate-50 px-4 py-2 rounded hover:bg-slate-600 w-full sm:w-auto transition-colors"
            disabled={isExporting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Import CSV
          </button>
          <Link
            to="/admin/barcode-generator"
            className="flex items-center justify-center bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 w-full sm:w-auto transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Barcode Generator
          </Link>
          {selectedProducts.length > 0 && (
            <button
              onClick={() => {
                const productsToPrint = products.filter(p => selectedProducts.includes(p.id) && p.part_number);
                if (productsToPrint.length === 0) {
                  showError('No selected products have part numbers');
                  return;
                }
                setShowPrintModal(true);
              }}
              className="flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full sm:w-auto transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Labels ({selectedProducts.length})
            </button>
          )}
          <Link
            to="/admin/products/add"
            className="flex items-center justify-center bg-midnight-700 text-midnight-50 px-4 py-2 rounded hover:bg-midnight-600 w-full sm:w-auto transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Product
          </Link>
        </div>
      </div>

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        categories={categories}
      />

      {/* Import Progress Overlay */}
      {importProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
          <div className="bg-midnight-900 border border-midnight-700 rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-white mb-1">Importing Products</h3>
            <p className="text-sm text-gray-400 mb-4 truncate">
              {importProgress.current < importProgress.total
                ? <>Processing: <span className="text-emerald-400 font-medium">{importProgress.currentName}</span></>
                : <span className="text-emerald-400 font-medium">Import complete!</span>
              }
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-midnight-800 rounded-full h-4 mb-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%`,
                  background: 'linear-gradient(90deg, #10b981, #34d399)'
                }}
              />
            </div>

            {/* Percentage & Count */}
            <div className="flex justify-between text-sm mb-4">
              <span className="text-gray-400">
                {importProgress.current} of {importProgress.total} products
              </span>
              <span className="text-white font-semibold">
                {importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%
              </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-midnight-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">{importProgress.created}</div>
                <div className="text-xs text-gray-400 mt-1">Created</div>
              </div>
              <div className="bg-midnight-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">{importProgress.skipped}</div>
                <div className="text-xs text-gray-400 mt-1">Skipped</div>
              </div>
              <div className="bg-midnight-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{importProgress.failed}</div>
                <div className="text-xs text-gray-400 mt-1">Failed</div>
              </div>
            </div>

            {/* Completion indicator */}
            {importProgress.current >= importProgress.total && (
              <p className="text-center text-sm text-gray-400 mt-4 animate-pulse">Closing shortly...</p>
            )}
          </div>
        </div>
      )}

      {/* Print Labels Modal with Size Controls */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Print Barcode Labels</h3>

            <p className="text-gray-400 mb-4">
              Printing {selectedProducts.filter(id => products.find(p => p.id === id)?.part_number).length} labels
            </p>

            {/* Size Controls */}
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-3">Barcode Size</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPrintSizeLevel(Math.max(1, printSizeLevel - 1))}
                  disabled={printSizeLevel <= 1}
                  className={`w-12 h-12 rounded-lg font-bold text-2xl flex items-center justify-center ${printSizeLevel <= 1
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <span className="text-white font-semibold text-xl">
                    {['XS', 'S', 'M', 'L', 'XL'][printSizeLevel - 1]}
                  </span>
                  <span className="text-gray-400 text-sm ml-2">(Level {printSizeLevel}/5)</span>
                </div>
                <button
                  onClick={() => setPrintSizeLevel(Math.min(5, printSizeLevel + 1))}
                  disabled={printSizeLevel >= 5}
                  className={`w-12 h-12 rounded-lg font-bold text-2xl flex items-center justify-center ${printSizeLevel >= 5
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPrintModal(false)}
                className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const productsToPrint = products
                    .filter(p => selectedProducts.includes(p.id) && p.part_number)
                    .map(p => ({ ...p, barcode: p.part_number })); // Use part_number as barcode

                  // Size configurations based on level
                  const sizeConfigs = {
                    1: { width: 1.2, height: 35 },
                    2: { width: 1.8, height: 50 },
                    3: { width: 2.2, height: 65 },
                    4: { width: 2.8, height: 80 },
                    5: { width: 3.5, height: 100 }
                  };
                  const sizeConfig = sizeConfigs[printSizeLevel] || sizeConfigs[3];

                  printBulkBarcodeLabels(productsToPrint, sizeConfig);
                  setShowPrintModal(false);
                  setSelectedProducts([]);
                  setSelectAll(false);
                }}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                🖨️ Print Labels
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-midnight-900 border border-midnight-700 rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 gap-4">
          <div className="w-full md:w-1/3">
            <label className="block text-white mb-2">Filter by Category</label>
            <select
              className="w-full p-2 border border-midnight-600 bg-midnight-800 text-white rounded"
              value={selectedCategory}
              onChange={(e) => {
                // Log the selected value and its type
                const selectedValue = e.target.value;
                console.log('Category selected:', selectedValue, typeof selectedValue);

                // Set the selected category
                setSelectedCategory(selectedValue);
              }}
            >
              <option value="all">All Categories</option>
              {categories.filter(category => category && category.id && category.name).map(category => {
                // Convert category.id to string to ensure consistent type
                const categoryId = String(category.id);
                console.log(`Rendering category option: ${category.name}, ID: ${categoryId}, Type: ${typeof categoryId}`);

                return (
                  <option key={categoryId} value={categoryId}>
                    {category.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="w-full md:w-1/2">
            <label className="block text-white mb-2">Search Products</label>
            <input
              type="text"
              placeholder="Search by name or description..."
              className="w-full p-2 border border-midnight-600 bg-midnight-800 text-white rounded placeholder-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <LoadingSpinner size="xl" text="Loading products..." variant="gear" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-midnight-900 border border-midnight-700 rounded-lg shadow">
          <p className="text-xl text-midnight-300 mb-6">No products found</p>
          <Link
            to="/admin/products/add"
            className="bg-midnight-700 text-midnight-50 px-6 py-3 rounded font-semibold hover:bg-midnight-600"
          >
            Add New Product
          </Link>
        </div>
      ) : (
        <div className="bg-midnight-900 border border-midnight-700 rounded-lg shadow overflow-hidden">
          <div className="flex justify-between items-center p-4 bg-midnight-800 border-b border-midnight-700">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="select-all"
                checked={selectAll}
                onChange={handleSelectAll}
                className="h-4 w-4 text-midnight-300 rounded border-midnight-600 bg-midnight-700 focus:ring-midnight-500"
              />
              <label htmlFor="select-all" className="text-sm font-medium text-midnight-200">
                Select All
              </label>
              <span className="text-sm text-midnight-400">
                ({selectedProducts.length} selected)
              </span>
            </div>

            <div className="flex space-x-2">
              {selectedProducts.length > 0 && (
                <>
                  <button
                    onClick={handleBulkDelete}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    disabled={isExporting}
                  >
                    Delete Selected
                  </button>
                  <div className="relative">
                    <button
                      className="bg-midnight-600 text-midnight-50 px-3 py-1 rounded text-sm hover:bg-midnight-500 flex items-center"
                      onClick={() => document.getElementById('exportSelectedDropdown').classList.toggle('hidden')}
                      disabled={isExporting}
                    >
                      <span>Export Selected</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <div id="exportSelectedDropdown" className="hidden absolute right-0 mt-1 w-40 bg-midnight-800 border border-midnight-600 rounded-md shadow-lg z-10">
                      <div className="py-1">
                        <button
                          onClick={() => handleExportSelected('pdf')}
                          className="block w-full text-left px-4 py-2 text-sm text-midnight-200 hover:bg-midnight-700"
                          disabled={isExporting}
                        >
                          Export to PDF
                        </button>
                        <button
                          onClick={() => handleExportSelected('xlsx')}
                          className="block w-full text-left px-4 py-2 text-sm text-midnight-200 hover:bg-midnight-700"
                          disabled={isExporting}
                        >
                          Export to Excel
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-midnight-800">
                <tr>
                  <th className="p-4 w-10">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="text-left p-4 text-white min-w-[200px]">Product</th>
                  <th className="text-left p-4 text-white min-w-[120px]">Category</th>
                  <th className="text-left p-4 text-white min-w-[120px]">Barcode</th>
                  <th className="text-center p-4 text-white min-w-[80px]">Price</th>
                  <th className="text-center p-4 text-white min-w-[80px]">Stock</th>
                  <th className="text-center p-4 text-white min-w-[140px]">Warehouse</th>
                  <th className="text-center p-4 text-white min-w-[100px]">Condition</th>
                  <th className="text-center p-4 text-white min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentProducts.map(product => (
                  <tr key={product.id} className="border-t border-midnight-700">
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                        className="h-4 w-4 text-midnight-300 rounded border-midnight-600 bg-midnight-700 focus:ring-midnight-500"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 mr-3">
                          <PlaceholderImage
                            src={processImageUrl(product.image_url)}
                            alt={product.name}
                            className="w-full h-full object-cover rounded"
                            placeholderText="No Image"
                            showIcon={false}
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{product.name}</p>
                          <p className="text-sm text-gray-300 truncate max-w-xs">
                            {(product.description || '').substring(0, 50)}
                            {(product.description || '').length > 50 ? '...' : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-white">{product.category_name || 'Uncategorized'}</td>
                    <td className="p-4">
                      {product.part_number ? (
                        <div className="flex flex-col items-start">
                          <InlineBarcode barcode={product.part_number} width={1} height={25} showPartNumber={false} />
                          <span className="text-xs font-mono text-gray-400 mt-1">
                            {product.part_number}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 italic">No part number</span>
                      )}
                    </td>
                    <td className="p-4 text-center text-white">${parseFloat(product.price).toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <span className={`font-semibold ${product.quantity <= 0 ? 'text-red-400' : product.quantity <= 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {product.quantity}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {product.warehouse_name ? (
                        <div className="text-sm">
                          <span className="text-blue-400">📍 {product.warehouse_name}</span>
                          {product.bin_number && (
                            <span className="text-gray-400 block">Bin: {product.bin_number}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm italic">Not assigned</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block px-2 py-1 bg-midnight-600 text-midnight-100 rounded-full text-xs">
                        {product.condition_status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center space-x-2">
                        <Link
                          to={`/admin/products/view/${product.id}`}
                          className="text-green-400 hover:text-green-300"
                          title="View Product"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        </Link>
                        <Link
                          to={`/admin/products/edit/${product.id}`}
                          className="text-midnight-300 hover:text-midnight-100"
                          title="Edit Product"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Delete Product"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col space-y-4 p-4">
            {currentProducts.map(product => (
              <div key={product.id} className="bg-midnight-800 rounded-lg border border-midnight-600 p-4 shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 max-w-[85%]">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                      className="mt-1 flex-shrink-0 h-4 w-4 text-midnight-300 rounded border-midnight-600 bg-midnight-700"
                    />
                    <div className="w-12 h-12 flex-shrink-0">
                      <PlaceholderImage
                        src={processImageUrl(product.image_url)}
                        alt={product.name}
                        className="w-full h-full object-cover rounded"
                        placeholderText="No Image"
                      />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-semibold text-white text-sm truncate">{product.name}</h3>
                      <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                        <span className="text-[10px] text-midnight-300 bg-midnight-700 px-2 py-0.5 rounded uppercase tracking-wider">
                          {product.category_name || 'Uncategorized'}
                        </span>
                        <span className={`text-xs font-semibold ${product.quantity <= 0 ? 'text-red-400' : product.quantity <= 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                          Stock: {product.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRow(product.id)}
                    className="p-1 text-midnight-400 hover:text-white transition-colors flex-shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform ${expandedRows.includes(product.id) ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {/* Always visible quick actions line */}
                <div className="mt-4 flex items-center justify-between border-t border-midnight-700 pt-3">
                  <span className="text-white font-bold">${parseFloat(product.price).toFixed(2)}</span>
                  <div className="flex space-x-4">
                    <Link to={`/admin/products/view/${product.id}`} className="text-green-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                    </Link>
                    <Link to={`/admin/products/edit/${product.id}`} className="text-midnight-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </Link>
                    <button onClick={() => handleDelete(product.id)} className="text-red-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                </div>

                {/* Expandable region */}
                {expandedRows.includes(product.id) && (
                  <div className="mt-4 bg-midnight-900 rounded p-3 text-sm space-y-3 border border-midnight-700">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-midnight-400 block text-xs uppercase tracking-wider mb-1">Warehouse</span>
                        <span className="text-white text-sm">{product.warehouse_name || 'Not assigned'}</span>
                      </div>
                      <div>
                        <span className="text-midnight-400 block text-xs uppercase tracking-wider mb-1">Bin</span>
                        <span className="text-white text-sm">{product.bin_number || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-midnight-400 block text-xs uppercase tracking-wider mb-1">Condition</span>
                        <span className="inline-block px-2 py-0.5 bg-midnight-600 text-midnight-100 rounded text-xs">
                          {product.condition_status}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-midnight-400 block text-xs uppercase tracking-wider mb-1">Part Number</span>
                        <span className="text-white font-mono text-sm">{product.part_number || 'N/A'}</span>
                      </div>
                    </div>
                    {product.part_number && (
                      <div className="mt-3 pt-3 border-t border-midnight-700 flex justify-center bg-white p-2 rounded">
                        <InlineBarcode barcode={product.part_number} width={1.8} height={40} showPartNumber={false} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            totalItems={filteredProducts.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      )}

      {!loading && !error && filteredProducts.length > 0 && (
        <div className="mt-4 text-sm text-midnight-400">
          Showing {indexOfFirstProduct + 1} to {Math.min(indexOfLastProduct, filteredProducts.length)} of {filteredProducts.length} products
        </div>
      )}
    </div>
  );
};

export default Products;
