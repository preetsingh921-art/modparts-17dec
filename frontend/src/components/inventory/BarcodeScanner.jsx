import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { getProducts, searchProducts } from '../../api/products';

/**
 * BarcodeScanner Component
 * Camera-based barcode scanner with product search, autofill, and query logs
 */
const BarcodeScanner = ({
    onScan,
    onError,
    autoStart = false,
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
    const [queryLogs, setQueryLogs] = useState([]);
    const [selectedLog, setSelectedLog] = useState(null);
    const [showLogs, setShowLogs] = useState(false);
    const videoRef = useRef(null);
    const readerRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const inputRef = useRef(null);

    // Add to query log
    const addQueryLog = (type, params, response, error = null, duration = 0) => {
        const log = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type, // 'scan', 'search', 'lookup'
            params,
            response: error ? null : response,
            error: error ? {
                message: error.message || String(error),
                stack: error.stack,
                name: error.name
            } : null,
            success: !error,
            duration: `${duration}ms`
        };
        setQueryLogs(prev => [log, ...prev].slice(0, 50)); // Keep last 50 logs
        return log;
    };

    // Initialize barcode reader with proper hints for CODE128
    useEffect(() => {
        try {
            const hints = new Map();
            hints.set(DecodeHintType.POSSIBLE_FORMATS, [
                BarcodeFormat.CODE_128,
                BarcodeFormat.CODE_39,
                BarcodeFormat.EAN_13,
                BarcodeFormat.EAN_8,
                BarcodeFormat.UPC_A,
                BarcodeFormat.UPC_E,
                BarcodeFormat.QR_CODE,
                BarcodeFormat.DATA_MATRIX
            ]);
            hints.set(DecodeHintType.TRY_HARDER, true);

            readerRef.current = new BrowserMultiFormatReader(hints);
            console.log('✅ Barcode reader initialized successfully');
        } catch (err) {
            console.error('Failed to initialize barcode reader:', err);
            addQueryLog('init', {}, null, err);
        }

        // Check for camera availability
        if (navigator.mediaDevices?.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices()
                .then(devices => {
                    const videoDevices = devices.filter(d => d.kind === 'videoinput');
                    console.log('📷 Found video devices:', videoDevices.length);
                    setHasCamera(videoDevices.length > 0);
                })
                .catch(err => {
                    console.error('Failed to enumerate devices:', err);
                    setHasCamera(false);
                });
        } else {
            setHasCamera(false);
        }

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

    // Lookup product by barcode/part number
    const lookupProduct = async (barcodeValue) => {
        const startTime = Date.now();
        const params = { search: barcodeValue, limit: 1 };

        try {
            console.log('🔍 Looking up barcode:', barcodeValue);
            const result = await getProducts(params);
            const duration = Date.now() - startTime;

            // Find exact match first
            const exactMatch = result.products?.find(p =>
                p.part_number === barcodeValue ||
                p.barcode === barcodeValue
            );

            const product = exactMatch || result.products?.[0];

            addQueryLog('lookup', params, {
                found: !!product,
                product: product ? {
                    id: product.id,
                    name: product.name,
                    part_number: product.part_number
                } : null,
                totalResults: result.products?.length || 0
            }, null, duration);

            if (product) {
                console.log('✅ Product found:', product.name);
                if (onScan) {
                    onScan(barcodeValue, product);
                }
                return product;
            } else {
                console.log('❌ Product not found for:', barcodeValue);
                setError(`No product found for: ${barcodeValue}`);
                if (onScan) {
                    onScan(barcodeValue, null);
                }
                return null;
            }
        } catch (err) {
            const duration = Date.now() - startTime;
            console.error('❌ Lookup error:', err);
            addQueryLog('lookup', params, null, err, duration);
            setError(`Lookup failed: ${err.message}`);
            if (onError) onError(err);
            return null;
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
        const startTime = Date.now();
        const params = { search: query, limit: 10 };

        try {
            console.log('🔍 Searching products:', query);
            const result = await getProducts(params);
            const duration = Date.now() - startTime;
            const products = result.products || [];

            addQueryLog('search', params, {
                count: products.length,
                products: products.map(p => ({ id: p.id, name: p.name, part_number: p.part_number }))
            }, null, duration);

            console.log('✅ Search found:', products.length, 'products');
            setSearchResults(products);
            setShowDropdown(products.length > 0);
        } catch (err) {
            const duration = Date.now() - startTime;
            console.error('❌ Search error:', err);
            addQueryLog('search', params, null, err, duration);
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

        // Trigger the scan callback with product data
        if (onScan) {
            onScan(barcodeValue, product);
        }
    };

    const startScanning = useCallback(async () => {
        if (!readerRef.current) {
            setError('Scanner not initialized. Please refresh the page.');
            return;
        }
        if (!videoRef.current) {
            setError('Video element not ready.');
            return;
        }
        if (!hasCamera) {
            setError('No camera available.');
            return;
        }

        setError(null);
        setScanning(true);
        const startTime = Date.now();

        try {
            console.log('📷 Starting camera scan...');

            // Get list of video devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            console.log('📷 Available cameras:', videoDevices.map(d => d.label || 'Unknown'));

            // Prefer back camera on mobile
            const backCamera = videoDevices.find(d =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('environment')
            );
            const deviceId = backCamera?.deviceId || undefined;
            console.log('📷 Using camera:', backCamera?.label || 'Default');

            addQueryLog('scan_start', {
                deviceId,
                cameraLabel: backCamera?.label || 'default',
                availableCameras: videoDevices.length
            }, { status: 'scanning' });

            const controls = await readerRef.current.decodeFromVideoDevice(
                deviceId,
                videoRef.current,
                (result, scanError) => {
                    if (result) {
                        const barcodeText = result.getText();
                        const format = result.getBarcodeFormat();
                        const duration = Date.now() - startTime;

                        console.log('✅ Scanned:', barcodeText, 'Format:', format);

                        addQueryLog('scan_result', { deviceId }, {
                            barcode: barcodeText,
                            format: format?.toString() || 'Unknown'
                        }, null, duration);

                        // Vibrate on successful scan (mobile)
                        if (navigator.vibrate) {
                            navigator.vibrate(200);
                        }

                        // Set the input value and lookup product
                        setManualInput(barcodeText);
                        lookupProduct(barcodeText);

                        // Stop scanning after successful read
                        stopScanning();
                    }
                    // Log continuous scan errors (but not NotFoundException which is normal)
                    if (scanError && scanError.name !== 'NotFoundException') {
                        console.warn('Scan frame error:', scanError.name, scanError.message);
                    }
                }
            );

            console.log('✅ Scanner started successfully');
        } catch (err) {
            const duration = Date.now() - startTime;
            console.error('❌ Failed to start scanner:', err);
            addQueryLog('scan_start', {}, null, err, duration);
            setError(`Camera error: ${err.message}. Check permissions.`);
            setScanning(false);
            if (onError) onError(err);
        }
    }, [hasCamera, onError]);

    const stopScanning = useCallback(() => {
        if (readerRef.current) {
            readerRef.current.reset();
        }
        setScanning(false);
        console.log('⏹️ Scanner stopped');
    }, []);

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualInput.trim()) {
            setShowDropdown(false);
            setError(null);
            lookupProduct(manualInput.trim());
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
                        autoPlay
                    />

                    {/* Scanning overlay */}
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
                                color: 'white',
                                fontSize: '12px',
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                padding: '4px 8px',
                                borderRadius: '4px'
                            }}>
                                🔴 Scanning... Point at barcode
                            </div>
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
                    <div style={{ position: 'relative', width: '280px' }}>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Type part number or product name..."
                            value={manualInput}
                            onChange={handleInputChange}
                            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                            onBlur={handleClickOutside}
                            style={{
                                padding: '12px 40px 12px 12px',
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
                                borderRadius: '0 0 6px 6px',
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
                                            padding: '10px 12px',
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
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                                            <span style={{
                                                fontFamily: 'monospace',
                                                backgroundColor: '#e3f2fd',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                color: '#1976d2'
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
                            padding: '12px 20px',
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
                    Type to search products • Results appear as you type
                </div>
            </form>

            {/* Query Logs Toggle */}
            <div style={{ marginTop: '20px' }}>
                <button
                    type="button"
                    onClick={() => setShowLogs(!showLogs)}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: showLogs ? '#673ab7' : '#9e9e9e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px'
                    }}
                >
                    📋 {showLogs ? 'Hide' : 'Show'} Query Logs ({queryLogs.length})
                </button>
            </div>

            {/* Query Logs Panel */}
            {showLogs && (
                <div style={{
                    marginTop: '15px',
                    padding: '15px',
                    background: '#263238',
                    borderRadius: '8px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    textAlign: 'left',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                }}>
                    <div style={{ color: '#4CAF50', marginBottom: '10px', fontWeight: 'bold' }}>
                        📋 Query Logs (Last 50)
                    </div>

                    {queryLogs.length === 0 ? (
                        <div style={{ color: '#888' }}>No queries yet...</div>
                    ) : (
                        queryLogs.map((log) => (
                            <div
                                key={log.id}
                                onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                                style={{
                                    padding: '8px',
                                    marginBottom: '5px',
                                    background: selectedLog?.id === log.id ? '#37474f' : '#1e272c',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    borderLeft: `3px solid ${log.success ? '#4CAF50' : '#f44336'}`
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: log.success ? '#81c784' : '#ef5350' }}>
                                        {log.success ? '✅' : '❌'} [{log.type}] {log.duration}
                                    </span>
                                    <span style={{ color: '#888', fontSize: '10px' }}>
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>

                                {/* Expanded Log Details */}
                                {selectedLog?.id === log.id && (
                                    <div style={{ marginTop: '10px', color: '#b0bec5' }}>
                                        <div style={{ marginBottom: '8px' }}>
                                            <strong style={{ color: '#64b5f6' }}>📤 Request Params:</strong>
                                            <pre style={{
                                                margin: '4px 0',
                                                padding: '8px',
                                                background: '#1a1a1a',
                                                borderRadius: '4px',
                                                overflow: 'auto',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-all'
                                            }}>
                                                {JSON.stringify(log.params, null, 2)}
                                            </pre>
                                        </div>

                                        {log.response && (
                                            <div style={{ marginBottom: '8px' }}>
                                                <strong style={{ color: '#81c784' }}>📥 Response:</strong>
                                                <pre style={{
                                                    margin: '4px 0',
                                                    padding: '8px',
                                                    background: '#1a1a1a',
                                                    borderRadius: '4px',
                                                    overflow: 'auto',
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-all'
                                                }}>
                                                    {JSON.stringify(log.response, null, 2)}
                                                </pre>
                                            </div>
                                        )}

                                        {log.error && (
                                            <div>
                                                <strong style={{ color: '#ef5350' }}>⚠️ Error:</strong>
                                                <pre style={{
                                                    margin: '4px 0',
                                                    padding: '8px',
                                                    background: '#1a1a1a',
                                                    borderRadius: '4px',
                                                    color: '#ef5350',
                                                    overflow: 'auto',
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-all'
                                                }}>
                                                    {JSON.stringify(log.error, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}

                    {queryLogs.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setQueryLogs([])}
                            style={{
                                marginTop: '10px',
                                padding: '6px 12px',
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px'
                            }}
                        >
                            🗑️ Clear Logs
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default BarcodeScanner;
