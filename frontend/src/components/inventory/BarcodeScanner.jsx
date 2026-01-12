import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getProducts } from '../../api/products';

/**
 * BarcodeScanner Component
 * Uses html5-qrcode for reliable camera-based barcode scanning
 * Autofills scanned barcode to search box and triggers product lookup
 */
const BarcodeScanner = ({
    onScan,
    onError,
    showPreview = true,
    width = 320,
    height = 240
}) => {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState(null);
    const [manualInput, setManualInput] = useState('');
    const [hasCamera, setHasCamera] = useState(true);
    const [cameras, setCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [lastScannedCode, setLastScannedCode] = useState('');

    const scannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    // Initialize - get available cameras
    useEffect(() => {
        Html5Qrcode.getCameras()
            .then(devices => {
                if (devices && devices.length > 0) {
                    setCameras(devices);
                    // Prefer back camera
                    const backCamera = devices.find(d =>
                        d.label.toLowerCase().includes('back') ||
                        d.label.toLowerCase().includes('rear') ||
                        d.label.toLowerCase().includes('environment')
                    );
                    setSelectedCameraId(backCamera?.id || devices[0].id);
                    setHasCamera(true);
                    console.log('📷 Found cameras:', devices.map(d => d.label));
                } else {
                    setHasCamera(false);
                }
            })
            .catch(err => {
                console.error('Camera detection error:', err);
                setHasCamera(false);
            });

        return () => {
            stopScanning();
        };
    }, []);

    // Handle successful scan
    const onScanSuccess = useCallback((decodedText, decodedResult) => {
        console.log('✅ Scanned barcode:', decodedText, decodedResult);

        // Prevent duplicate scans of same code within 2 seconds
        if (decodedText === lastScannedCode) return;
        setLastScannedCode(decodedText);
        setTimeout(() => setLastScannedCode(''), 2000);

        // Vibrate on success (mobile)
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        // Autofill the search box with scanned barcode
        setManualInput(decodedText);
        setError(null);

        // Stop scanning
        stopScanning();

        // Lookup product
        lookupProduct(decodedText);
    }, [lastScannedCode]);

    // Handle scan failure (this fires continuously, so we ignore it mostly)
    const onScanFailure = useCallback((errorMessage) => {
        // Ignore most scan failures - they happen every frame when no barcode is visible
        // Only log real errors
        if (errorMessage && !errorMessage.includes('No MultiFormat Readers') && !errorMessage.includes('NotFoundException')) {
            console.log('Scan frame:', errorMessage);
        }
    }, []);

    // Start scanning
    const startScanning = async () => {
        if (!selectedCameraId) {
            setError('No camera selected');
            return;
        }

        setError(null);
        setScanning(true);

        try {
            // Create new instance
            html5QrCodeRef.current = new Html5Qrcode("barcode-scanner-region");

            await html5QrCodeRef.current.start(
                selectedCameraId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 100 }, // Rectangle for barcode
                    aspectRatio: 1.5
                },
                onScanSuccess,
                onScanFailure
            );

            console.log('📷 Scanner started successfully');
        } catch (err) {
            console.error('Failed to start scanner:', err);
            setError(`Camera error: ${err.message || err}`);
            setScanning(false);
        }
    };

    // Stop scanning
    const stopScanning = async () => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.log('Stop scanner:', err);
            }
            html5QrCodeRef.current = null;
        }
        setScanning(false);
    };

    // Lookup product by barcode/part number
    const lookupProduct = async (barcodeValue) => {
        if (!barcodeValue) return;

        try {
            console.log('🔍 Looking up:', barcodeValue);
            const result = await getProducts({ search: barcodeValue, limit: 5 });

            // Find exact match first
            const exactMatch = result.products?.find(p =>
                p.part_number === barcodeValue ||
                p.barcode === barcodeValue
            );

            const product = exactMatch || result.products?.[0];

            if (product) {
                console.log('✅ Product found:', product.name);
                if (onScan) {
                    onScan(barcodeValue, product);
                }
            } else {
                console.log('❌ Product not found for:', barcodeValue);
                setError(`No product found for: ${barcodeValue}`);
                if (onScan) {
                    onScan(barcodeValue, null);
                }
            }
        } catch (err) {
            console.error('Lookup error:', err);
            setError(`Lookup failed: ${err.message}`);
            if (onError) onError(err);
        }
    };

    // Product search with debounce
    const searchProductsDebounced = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        setIsSearching(true);
        try {
            const result = await getProducts({ search: query, limit: 10 });
            const products = result.products || [];
            setSearchResults(products);
            setShowDropdown(products.length > 0);
        } catch (err) {
            console.error('Search error:', err);
            setSearchResults([]);
        }
        setIsSearching(false);
    }, []);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setManualInput(value);
        setError(null);

        // Debounced search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            searchProductsDebounced(value);
        }, 400);
    };

    const handleSelectProduct = (product) => {
        const barcodeValue = product.part_number || product.barcode || product.name;
        setManualInput(barcodeValue);
        setShowDropdown(false);
        setSearchResults([]);
        setError(null);

        if (onScan) {
            onScan(barcodeValue, product);
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualInput.trim()) {
            setShowDropdown(false);
            lookupProduct(manualInput.trim());
        }
    };

    return (
        <div className="barcode-scanner" style={{ textAlign: 'center' }}>
            {/* Scanner Region */}
            {showPreview && hasCamera && (
                <div style={{ marginBottom: '15px' }}>
                    <div
                        id="barcode-scanner-region"
                        ref={scannerRef}
                        style={{
                            width: `${width}px`,
                            height: scanning ? `${height}px` : '0px',
                            margin: '0 auto',
                            border: scanning ? '3px solid #4CAF50' : 'none',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            transition: 'height 0.3s ease'
                        }}
                    />

                    {scanning && (
                        <div style={{
                            marginTop: '10px',
                            color: '#4CAF50',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}>
                            🔴 Scanning... Point camera at barcode
                        </div>
                    )}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div style={{
                    color: '#c62828',
                    padding: '12px',
                    marginBottom: '10px',
                    background: '#ffebee',
                    borderRadius: '4px',
                    fontSize: '14px',
                    border: '1px solid #ef5350'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Camera Selection */}
            {hasCamera && cameras.length > 1 && (
                <div style={{ marginBottom: '10px' }}>
                    <select
                        value={selectedCameraId || ''}
                        onChange={(e) => {
                            setSelectedCameraId(e.target.value);
                            if (scanning) {
                                stopScanning().then(() => startScanning());
                            }
                        }}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            fontSize: '14px'
                        }}
                    >
                        {cameras.map(camera => (
                            <option key={camera.id} value={camera.id}>
                                {camera.label || `Camera ${camera.id}`}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Camera Controls */}
            {hasCamera && (
                <div style={{ marginBottom: '15px' }}>
                    {!scanning ? (
                        <button
                            onClick={startScanning}
                            type="button"
                            style={{
                                padding: '14px 28px',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)'
                            }}
                        >
                            📷 Start Camera Scan
                        </button>
                    ) : (
                        <button
                            onClick={stopScanning}
                            type="button"
                            style={{
                                padding: '14px 28px',
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 8px rgba(244, 67, 54, 0.3)'
                            }}
                        >
                            ⏹️ Stop Scanning
                        </button>
                    )}
                </div>
            )}

            {/* No Camera Message */}
            {!hasCamera && (
                <div style={{
                    padding: '15px',
                    background: '#fff3e0',
                    borderRadius: '4px',
                    marginBottom: '15px',
                    color: '#e65100'
                }}>
                    📵 No camera detected. Use manual entry or search below.
                </div>
            )}

            {/* Manual Input with Product Search */}
            <form onSubmit={handleManualSubmit} style={{ marginTop: '10px', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '280px' }}>
                        <input
                            type="text"
                            placeholder="Type part number or product name..."
                            value={manualInput}
                            onChange={handleInputChange}
                            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            style={{
                                padding: '14px 40px 14px 14px',
                                fontSize: '16px',
                                border: '2px solid #1976d2',
                                borderRadius: '8px',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}
                        />

                        {/* Search Loading Indicator */}
                        {isSearching && (
                            <div style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '16px'
                            }}>
                                ⏳
                            </div>
                        )}

                        {/* Product Search Dropdown */}
                        {showDropdown && searchResults.length > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: 'white',
                                border: '1px solid #ccc',
                                borderRadius: '0 0 8px 8px',
                                maxHeight: '250px',
                                overflowY: 'auto',
                                zIndex: 1000,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                textAlign: 'left'
                            }}>
                                {searchResults.map((product) => (
                                    <div
                                        key={product.id}
                                        onClick={() => handleSelectProduct(product)}
                                        style={{
                                            padding: '12px 14px',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid #eee',
                                            backgroundColor: 'white'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <div style={{ fontWeight: 'bold', color: '#333' }}>
                                            {product.name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                            <span style={{
                                                fontFamily: 'monospace',
                                                backgroundColor: '#e3f2fd',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                color: '#1976d2',
                                                fontWeight: 'bold'
                                            }}>
                                                {product.part_number || 'No Part #'}
                                            </span>
                                            <span style={{ marginLeft: '10px' }}>
                                                ${parseFloat(product.price || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        style={{
                            padding: '14px 24px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
                        }}
                    >
                        🔍 Look Up
                    </button>
                </div>

                <div style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
                    Scan barcode or type to search • Results appear as you type
                </div>
            </form>
        </div>
    );
};

export default BarcodeScanner;
