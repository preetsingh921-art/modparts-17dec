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
    height = 280,
    warehouseId = null  // Optional: filter products by warehouse
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
    const [flashOn, setFlashOn] = useState(false);
    const [flashSupported, setFlashSupported] = useState(true); // Assume supported until it fails

    const html5QrCodeRef = useRef(null);
    const fileInputRef = useRef(null);
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
                    setSelectedCameraId(backCamera?.id || "environment");
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

            const dynamicVideoConstraints = {
                width: { ideal: 1920, min: 1280 }, // Demand HD feed to resolve dense barcode lines
                advanced: [{ focusMode: "continuous" }]
            };

            // ⚠️ html5-qrcode overrides the cameraTarget entirely if videoConstraints is set,
            // so we MUST inject the specific camera ID into the constraints directly!
            if (selectedCameraId && selectedCameraId !== "environment") {
                dynamicVideoConstraints.deviceId = { exact: selectedCameraId };
            } else {
                dynamicVideoConstraints.facingMode = "environment";
            }

            const config = {
                fps: 15,
                // Dynamic qrbox: uses 80% of viewfinder width so barcodes aren't clipped on any screen size
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const qrboxWidth = Math.floor(viewfinderWidth * 0.85);
                    const qrboxHeight = Math.floor(minEdge * 0.35);
                    return { width: qrboxWidth, height: qrboxHeight };
                },
                aspectRatio: 1.777778,
                disableFlip: false,
                videoConstraints: dynamicVideoConstraints
            };

            const cameraTarget = (selectedCameraId === "environment") 
                ? { facingMode: "environment" } 
                : selectedCameraId;

            await html5QrCodeRef.current.start(
                cameraTarget,
                config,
                onScanSuccess,
                () => { } // Ignore per-frame failures
            );

            setScanning(true);
            setFlashOn(false); // Reset flash state on new start
            setScanStatus('📷 Scanning... Hold barcode steady in the box');
            console.log('📷 Scanner started successfully');
        } catch (err) {
            console.error('Failed to start scanner:', err);
            setError(`Camera error: ${err.message || err}. Try refreshing the page.`);
            setScanStatus('');
            setScanning(false);
        }
    };

    // Toggle Flash (Torch)
    const toggleFlash = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                const advancedConstraints = { torch: !flashOn };
                await html5QrCodeRef.current.applyVideoConstraints({ advanced: [advancedConstraints] });
                setFlashOn(!flashOn);
            } catch (err) {
                console.warn('Flash not supported on this device/camera:', err);
                setFlashSupported(false);
                setError('Flash (Torch) feature is not supported on this device/browser.');
            }
        }
    };

    // Scan from Image File
    const handleFileUploadScan = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setScanStatus('🔄 Processing image file...');
            setError(null);
            
            // If camera is open, we stop it first to prevent conflicts
            if (scanning) {
                await stopScanning();
            }

            try {
                let decoded = null;

                // Attempt 1: Native BarcodeDetector API (if supported by OS/browser)
                // This uses native ML vision frameworks and easily finds small barcodes in 12MP photos
                if ('BarcodeDetector' in window) {
                    try {
                        const detector = new window.BarcodeDetector();
                        const bitmap = await createImageBitmap(file);
                        const barcodes = await detector.detect(bitmap);
                        if (barcodes && barcodes.length > 0) {
                            decoded = barcodes[0].rawValue;
                            console.log('✅ Native BarcodeDetector succeeded');
                        }
                    } catch (nativeErr) {
                        console.warn('Native BarcodeDetector failed, falling back:', nativeErr);
                    }
                }

                // JS Scanner Fallbacks
                if (!decoded) {
                    const tempScanner = new Html5Qrcode("file-scanner-region");

                    // Attempt 2: HTML5Qrcode on the original image
                    try {
                        const result = await tempScanner.scanFileV2(file, false);
                        if (result && result.decodedText) {
                            decoded = result.decodedText;
                        }
                    } catch (v2Err) {
                        try {
                            const fallbackResult = await tempScanner.scanFile(file, false);
                            if (fallbackResult) decoded = fallbackResult;
                        } catch (v1Err) {
                            console.warn('HTML5Qrcode full-image scan failed.');
                        }
                    }

                    // Attempt 3: Smart Auto-Crop via Canvas
                    // Users often take a picture where the barcode is centered but very small relative to the photo.
                    // Cropping out the edges helps the JS scanner find the alignment markers.
                    if (!decoded) {
                        try {
                            setScanStatus('🔄 Enhancing and centering image...');
                            const img = await createImageBitmap(file);
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            // Crop the center 50% of the image
                            const cropWidth = img.width * 0.5;
                            const cropHeight = img.height * 0.5;
                            const startX = (img.width - cropWidth) / 2;
                            const startY = (img.height - cropHeight) / 2;
                            
                            // Scale down if massive (helps zxing performance)
                            const maxDimension = 1000;
                            const scale = Math.min(1, maxDimension / Math.max(cropWidth, cropHeight));
                            
                            canvas.width = cropWidth * scale;
                            canvas.height = cropHeight * scale;
                            
                            // Apply contrast enhancement
                            ctx.filter = 'contrast(1.2) grayscale(100%)';
                            ctx.drawImage(img, startX, startY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
                            
                            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
                            const croppedFile = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
                            
                            try {
                                decoded = await tempScanner.scanFile(croppedFile, false);
                                console.log('✅ Auto-crop scan succeeded');
                            } catch (cropErr) {
                                console.warn('Auto-crop scan failed.');
                            }
                        } catch (cropProcErr) {
                            console.warn('Auto-crop processing failed:', cropProcErr);
                        }
                    }
                }

                if (decoded) {
                    onScanSuccess(decoded, { result: { format: { formatName: 'Image File Upload' } } });
                } else {
                    throw new Error('No barcode detected in image');
                }
            } catch (err) {
                console.error('File scan error:', err);
                setError('Could not dynamically find a barcode in the image. Please try taking a closer photo or entering it manually.');
                setScanStatus('');
            }
            
            // Reset input so the same file could be selected again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
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
            console.log('🔍 Looking up:', barcodeValue, 'in warehouse:', warehouseId);
            // Search globally first (don't filter by warehouse — the parent handles warehouse logic)
            const searchParams = { search: barcodeValue, limit: 50 };
            const result = await getProducts(searchParams);

            console.log('📦 API returned:', result.products?.length || 0, 'products');

            // Find exact match first (part_number or barcode), including hyphens
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
            // Search globally so products from any warehouse appear in suggestions
            const searchParams = { search: query, limit: 20 };
            const result = await getProducts(searchParams);
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
            {/* Hidden div for file scanning */}
            <div id="file-scanner-region" style={{ display: 'none' }}></div>

            {/* Scanner Region */}
            {showPreview && hasCamera && (
                <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: `${width}px`, height: scanning ? `${height}px` : '0px', transition: 'height 0.3s ease' }}>
                        <style>{`
                            @keyframes scanning-laser {
                                0% { top: 10%; opacity: 0; }
                                10% { opacity: 1; }
                                90% { opacity: 1; }
                                100% { top: 90%; opacity: 0; }
                            }
                            .laser-line {
                                position: absolute;
                                left: 10%;
                                width: 80%;
                                height: 2px;
                                background-color: red;
                                box-shadow: 0 0 10px 2px red;
                                z-index: 10;
                                animation: scanning-laser 2.5s infinite linear;
                                pointer-events: none;
                            }
                        `}</style>
                        <div
                            id="barcode-scanner-region"
                            style={{
                                width: '100%',
                                height: scanning ? `${height}px` : '0px',
                                border: scanning ? '3px solid #4CAF50' : 'none',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                transition: 'height 0.3s ease',
                                backgroundColor: '#000'
                            }}
                        />
                        {scanning && <div className="laser-line"></div>}
                    </div>
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
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
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
                            
                            {/* Flash Button */}
                            {flashSupported && (
                                <button
                                    onClick={toggleFlash}
                                    type="button"
                                    style={{
                                        padding: '14px 20px',
                                        backgroundColor: flashOn ? '#FFEB3B' : '#607D8B',
                                        color: flashOn ? 'black' : 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                    }}
                                    title="Toggle Flash / Torch"
                                >
                                    {flashOn ? '🔦 Flash ON' : '💡 Flash OFF'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Image Upload Area */}
            <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px', fontWeight: 'bold' }}>OR SCAN FROM IMAGE</p>
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUploadScan} 
                    ref={fileInputRef}
                    style={{
                        padding: '10px',
                        border: '1px dashed #ccc',
                        borderRadius: '6px',
                        backgroundColor: '#f9f9f9',
                        width: '280px',
                        fontSize: '14px',
                        cursor: 'pointer'
                    }} 
                />
            </div>

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
