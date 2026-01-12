import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { getProducts } from '../../api/products';

/**
 * BarcodeScanner Component
 * Uses html5-qrcode for reliable camera-based barcode scanning
 * Supports CODE_128, CODE_39, EAN, UPC formats commonly used for product labels
 */
const BarcodeScanner = ({
    onScan,
    onError,
    showPreview = true,
    width = 320,
    height = 280
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
    const [scanStatus, setScanStatus] = useState('');

    const html5QrCodeRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    // Supported barcode formats for product labels
    const formatsToSupport = [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.ITF
    ];

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
                    setError('No camera found');
                }
            })
            .catch(err => {
                console.error('Camera detection error:', err);
                setHasCamera(false);
                setError('Camera access denied. Please allow camera permission.');
            });

        return () => {
            stopScanning();
        };
    }, []);

    // Handle successful scan
    const onScanSuccess = useCallback((decodedText, decodedResult) => {
        console.log('✅ Scanned barcode:', decodedText);
        console.log('📊 Format:', decodedResult?.result?.format?.formatName || 'Unknown');

        // Prevent duplicate scans
        if (decodedText === lastScannedCode) return;
        setLastScannedCode(decodedText);
        setTimeout(() => setLastScannedCode(''), 2000);

        // Vibrate on success (mobile)
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

        // Autofill the search box
        setManualInput(decodedText);
        setError(null);
        setScanStatus(`✅ Scanned: ${decodedText}`);

        // Stop scanning and lookup product
        stopScanning();
        lookupProduct(decodedText);
    }, [lastScannedCode]);

    // Start scanning
    const startScanning = async () => {
        if (!selectedCameraId) {
            setError('No camera selected');
            return;
        }

        setError(null);
        setScanStatus('🔄 Initializing camera...');

        try {
            // Create new instance with format configuration
            html5QrCodeRef.current = new Html5Qrcode("barcode-scanner-region", {
                formatsToSupport: formatsToSupport,
                verbose: false
            });

            const config = {
                fps: 15,  // Higher FPS for better scanning
                qrbox: { width: 280, height: 80 }, // Wide rectangle for 1D barcodes
                aspectRatio: 1.777778, // 16:9 for better camera view
                disableFlip: false,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true // Use native detector if available
                }
            };

            await html5QrCodeRef.current.start(
                selectedCameraId,
                config,
                onScanSuccess,
                () => { } // Ignore per-frame failures
            );

            setScanning(true);
            setScanStatus('📷 Scanning... Hold barcode steady in the box');
            console.log('📷 Scanner started successfully');
        } catch (err) {
            console.error('Failed to start scanner:', err);
            setError(`Camera error: ${err.message || err}. Try refreshing the page.`);
            setScanStatus('');
            setScanning(false);
        }
    };

    // Stop scanning
    const stopScanning = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
            } catch (err) {
                console.log('Stop scanner note:', err);
            }
        }
        if (html5QrCodeRef.current) {
            try {
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.log('Clear scanner note:', err);
            }
            html5QrCodeRef.current = null;
        }
        setScanning(false);
        if (!error) {
            setScanStatus('');
        }
    };

    // Lookup product by barcode/part number
    const lookupProduct = async (barcodeValue) => {
        if (!barcodeValue) return;

        setScanStatus(`🔍 Searching for: ${barcodeValue}...`);

        try {
            console.log('🔍 Looking up:', barcodeValue);
            const result = await getProducts({ search: barcodeValue, limit: 10 });

            console.log('📦 API returned:', result.products?.length || 0, 'products');

            // Find exact match first (part_number or barcode)
            const exactMatch = result.products?.find(p =>
                p.part_number === barcodeValue ||
                p.barcode === barcodeValue ||
                p.part_number?.toLowerCase() === barcodeValue.toLowerCase() ||
                p.barcode?.toLowerCase() === barcodeValue.toLowerCase()
            );

            const product = exactMatch || result.products?.[0];

            if (product) {
                console.log('✅ Product found:', product.name);
                setScanStatus(`✅ Found: ${product.name}`);
                if (onScan) {
                    onScan(barcodeValue, product);
                }
            } else {
                console.log('❌ No product found for:', barcodeValue);
                setScanStatus(`❌ No product found for: ${barcodeValue}`);
                setError(`No product matches "${barcodeValue}". The product may not exist in the database.`);
                if (onScan) {
                    onScan(barcodeValue, null);
                }
            }
        } catch (err) {
            console.error('Lookup error:', err);
            setScanStatus(`❌ Lookup failed`);
            setError(`Search failed: ${err.message}`);
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
            console.log('🔍 Search found:', products.length, 'products for', query);
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
        setScanStatus('');

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
        setScanStatus(`✅ Selected: ${product.name}`);

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
                        style={{
                            width: `${width}px`,
                            height: scanning ? `${height}px` : '0px',
                            margin: '0 auto',
                            border: scanning ? '3px solid #4CAF50' : 'none',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            transition: 'height 0.3s ease',
                            backgroundColor: '#000'
                        }}
                    />
                </div>
            )}

            {/* Scan Status */}
            {scanStatus && (
                <div style={{
                    padding: '10px',
                    marginBottom: '10px',
                    background: scanStatus.includes('✅') ? '#e8f5e9' :
                        scanStatus.includes('❌') ? '#ffebee' : '#e3f2fd',
                    color: scanStatus.includes('✅') ? '#2e7d32' :
                        scanStatus.includes('❌') ? '#c62828' : '#1565c0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    {scanStatus}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div style={{
                    color: '#c62828',
                    padding: '12px',
                    marginBottom: '10px',
                    background: '#ffebee',
                    borderRadius: '6px',
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
                                stopScanning().then(() => setTimeout(startScanning, 100));
                            }
                        }}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #ccc',
                            fontSize: '14px',
                            backgroundColor: 'white',
                            color: '#333'
                        }}
                    >
                        {cameras.map(camera => (
                            <option key={camera.id} value={camera.id}>
                                📷 {camera.label || `Camera ${camera.id.substring(0, 8)}`}
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
                    borderRadius: '6px',
                    marginBottom: '15px',
                    color: '#e65100'
                }}>
                    📵 No camera detected. Use manual entry below.
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
                                boxSizing: 'border-box',
                                backgroundColor: 'white',
                                color: '#333'
                            }}
                        />

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
                                                {product.part_number || product.barcode || 'No Part #'}
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
                    💡 Tip: Try searching for "piston", "gasket", or part numbers like "RE-PK-350-STD"
                </div>
            </form>
        </div>
    );
};

export default BarcodeScanner;
