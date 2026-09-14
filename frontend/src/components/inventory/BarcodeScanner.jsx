import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { getProducts } from '../../api/products';
import { BarcodeGunIcon, CameraViewfinderIcon } from './ScanIcons';

/**
 * High-Performance BarcodeScanner Component
 * - Primary Engine: Native window.BarcodeDetector (Hardware ML-accelerated, 5-15ms latency)
 * - Fallback Engine: Optimized Html5Qrcode / ZXing (tuned 720p resolution, continuous autofocus)
 * - Hardware USB Mode: Auto-listening for Eyoyo 2D/1D USB scanners with 120ms debounce
 * - Instant Audio & Haptic Feedback via Web Audio API + vibration
 */
const BarcodeScanner = ({
    onScan,
    onError,
    showPreview = true,
    width = 340,
    height = 280,
    warehouseId = null
}) => {
    const [scanMode, setScanMode] = useState('device'); // 'device' (USB) or 'camera'
    const [scanning, setScanning] = useState(false);
    const [isNativeMode, setIsNativeMode] = useState(false);
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
    const [flashSupported, setFlashSupported] = useState(true);
    const [deviceListening, setDeviceListening] = useState(true);
    const [deviceBuffer, setDeviceBuffer] = useState('');
    const [scanCount, setScanCount] = useState(0);
    const [scanHistory, setScanHistory] = useState([]);

    const html5QrCodeRef = useRef(null);
    const nativeVideoRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const animFrameRef = useRef(null);
    const scanningRef = useRef(false);
    const lastScannedRef = useRef('');
    const fileInputRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const deviceBufferRef = useRef('');
    const deviceTimerRef = useRef(null);
    const deviceInputRef = useRef(null);

    // Audio Feedback Generator using Web Audio API (Pleasant 880Hz chime)
    const playScanChime = useCallback(() => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08); // Quick sweep up

            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) {
            // Audio blocked or not supported
        }
    }, []);

    // Eyoyo USB 2D Barcode Scanner listener
    useEffect(() => {
        if (scanMode !== 'device' || !deviceListening) return;

        const handleKeyDown = (e) => {
            const active = document.activeElement;
            const isOurInput = deviceInputRef.current && active === deviceInputRef.current;
            const isManualSearch = active && active.getAttribute('data-scanner-manual') === 'true';
            if (isManualSearch) return;
            const isOtherInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
            if (isOtherInput && !isOurInput) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                const scannedValue = deviceBufferRef.current.trim();
                if (scannedValue.length >= 2) {
                    console.log('🔫 USB Barcode Scanned:', scannedValue);
                    setDeviceBuffer('');
                    deviceBufferRef.current = '';
                    setManualInput(scannedValue);
                    setScanStatus(`✅ Scanned: ${scannedValue}`);
                    setScanCount(prev => prev + 1);
                    setScanHistory(prev => [{ code: scannedValue, time: new Date() }, ...prev].slice(0, 10));

                    playScanChime();
                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                    lookupProduct(scannedValue);
                }
                return;
            }

            if (e.key.length === 1) {
                deviceBufferRef.current += e.key;
                setDeviceBuffer(deviceBufferRef.current);

                // Quick 120ms debounce for hardware scanner keystrokes
                clearTimeout(deviceTimerRef.current);
                deviceTimerRef.current = setTimeout(() => {
                    deviceBufferRef.current = '';
                    setDeviceBuffer('');
                }, 120);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(deviceTimerRef.current);
        };
    }, [scanMode, deviceListening, playScanChime]);

    // Detect Available Cameras on mount
    useEffect(() => {
        const detectCameras = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                    setHasCamera(false);
                    return;
                }
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(d => d.kind === 'videoinput');
                if (videoDevices.length > 0) {
                    setCameras(videoDevices);
                    const backCamera = videoDevices.find(d =>
                        d.label.toLowerCase().includes('back') ||
                        d.label.toLowerCase().includes('rear') ||
                        d.label.toLowerCase().includes('environment')
                    );
                    setSelectedCameraId(backCamera?.deviceId || videoDevices[0].deviceId);
                    setHasCamera(true);
                } else {
                    setHasCamera(false);
                }
            } catch (err) {
                console.warn('Camera detection note:', err);
                setHasCamera(false);
            }
        };

        detectCameras();
        return () => {
            stopScanning();
        };
    }, []);

    // Handle Successful Scan
    const onScanSuccess = useCallback((decodedText, decodedResult) => {
        if (!decodedText || decodedText === lastScannedRef.current) return;
        lastScannedRef.current = decodedText;
        setLastScannedCode(decodedText);
        setTimeout(() => { lastScannedRef.current = ''; setLastScannedCode(''); }, 2000);

        console.log('⚡ Barcode Detected Instantly:', decodedText, decodedResult?.result?.format?.formatName || 'Native');

        playScanChime();
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

        setManualInput(decodedText);
        setError(null);
        setScanStatus(`✅ Scanned: ${decodedText}`);

        stopScanning();
        lookupProduct(decodedText);
    }, [playScanChime]);

    // Start Scanning (Native Hardware BarcodeDetector -> Fallback Html5Qrcode)
    const startScanning = async () => {
        setError(null);
        setScanStatus('🔄 Launching ultra-fast scanner...');
        scanningRef.current = true;

        const hasNativeBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

        // -------------------------------------------------------------
        // STRATEGY 1: Hardware-Accelerated Native BarcodeDetector
        // -------------------------------------------------------------
        if (hasNativeBarcodeDetector) {
            try {
                console.log('🚀 Using Native BarcodeDetector (GPU/NPU Accelerated)');
                const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
                const targetFormats = [
                    'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'data_matrix', 'itf'
                ].filter(f => supportedFormats.includes(f));

                const detector = new window.BarcodeDetector({
                    formats: targetFormats.length > 0 ? targetFormats : supportedFormats
                });

                const constraints = {
                    video: {
                        deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
                        facingMode: selectedCameraId ? undefined : { ideal: 'environment' },
                        width: { ideal: 1280, min: 640 },
                        height: { ideal: 720, min: 480 },
                        frameRate: { ideal: 30, max: 60 },
                        advanced: [{ focusMode: 'continuous' }]
                    },
                    audio: false
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                mediaStreamRef.current = stream;

                if (nativeVideoRef.current) {
                    nativeVideoRef.current.srcObject = stream;
                    await nativeVideoRef.current.play();
                }

                setIsNativeMode(true);
                setScanning(true);
                setScanStatus('📷 Scanning active (Native 60FPS)...');

                // High-speed detection loop directly on video frame
                const detectLoop = async () => {
                    if (!scanningRef.current) return;
                    if (nativeVideoRef.current && nativeVideoRef.current.readyState >= 2) {
                        try {
                            const barcodes = await detector.detect(nativeVideoRef.current);
                            if (barcodes && barcodes.length > 0) {
                                const detected = barcodes[0];
                                onScanSuccess(detected.rawValue, {
                                    result: { format: { formatName: detected.format } }
                                });
                                return;
                            }
                        } catch (detectErr) {
                            // frame skip
                        }
                    }
                    if (scanningRef.current) {
                        animFrameRef.current = requestAnimationFrame(detectLoop);
                    }
                };

                animFrameRef.current = requestAnimationFrame(detectLoop);
                return;
            } catch (nativeErr) {
                console.warn('⚠️ Native BarcodeDetector stream failed, falling back to Html5Qrcode:', nativeErr);
                // Clean up native stream if started
                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach(t => t.stop());
                    mediaStreamRef.current = null;
                }
            }
        }

        // -------------------------------------------------------------
        // STRATEGY 2: Tuned Fallback (Html5Qrcode with 720p resolution)
        // -------------------------------------------------------------
        try {
            setIsNativeMode(false);
            const formatsToSupport = [
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.QR_CODE
            ];

            html5QrCodeRef.current = new Html5Qrcode('barcode-scanner-region', {
                formatsToSupport,
                verbose: false
            });

            const dynamicConstraints = {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                advanced: [{ focusMode: 'continuous' }]
            };

            if (selectedCameraId) {
                dynamicConstraints.deviceId = { exact: selectedCameraId };
            } else {
                dynamicConstraints.facingMode = 'environment';
            }

            const config = {
                fps: 25,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    return {
                        width: Math.floor(viewfinderWidth * 0.85),
                        height: Math.floor(minEdge * 0.45)
                    };
                },
                aspectRatio: 1.777778,
                disableFlip: false,
                videoConstraints: dynamicConstraints
            };

            const cameraTarget = selectedCameraId ? selectedCameraId : { facingMode: 'environment' };

            await html5QrCodeRef.current.start(
                cameraTarget,
                config,
                onScanSuccess,
                () => {} // per-frame reject
            );

            setScanning(true);
            setFlashOn(false);
            setScanStatus('📷 Scanning... Hold barcode inside the viewfinder');
        } catch (err) {
            console.error('Scanner start error:', err);
            setError(`Camera error: ${err.message || err}. Please ensure camera permission is granted.`);
            setScanStatus('');
            setScanning(false);
            scanningRef.current = false;
        }
    };

    // Stop Scanning
    const stopScanning = async () => {
        scanningRef.current = false;

        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (nativeVideoRef.current) {
            nativeVideoRef.current.srcObject = null;
        }

        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
            } catch (e) {}
        }
        if (html5QrCodeRef.current) {
            try {
                html5QrCodeRef.current.clear();
            } catch (e) {}
            html5QrCodeRef.current = null;
        }

        setScanning(false);
        setIsNativeMode(false);
        if (!error) {
            setScanStatus('');
        }
    };

    // Toggle Flash (Torch)
    const toggleFlash = async () => {
        try {
            if (mediaStreamRef.current) {
                const track = mediaStreamRef.current.getVideoTracks()[0];
                if (track && track.applyConstraints) {
                    await track.applyConstraints({
                        advanced: [{ torch: !flashOn }]
                    });
                    setFlashOn(!flashOn);
                    return;
                }
            }
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                await html5QrCodeRef.current.applyVideoConstraints({
                    advanced: [{ torch: !flashOn }]
                });
                setFlashOn(!flashOn);
            }
        } catch (err) {
            console.warn('Flash not supported:', err);
            setFlashSupported(false);
            setError('Torch/Flash is not supported on this camera device.');
        }
    };

    // File Upload Scan (Photos / Saved Barcode Images)
    const handleFileUploadScan = async (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setScanStatus('🔄 Processing image file...');
        setError(null);

        if (scanning) await stopScanning();

        try {
            let decoded = null;

            // 1. Try Native BarcodeDetector first
            if ('BarcodeDetector' in window) {
                try {
                    const detector = new window.BarcodeDetector();
                    const bitmap = await createImageBitmap(file);
                    const barcodes = await detector.detect(bitmap);
                    if (barcodes && barcodes.length > 0) {
                        decoded = barcodes[0].rawValue;
                    }
                } catch (e) {}
            }

            // 2. Fallback to Html5Qrcode file scan
            if (!decoded) {
                const tempScanner = new Html5Qrcode('file-scanner-region');
                try {
                    const res = await tempScanner.scanFileV2(file, false);
                    if (res?.decodedText) decoded = res.decodedText;
                } catch (e) {
                    try {
                        const fallback = await tempScanner.scanFile(file, false);
                        if (fallback) decoded = fallback;
                    } catch (e2) {}
                }
            }

            if (decoded) {
                onScanSuccess(decoded, { result: { format: { formatName: 'Image File Upload' } } });
            } else {
                throw new Error('No barcode detected in image');
            }
        } catch (err) {
            console.error('File scan error:', err);
            setError('Could not locate a clear barcode in this photo. Try a closer image or enter manually.');
            setScanStatus('');
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Product Lookup by Barcode / Part Number
    const lookupProduct = async (barcodeValue) => {
        if (!barcodeValue) return;

        setScanStatus(`🔍 Searching catalog for: ${barcodeValue}...`);

        try {
            const searchParams = { search: barcodeValue, limit: 50 };
            const result = await getProducts(searchParams);
            const allProducts = result.products || [];

            const exactMatches = allProducts.filter(p =>
                p.part_number === barcodeValue ||
                p.barcode === barcodeValue ||
                p.part_number?.toLowerCase() === barcodeValue.toLowerCase() ||
                p.barcode?.toLowerCase() === barcodeValue.toLowerCase()
            );

            let product = null;
            if (exactMatches.length > 0) {
                if (warehouseId) {
                    product = exactMatches.find(p => String(p.warehouse_id) === String(warehouseId));
                }
                if (!product) {
                    product = exactMatches.find(p => p.warehouse_id && (p.quantity > 0));
                }
                if (!product) {
                    product = exactMatches[0];
                }
            } else if (allProducts.length > 0) {
                if (warehouseId) {
                    product = allProducts.find(p => String(p.warehouse_id) === String(warehouseId));
                }
                if (!product) {
                    product = allProducts.find(p => p.warehouse_id && (p.quantity > 0));
                }
                if (!product) {
                    product = allProducts[0];
                }
            }

            if (product) {
                setScanStatus(`✅ Found: ${product.name}`);
                if (onScan) onScan(barcodeValue, product);
            } else {
                setScanStatus(`❌ No product found for: ${barcodeValue}`);
                setError(`No product matches "${barcodeValue}". Ensure this part number is registered.`);
                if (onScan) onScan(barcodeValue, null);
            }
        } catch (err) {
            console.error('Lookup error:', err);
            setScanStatus('❌ Lookup failed');
            setError(`Search failed: ${err.message}`);
            if (onError) onError(err);
        }
    };

    // Debounced Search Autocomplete
    const searchProductsDebounced = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        setIsSearching(true);
        try {
            const searchParams = { search: query, limit: 30 };
            const result = await getProducts(searchParams);
            let products = result.products || [];

            if (products.length > 1) {
                products.sort((a, b) => {
                    const aActive = warehouseId && String(a.warehouse_id) === String(warehouseId);
                    const bActive = warehouseId && String(b.warehouse_id) === String(warehouseId);
                    if (aActive && !bActive) return -1;
                    if (!aActive && bActive) return 1;
                    return (b.quantity || 0) - (a.quantity || 0);
                });
            }

            setSearchResults(products);
            setShowDropdown(products.length > 0);
        } catch (err) {
            setSearchResults([]);
        }
        setIsSearching(false);
    }, [warehouseId]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setManualInput(value);
        setError(null);
        setScanStatus('');

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            searchProductsDebounced(value);
        }, 350);
    };

    const handleSelectProduct = (product) => {
        const barcodeValue = product.part_number || product.barcode || product.name;
        setManualInput(barcodeValue);
        setShowDropdown(false);
        setSearchResults([]);
        setError(null);
        setScanStatus(`✅ Selected: ${product.name}`);
        playScanChime();

        if (onScan) onScan(barcodeValue, product);
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
            <div id="file-scanner-region" style={{ display: 'none' }}></div>

            {/* Scan Mode Toggle with Dedicated Icons */}
            <div style={{
                display: 'flex', justifyContent: 'center', gap: '0', marginBottom: '16px',
                borderRadius: '10px', overflow: 'hidden', border: '1px solid #334155',
                maxWidth: '380px', margin: '0 auto 16px', background: '#090d16'
            }}>
                <button
                    type="button"
                    onClick={() => { setScanMode('device'); stopScanning(); setDeviceListening(true); }}
                    style={{
                        flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer',
                        fontSize: '13px', fontWeight: 'bold', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        background: scanMode === 'device' ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : 'transparent',
                        color: scanMode === 'device' ? 'white' : '#94a3b8'
                    }}
                >
                    <BarcodeGunIcon className="w-4 h-4" />
                    <span>USB / Gun Scanner</span>
                </button>
                <button
                    type="button"
                    onClick={() => { setScanMode('camera'); setDeviceListening(false); }}
                    style={{
                        flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer',
                        fontSize: '13px', fontWeight: 'bold', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        background: scanMode === 'camera' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                        color: scanMode === 'camera' ? 'white' : '#94a3b8'
                    }}
                >
                    <CameraViewfinderIcon className="w-4 h-4" />
                    <span>Mobile Camera</span>
                </button>
            </div>

            {/* ===== USB HARDWARE SCANNER MODE ===== */}
            {scanMode === 'device' && (
                <div style={{
                    padding: '20px', marginBottom: '16px',
                    background: deviceListening
                        ? 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(91,33,182,0.1))'
                        : '#0f172a',
                    borderRadius: '12px',
                    border: `2px solid ${deviceListening ? '#7c3aed' : '#334155'}`,
                    transition: 'all 0.3s ease',
                    position: 'relative'
                }}>
                    <style>{`
                        @keyframes device-pulse {
                            0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.5); }
                            50% { box-shadow: 0 0 0 14px rgba(124,58,237,0); }
                        }
                        @keyframes blink-cursor {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0; }
                        }
                        @keyframes scan-flash {
                            0% { background: rgba(16, 185, 129, 0.3); }
                            100% { background: transparent; }
                        }
                    `}</style>

                    {scanCount > 0 && (
                        <div style={{
                            position: 'absolute', top: '10px', right: '15px',
                            background: '#10b981', color: 'white', borderRadius: '20px',
                            padding: '3px 10px', fontSize: '11px', fontWeight: 'bold'
                        }}>
                            {scanCount} scanned
                        </div>
                    )}

                    {!deviceListening ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                                <BarcodeGunIcon className="w-12 h-12 text-purple-400 opacity-80" />
                            </div>
                            <p style={{ color: '#c4b5fd', fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                                USB Hardware Scanner Paused
                            </p>
                            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '15px' }}>
                                Connect your Eyoyo or generic 1D/2D USB scanner and resume listening
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setDeviceListening(true);
                                    setError(null);
                                    setScanStatus('');
                                    setDeviceBuffer('');
                                    deviceBufferRef.current = '';
                                    setTimeout(() => deviceInputRef.current?.focus(), 100);
                                }}
                                style={{
                                    padding: '14px 32px', border: 'none', borderRadius: '10px',
                                    cursor: 'pointer', fontSize: '15px', fontWeight: 'bold',
                                    background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                                    color: 'white', boxShadow: '0 4px 15px rgba(124,58,237,0.4)',
                                    display: 'inline-flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                <BarcodeGunIcon className="w-4 h-4" /> Resume Listening
                            </button>
                        </>
                    ) : (
                        <>
                            <div style={{
                                width: '70px', height: '70px', borderRadius: '50%', margin: '0 auto 12px',
                                background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                animation: 'device-pulse 2s infinite'
                            }}>
                                <BarcodeGunIcon className="w-9 h-9 text-white" />
                            </div>
                            <p style={{ color: '#c4b5fd', fontSize: '15px', fontWeight: 'bold', marginBottom: '2px' }}>
                                Scanner Ready & Listening
                            </p>
                            <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '10px', fontFamily: 'monospace' }}>
                                CODE128 • CODE39 • QR • PDF417 • EAN • UPC
                            </p>
                            <p style={{ color: '#cbd5e1', fontSize: '13px', marginBottom: '14px' }}>
                                Pull the trigger on the barcode label to scan automatically
                            </p>

                            {deviceBuffer && (
                                <div style={{
                                    padding: '8px 16px', marginBottom: '12px',
                                    background: 'rgba(124,58,237,0.2)', borderRadius: '6px',
                                    fontFamily: 'monospace', fontSize: '18px', color: '#c4b5fd',
                                    letterSpacing: '2px'
                                }}>
                                    {deviceBuffer}
                                    <span style={{ animation: 'blink-cursor 0.8s infinite' }}>|</span>
                                </div>
                            )}

                            <input
                                ref={deviceInputRef}
                                type="text"
                                value={deviceBuffer}
                                onChange={() => {}}
                                style={{
                                    position: 'absolute', opacity: 0, width: '1px', height: '1px',
                                    pointerEvents: 'none'
                                }}
                                tabIndex={-1}
                            />

                            {scanHistory.length > 0 && (
                                <div style={{
                                    marginTop: '12px', marginBottom: '12px', textAlign: 'left',
                                    maxHeight: '110px', overflowY: 'auto',
                                    background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px'
                                }}>
                                    <p style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '6px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        Recent Scans
                                    </p>
                                    {scanHistory.map((item, i) => (
                                        <div key={i} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '4px 8px', fontSize: '12px',
                                            borderBottom: i < scanHistory.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                            animation: i === 0 ? 'scan-flash 1s ease-out' : 'none'
                                        }}>
                                            <span style={{ color: '#c4b5fd', fontFamily: 'monospace' }}>{item.code}</span>
                                            <span style={{ color: '#64748b', fontSize: '10px' }}>
                                                {item.time.toLocaleTimeString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    setDeviceListening(false);
                                    setDeviceBuffer('');
                                    deviceBufferRef.current = '';
                                    clearTimeout(deviceTimerRef.current);
                                }}
                                style={{
                                    padding: '8px 20px', border: 'none', borderRadius: '6px',
                                    cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                                    background: '#ef4444', color: 'white',
                                    boxShadow: '0 2px 8px rgba(239,68,68,0.3)'
                                }}
                            >
                                ⏹️ Pause Listener
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* ===== CAMERA SCANNER MODE ===== */}
            {scanMode === 'camera' && showPreview && hasCamera && (
                <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                        position: 'relative',
                        width: `${width}px`,
                        height: scanning ? `${height}px` : '0px',
                        transition: 'height 0.3s ease',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        backgroundColor: '#000'
                    }}>
                        <style>{`
                            @keyframes scanning-laser {
                                0% { top: 12%; opacity: 0; }
                                15% { opacity: 1; }
                                85% { opacity: 1; }
                                100% { top: 88%; opacity: 0; }
                            }
                            .laser-line {
                                position: absolute;
                                left: 8%;
                                width: 84%;
                                height: 3px;
                                background-color: #ef4444;
                                box-shadow: 0 0 12px 3px #ef4444;
                                z-index: 20;
                                animation: scanning-laser 1.8s infinite linear;
                                pointer-events: none;
                            }
                            .viewfinder-crosshairs {
                                position: absolute;
                                inset: 12px;
                                border: 2px dashed rgba(255,255,255,0.3);
                                border-radius: 8px;
                                pointer-events: none;
                                z-index: 15;
                            }
                        `}</style>

                        {/* Native Hardware Video Feed */}
                        <video
                            ref={nativeVideoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{
                                display: isNativeMode && scanning ? 'block' : 'none',
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />

                        {/* Html5Qrcode Fallback Region */}
                        <div
                            id="barcode-scanner-region"
                            style={{
                                display: !isNativeMode && scanning ? 'block' : 'none',
                                width: '100%',
                                height: '100%',
                                overflow: 'hidden'
                            }}
                        />

                        {scanning && (
                            <>
                                <div className="laser-line"></div>
                                <div className="viewfinder-crosshairs"></div>
                                {isNativeMode && (
                                    <div style={{
                                        position: 'absolute', top: '8px', left: '8px', zIndex: 25,
                                        background: 'rgba(16, 185, 129, 0.85)', color: 'white',
                                        fontSize: '10px', fontWeight: 'bold', padding: '2px 8px',
                                        borderRadius: '4px', letterSpacing: '0.5px'
                                    }}>
                                        ⚡ ULTRA-FAST 60FPS
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Scan Status Display */}
            {scanStatus && (
                <div style={{
                    padding: '10px 14px',
                    marginBottom: '10px',
                    background: scanStatus.includes('✅') ? 'rgba(16, 185, 129, 0.15)' :
                        scanStatus.includes('❌') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: scanStatus.includes('✅') ? '#34d399' :
                        scanStatus.includes('❌') ? '#f87171' : '#60a5fa',
                    border: `1px solid ${
                        scanStatus.includes('✅') ? 'rgba(16, 185, 129, 0.4)' :
                        scanStatus.includes('❌') ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'
                    }`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600'
                }}>
                    {scanStatus}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div style={{
                    color: '#f87171',
                    padding: '10px 14px',
                    marginBottom: '10px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    textAlign: 'left'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Camera Controls & Selection */}
            {scanMode === 'camera' && hasCamera && (
                <div style={{ marginBottom: '14px' }}>
                    {cameras.length > 1 && (
                        <div style={{ marginBottom: '10px' }}>
                            <select
                                value={selectedCameraId || ''}
                                onChange={(e) => {
                                    setSelectedCameraId(e.target.value);
                                    if (scanning) {
                                        stopScanning().then(() => setTimeout(startScanning, 150));
                                    }
                                }}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #475569',
                                    fontSize: '13px',
                                    backgroundColor: '#0f172a',
                                    color: '#f8fafc'
                                }}
                            >
                                {cameras.map(camera => (
                                    <option key={camera.deviceId} value={camera.deviceId}>
                                        📷 {camera.label || `Camera ${camera.deviceId.substring(0, 8)}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {!scanning ? (
                        <button
                            onClick={startScanning}
                            type="button"
                            style={{
                                padding: '12px 28px',
                                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <CameraViewfinderIcon className="w-5 h-5" /> Start Camera Scan
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                onClick={stopScanning}
                                type="button"
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                                }}
                            >
                                ⏹️ Stop Scanning
                            </button>

                            {flashSupported && (
                                <button
                                    onClick={toggleFlash}
                                    type="button"
                                    style={{
                                        padding: '12px 18px',
                                        backgroundColor: flashOn ? '#fbbf24' : '#334155',
                                        color: flashOn ? '#000' : '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
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

            {/* Scan from Image File */}
            {scanMode === 'camera' && (
                <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                        OR UPLOAD PHOTO OF BARCODE
                    </p>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUploadScan}
                        ref={fileInputRef}
                        style={{
                            padding: '8px 12px',
                            border: '1px dashed #475569',
                            borderRadius: '6px',
                            backgroundColor: '#090d16',
                            color: '#cbd5e1',
                            width: '280px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    />
                </div>
            )}

            {/* Manual Input with Product Search Dropdown */}
            <form onSubmit={handleManualSubmit} style={{ marginTop: '8px', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '340px', maxWidth: '100%' }}>
                        <input
                            type="text"
                            data-scanner-manual="true"
                            placeholder="Type part number or product name..."
                            value={manualInput}
                            onChange={handleInputChange}
                            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
                            style={{
                                padding: '12px 38px 12px 14px',
                                fontSize: '14px',
                                border: '1px solid #475569',
                                borderRadius: '8px',
                                width: '100%',
                                boxSizing: 'border-box',
                                backgroundColor: '#090d16',
                                color: '#f8fafc',
                                outline: 'none'
                            }}
                        />

                        {isSearching && (
                            <div style={{
                                position: 'absolute', right: '12px', top: '50%',
                                transform: 'translateY(-50%)', fontSize: '14px'
                            }}>
                                ⏳
                            </div>
                        )}

                        {showDropdown && searchResults.length > 0 && (
                            <div style={{
                                position: 'absolute', top: '100%', left: 0, right: 0,
                                backgroundColor: '#0f172a', border: '1px solid #334155',
                                borderRadius: '0 0 8px 8px', maxHeight: '280px', overflowY: 'auto',
                                zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
                                textAlign: 'left'
                            }}>
                                {searchResults.map((product) => {
                                    const isActiveWh = warehouseId && String(product.warehouse_id) === String(warehouseId);
                                    return (
                                        <div
                                            key={product.id}
                                            onClick={() => handleSelectProduct(product)}
                                            style={{
                                                padding: '10px 12px', cursor: 'pointer',
                                                borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
                                                backgroundColor: isActiveWh ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                                                transition: 'background-color 0.15s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.18)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isActiveWh ? 'rgba(245, 158, 11, 0.08)' : 'transparent'}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '13px' }}>
                                                    {product.name}
                                                </span>
                                                {isActiveWh && (
                                                    <span style={{
                                                        background: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24',
                                                        fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                                                        border: '1px solid rgba(245, 158, 11, 0.5)', fontWeight: 'bold'
                                                    }}>
                                                        ⭐ Active WH
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                <span style={{
                                                    fontFamily: 'monospace', backgroundColor: '#1e293b',
                                                    padding: '2px 6px', borderRadius: '4px', color: '#fbbf24',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {product.part_number || product.barcode || 'No Part #'}
                                                </span>
                                                <span style={{
                                                    backgroundColor: 'rgba(51, 65, 85, 0.5)',
                                                    padding: '1px 6px', borderRadius: '4px', color: '#cbd5e1'
                                                }}>
                                                    📍 {product.warehouse_name || 'No Warehouse'}
                                                </span>
                                                <span style={{
                                                    color: (product.quantity || 0) > 0 ? '#34d399' : '#94a3b8',
                                                    fontWeight: 'bold'
                                                }}>
                                                    Qty: {product.quantity || 0}
                                                </span>
                                                <span style={{ color: '#64748b', marginLeft: 'auto' }}>
                                                    ${parseFloat(product.price || 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        style={{
                            padding: '12px 20px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        🔍 Look Up
                    </button>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
                    💡 Tip: Search by part number (e.g. "360-14710-03-00"), barcode, or product name
                </div>
            </form>
        </div>
    );
};

export default BarcodeScanner;
