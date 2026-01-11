import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProductById, deleteProduct } from '../../api/products';
import { useToast } from '../../context/ToastContext';
import { processImageUrl } from '../../utils/imageHelper';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PlaceholderImage from '../../components/ui/PlaceholderImage';
import InlineBarcode from '../../components/ui/InlineBarcode';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import useConfirm from '../../hooks/useConfirm';

const AdminProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error: showError } = useToast();
    const { isOpen, confirm, handleClose, handleConfirm, dialogProps } = useConfirm();
    const barcodeRef = useRef(null);

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showShareMenu, setShowShareMenu] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            try {
                const data = await getProductById(id);
                setProduct(data);
            } catch (err) {
                console.error('Error fetching product:', err);
                setError(err.message || 'Failed to load product');
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    // Copy barcode to clipboard
    const handleCopyBarcode = async () => {
        if (!product?.barcode) return;

        try {
            await navigator.clipboard.writeText(product.barcode);
            success('Barcode copied to clipboard!');
        } catch (err) {
            showError('Failed to copy barcode');
        }
    };

    // Copy product link to clipboard
    const handleCopyLink = async () => {
        const productUrl = `${window.location.origin}/products/${product.id}`;

        try {
            await navigator.clipboard.writeText(productUrl);
            success('Product link copied to clipboard!');
            setShowShareMenu(false);
        } catch (err) {
            showError('Failed to copy link');
        }
    };

    // Share to WhatsApp
    const handleShareWhatsApp = () => {
        const productUrl = `${window.location.origin}/products/${product.id}`;
        const message = `Check out this product: ${product.name}\nPrice: $${parseFloat(product.price).toFixed(2)}\nPart Number: ${product.barcode || product.part_number || 'N/A'}\n\n${productUrl}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        setShowShareMenu(false);
    };

    // Native share (for mobile and supported browsers)
    const handleNativeShare = async () => {
        const productUrl = `${window.location.origin}/products/${product.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: product.name,
                    text: `Check out ${product.name} - $${parseFloat(product.price).toFixed(2)}`,
                    url: productUrl
                });
                setShowShareMenu(false);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    showError('Failed to share');
                }
            }
        } else {
            // Fallback to copy link
            handleCopyLink();
        }
    };

    // Delete product
    const handleDelete = async () => {
        try {
            await confirm({
                title: 'Delete Product',
                message: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
                confirmText: 'Delete',
                cancelText: 'Cancel',
                confirmButtonClass: 'bg-red-600 hover:bg-red-700'
            });

            await deleteProduct(product.id);
            success('Product deleted successfully');
            navigate('/admin/products');
        } catch {
            // User cancelled or delete failed
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <LoadingSpinner size="xl" text="Loading product details..." variant="gear" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error}</p>
                <Link to="/admin/products" className="text-blue-400 hover:underline">
                    Back to Products
                </Link>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="text-center py-12">
                <p className="text-xl text-white mb-4">Product not found</p>
                <Link to="/admin/products" className="text-blue-400 hover:underline">
                    Back to Products
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4">
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

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center">
                    <Link to="/admin/products" className="text-blue-400 hover:text-blue-300 flex items-center mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Product Details</h1>
                </div>

                <div className="flex flex-wrap gap-2">
                    {/* Share Button with Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowShareMenu(!showShareMenu)}
                            className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                            </svg>
                            Share
                        </button>

                        {showShareMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-midnight-800 border border-midnight-600 rounded-lg shadow-lg z-20">
                                <button
                                    onClick={handleShareWhatsApp}
                                    className="w-full text-left px-4 py-3 text-white hover:bg-midnight-700 flex items-center rounded-t-lg"
                                >
                                    <svg className="w-5 h-5 mr-3 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    WhatsApp
                                </button>
                                <button
                                    onClick={handleCopyLink}
                                    className="w-full text-left px-4 py-3 text-white hover:bg-midnight-700 flex items-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" />
                                    </svg>
                                    Copy Link
                                </button>
                                {navigator.share && (
                                    <button
                                        onClick={handleNativeShare}
                                        className="w-full text-left px-4 py-3 text-white hover:bg-midnight-700 flex items-center rounded-b-lg"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                                        </svg>
                                        More Options...
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <Link
                        to={`/admin/products/edit/${product.id}`}
                        className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Edit
                    </Link>

                    <button
                        onClick={handleDelete}
                        className="flex items-center bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Delete
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-midnight-900 border border-midnight-700 rounded-lg overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                    {/* Product Image */}
                    <div className="bg-midnight-800 rounded-lg overflow-hidden">
                        <div className="h-64 lg:h-80">
                            <PlaceholderImage
                                src={processImageUrl(product.image_url)}
                                alt={product.name}
                                className="w-full h-full object-contain"
                                placeholderText="No Image Available"
                            />
                        </div>
                    </div>

                    {/* Product Info */}
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">{product.name}</h2>
                            <p className="text-gray-400">{product.category_name || 'Uncategorized'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-midnight-800 p-4 rounded-lg">
                                <p className="text-gray-400 text-sm">Price</p>
                                <p className="text-2xl font-bold text-green-400">${parseFloat(product.price).toFixed(2)}</p>
                            </div>
                            <div className="bg-midnight-800 p-4 rounded-lg">
                                <p className="text-gray-400 text-sm">Stock</p>
                                <p className={`text-2xl font-bold ${product.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {product.quantity}
                                </p>
                            </div>
                        </div>

                        <div className="bg-midnight-800 p-4 rounded-lg">
                            <p className="text-gray-400 text-sm mb-2">Condition</p>
                            <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                                {product.condition_status}
                            </span>
                        </div>

                        {product.description && (
                            <div className="bg-midnight-800 p-4 rounded-lg">
                                <p className="text-gray-400 text-sm mb-2">Description</p>
                                <p className="text-white">{product.description}</p>
                            </div>
                        )}

                        {/* Part Number */}
                        {product.part_number && (
                            <div className="bg-midnight-800 p-4 rounded-lg">
                                <p className="text-gray-400 text-sm mb-2">Part Number</p>
                                <p className="text-white font-mono text-lg">{product.part_number}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Barcode Section */}
                <div className="border-t border-midnight-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Barcode</h3>

                    {product.barcode ? (
                        <div className="bg-white p-6 rounded-lg inline-block" ref={barcodeRef}>
                            <div className="text-center">
                                <InlineBarcode barcode={product.barcode} width={2} height={60} />
                                <div className="mt-4 flex items-center justify-center gap-3">
                                    <span className="font-mono text-lg text-gray-800">{product.barcode}</span>
                                    <button
                                        onClick={handleCopyBarcode}
                                        className="flex items-center bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors text-sm"
                                        title="Copy barcode"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                        </svg>
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-midnight-800 p-6 rounded-lg text-center">
                            <p className="text-gray-400 mb-2">No barcode assigned</p>
                            <p className="text-sm text-gray-500">
                                Add a part number to the product to generate a barcode
                            </p>
                            <Link
                                to={`/admin/products/edit/${product.id}`}
                                className="inline-block mt-4 text-blue-400 hover:text-blue-300"
                            >
                                Edit product to add part number →
                            </Link>
                        </div>
                    )}
                </div>

                {/* Metadata */}
                <div className="border-t border-midnight-700 p-6 bg-midnight-800">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500">Product ID</p>
                            <p className="text-white font-mono">{product.id}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Category ID</p>
                            <p className="text-white font-mono">{product.category_id || 'None'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Created</p>
                            <p className="text-white">{product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Last Updated</p>
                            <p className="text-white">{product.updated_at ? new Date(product.updated_at).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminProductDetail;
