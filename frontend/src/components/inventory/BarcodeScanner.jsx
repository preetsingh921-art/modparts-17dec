import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { getProducts } from '../../api/products';

/**
 * BarcodeScanner Component
 * Camera-based barcode scanner with product search and autofill
 */
const BarcodeScanner = ({
    onScan,
    onError,
    autoStart = true,
    showPreview = true,
    width = 320,
    height = 240
}) => {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState(null);
    const [manualInput, setManualInput] = useState('');
    const [hasCamera, setHasCamera] = useState(true);
    const [searchResults, setSearchResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const videoRef = useRef(null);
    const readerRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const inputRef = useRef(null);

    // Initialize barcode reader with proper hints for CODE128
    useEffect(() => {
        const hints = new Map();
        // Configure supported barcode formats
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.QR_CODE
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        readerRef.current = new BrowserMultiFormatReader(hints);

        // Check for camera availability
        navigator.mediaDevices?.enumerateDevices()
            .then(devices => {
                const videoDevices = devices.filter(d => d.kind === 'videoinput');
                setHasCamera(videoDevices.length > 0);
            })
            .catch(() => setHasCamera(false));

        return () => {
            if (readerRef.current) {
                readerRef.current.reset();
            }
        };
    }, []);

    // Auto-start scanning if enabled
    useEffect(() => {
        if (autoStart && hasCamera) {
            startScanning();
        }
        return () => stopScanning();
    }, [autoStart, hasCamera]);

    // Product search with debounce
    const searchProducts = useCallback(async (query) => {
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

        // Debounced search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            searchProducts(value);
        }, 300);
    };

    const handleSelectProduct = (product) => {
        const barcodeValue = product.part_number || product.barcode;
        setManualInput(barcodeValue);
        setShowDropdown(false);
        setSearchResults([]);

        // Trigger the scan callback
        if (onScan) {
            onScan(barcodeValue);
        }
    };

    const startScanning = useCallback(async () => {
        if (!readerRef.current || !videoRef.current || !hasCamera) return;

        setError(null);
        setScanning(true);

        try {
            // Get list of video devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');

            // Prefer back camera on mobile
            const backCamera = videoDevices.find(d =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('environment')
            );
            const deviceId = backCamera?.deviceId || null;

            await readerRef.current.decodeFromVideoDevice(
                deviceId,
                videoRef.current,
                (result, error) => {
                    if (result) {
                        const barcodeText = result.getText();
                        console.log('Scanned barcode:', barcodeText, 'Format:', result.getBarcodeFormat());

                        // Vibrate on successful scan (mobile)
                        if (navigator.vibrate) {
                            navigator.vibrate(200);
                        }

                        // Set the input value for display
                        setManualInput(barcodeText);

                        if (onScan) {
                            onScan(barcodeText);
                        }

                        // Stop scanning after successful read
                        stopScanning();
                    }
                    // Ignore NotFoundException - it just means no barcode in current frame
                    if (error && error.name !== 'NotFoundException') {
                        console.error('Scanning error:', error);
                    }
                }
            );
        } catch (err) {
            console.error('Failed to start scanner:', err);
            setError('Failed to access camera. Please check permissions and try again.');
            setScanning(false);
            if (onError) onError(err);
        }
    }, [hasCamera, onScan, onError]);

    const stopScanning = useCallback(() => {
        if (readerRef.current) {
            readerRef.current.reset();
        }
        setScanning(false);
    }, []);

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualInput.trim()) {
            setShowDropdown(false);
            if (onScan) {
                onScan(manualInput.trim());
            }
        }
    };

    const handleClickOutside = useCallback(() => {
        setTimeout(() => setShowDropdown(false), 200);
    }, []);

    return (
        <div className="barcode-scanner" style={{ textAlign: 'center' }}>
            {/* Camera Preview */}
            {showPreview && hasCamera && (
                <div
                    className="scanner-preview"
                    style={{
                        position: 'relative',
                        display: 'inline-block',
                        marginBottom: '15px',
                        border: scanning ? '3px solid #4CAF50' : '3px solid #666',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: '#000'
                    }}
                >
                    <video
                        ref={videoRef}
                        width={width}
                        height={height}
                        style={{ display: 'block' }}
                        playsInline
                        muted
                    />

                    {/* Scanning overlay with targeting box */}
                    {scanning && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none'
                        }}>
                            <div style={{
                                width: '70%',
                                height: '30%',
                                border: '2px solid #4CAF50',
                                borderRadius: '4px',
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
                            }} />
                            <div style={{
                                position: 'absolute',
                                bottom: '10px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                color: 'white',
                                fontSize: '12px',
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                padding: '4px 8px',
                                borderRadius: '4px'
                            }}>
                                📷 Point camera at barcode
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div style={{
                    color: '#c62828',
                    padding: '10px',
                    marginBottom: '10px',
                    background: '#ffebee',
                    borderRadius: '4px',
                    fontSize: '14px'
                }}>
                    ⚠️ {error}
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
                                padding: '12px 24px',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold'
                            }}
                        >
                            📷 Start Camera Scan
                        </button>
                    ) : (
                        <button
                            onClick={stopScanning}
                            type="button"
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold'
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
                    <div style={{ position: 'relative', width: '250px' }}>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Enter part number or search product..."
                            value={manualInput}
                            onChange={handleInputChange}
                            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                            onBlur={handleClickOutside}
                            style={{
                                padding: '12px',
                                fontSize: '16px',
                                border: '2px solid #1976d2',
                                borderRadius: '6px',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}
                        />

                        {/* Search Loading Indicator */}
                        {isSearching && (
                            <div style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '14px'
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
                                borderRadius: '0 0 6px 6px',
                                maxHeight: '250px',
                                overflowY: 'auto',
                                zIndex: 1000,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            }}>
                                {searchResults.map((product) => (
                                    <div
                                        key={product.id}
                                        onClick={() => handleSelectProduct(product)}
                                        style={{
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid #eee',
                                            textAlign: 'left',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                    >
                                        <div style={{ fontWeight: 'bold', color: '#333' }}>
                                            {product.name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                                            <span style={{ fontFamily: 'monospace', backgroundColor: '#e3f2fd', padding: '2px 6px', borderRadius: '3px' }}>
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
                            padding: '12px 24px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '16px'
                        }}
                    >
                        🔍 Look Up
                    </button>
                </div>

                <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                    Type to search products or enter part number manually
                </div>
            </form>
        </div>
    );
};

export default BarcodeScanner;
