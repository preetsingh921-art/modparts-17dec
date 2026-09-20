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
    const [isStarting, setIsStarting] = useState(false);
    const [isNativeMode, setIsNativeMode] = useState(false);
    const [error, setError] = useState(null);
    const [manualInput, setManualInput] = useState('');
    const [hasCamera, setHasCamera] = useState(true);
    const [cameras, setCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState(null);
    const [selectedFacingMode, setSelectedFacingMode] = useState('environment'); // 'environment' (rear) or 'user' (front)
    const [searchResults, setSearchResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [lastScannedCode, setLastScannedCode] = useState('');
    const [scanStatus, setScanStatus] = useState('');
    const [flashOn, setFlashOn] = useState(false);
    const [flashSupported, setFlashSupported] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [zoomSupported, setZoomSupported] = useState(false);
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

    // Categorize and prioritize camera lenses:
    // Rank 0: Main 1x rear camera (optimal for 1D barcodes)
    // Rank 1: Other standard rear cameras
    // Rank 2: Telephoto (zoom)
    // Rank 3: Ultra-wide (0.5x - causes blur & barrel distortion on barcodes)
    // Rank 4: Front / selfie camera
    const categorizeCamera = (camera) => {
        const label = (camera.label || '').toLowerCase();
        const isFront = label.includes('front') || label.includes('user') || label.includes('selfie') || label.includes('facing front');
        const isUltraWide = label.includes('ultra') || label.includes('0.5') || label.includes('wide-angle') || label.includes('super wide');
        const isTele = label.includes('tele') || label.includes('zoom') || label.includes('2x') || label.includes('3x') || label.includes('5x');

        let displayName = camera.label || `Camera (${camera.deviceId ? camera.deviceId.slice(0, 8) : '1'})`;
        let rank = 1;
        let isMain = false;

        if (isFront) {
            displayName = `🤳 ${camera.label || 'Front Camera'}`;
            rank = 4;
        } else if (isUltraWide) {
            displayName = `📷 ${camera.label || 'Ultra Wide Camera'} (0.5x - Blurry for barcodes)`;
            rank = 3;
        } else if (isTele) {
            displayName = `📷 ${camera.label || 'Telephoto Camera'} (Zoom)`;
            rank = 2;
        } else {
            // Main wide camera (1x)
            isMain = true;
            displayName = `📷 ${camera.label || 'Main Camera'} (1x - Recommended)`;
            rank = 0;
        }

        return { ...camera, displayName, rank, isMain, isUltraWide, isFront };
    };

    // Detect / Refresh Available Cameras with Intelligent Prioritization
    const refreshCameras = useCallback(async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                setHasCamera(false);
                return;
            }
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            if (videoDevices.length > 0) {
                const categorized = videoDevices.map(categorizeCamera).sort((a, b) => a.rank - b.rank);
                setCameras(categorized);
                setHasCamera(true);

                // Automatically prioritize and select the Main 1x Camera (never Ultra-Wide)
                setSelectedCameraId(prev => {
                    if (prev && categorized.some(c => c.deviceId === prev)) return prev;
                    const mainCam = categorized.find(c => c.isMain) || categorized[0];
                    return mainCam ? mainCam.deviceId : null;
                });
            }
        } catch (err) {
            console.warn('Camera detection note:', err);
        }
    }, []);

    useEffect(() => {
        refreshCameras();
        return () => {
            stopScanning();
        };
    }, [refreshCameras]);

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

    // Active Video Track and Torch Helpers
    const getActiveVideoTrack = useCallback(() => {
        if (mediaStreamRef.current) {
            const tracks = mediaStreamRef.current.getVideoTracks();
            if (tracks.length > 0) return tracks[0];
        }
        const videoElem = document.querySelector('#barcode-scanner-region video');
        if (videoElem && videoElem.srcObject) {
            const tracks = videoElem.srcObject.getVideoTracks();
            if (tracks.length > 0) return tracks[0];
        }
        return null;
    }, []);

    const checkTorchCapability = useCallback(() => {
        const track = getActiveVideoTrack();
        if (!track) {
            setFlashSupported(false);
            return false;
        }
        try {
            const capabilities = track.getCapabilities ? track.getCapabilities() : {};
            const supported = Boolean(capabilities.torch);
            setFlashSupported(supported);
            return supported;
        } catch (e) {
            setFlashSupported(false);
            return false;
        }
    }, [getActiveVideoTrack]);

    // Check Hardware Zoom Capability
    const checkZoomCapability = useCallback(() => {
        const track = getActiveVideoTrack();
        if (!track) {
            setZoomSupported(false);
            return false;
        }
        try {
            const capabilities = track.getCapabilities ? track.getCapabilities() : {};
            const supported = Boolean(capabilities.zoom);
            setZoomSupported(supported);
            return supported;
        } catch (e) {
            setZoomSupported(false);
            return false;
        }
    }, [getActiveVideoTrack]);

    // Apply Hardware / Optical or Digital Sensor Zoom (1x, 1.5x, 2x, 2.5x)
    const applyZoom = async (level) => {
        setZoomLevel(level);
        const track = getActiveVideoTrack();
        let hardwareApplied = false;

        if (track) {
            try {
                const capabilities = track.getCapabilities ? track.getCapabilities() : {};
                if (capabilities.zoom) {
                    const min = capabilities.zoom.min || 1;
                    const max = capabilities.zoom.max || 5;
                    const clamped = Math.max(min, Math.min(level, max));
                    await track.applyConstraints({
                        advanced: [{ zoom: clamped }]
                    });
                    hardwareApplied = true;
                    setScanStatus(`🔍 Zoom set to ${clamped}x`);
                }
            } catch (err) {
                console.warn('Hardware zoom apply error:', err);
            }
        }

        // Apply visual zoom transform on video element as backup
        const videoEl = document.querySelector('#barcode-scanner-region video');
        if (videoEl) {
            videoEl.style.transform = hardwareApplied ? 'none' : (level > 1 ? `scale(${level})` : 'none');
            videoEl.style.transformOrigin = 'center center';
            videoEl.style.transition = 'transform 0.2s ease-out';
        }
    };

    // Toggle Flash (Torch)
    const toggleFlash = async () => {
        const track = getActiveVideoTrack();
        if (!track) {
            setScanStatus('⚠️ No active video stream found');
            return;
        }
        try {
            const capabilities = track.getCapabilities ? track.getCapabilities() : {};
            if (!capabilities.torch) {
                setScanStatus('💡 Flashlight is not supported on this camera device');
                return;
            }
            const nextFlash = !flashOn;
            await track.applyConstraints({
                advanced: [{ torch: nextFlash }]
            });
            setFlashOn(nextFlash);
            setScanStatus(nextFlash ? '🔦 Flashlight turned ON' : '💡 Flashlight turned OFF');
        } catch (err) {
            console.warn('Torch toggle error:', err);
            setScanStatus('⚠️ Flash toggle failed');
        }
    };

    // Start Scanning (Tuned Html5Qrcode with hardware BarcodeDetector & uncropped full-frame view)
    const startScanningWithTarget = async (target) => {
        setError(null);
        setIsStarting(true);
        setScanStatus('🔄 Launching camera viewfinder...');
        scanningRef.current = true;

        // Ensure container is fully visible and rendered in DOM before mounting scanner
        setScanning(true);
        await new Promise(r => setTimeout(r, 80));

        try {
            if (html5QrCodeRef.current) {
                try {
                    if (html5QrCodeRef.current.isScanning) {
                        await html5QrCodeRef.current.stop();
                    }
                    html5QrCodeRef.current.clear();
                } catch (e) {}
                html5QrCodeRef.current = null;
            }

            // High-speed 1D & 2D formats prioritized for auto parts inventory
            const formatsToSupport = [
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.DATA_MATRIX,
                Html5QrcodeSupportedFormats.ITF,
                Html5QrcodeSupportedFormats.CODABAR
            ];

            html5QrCodeRef.current = new Html5Qrcode('barcode-scanner-region', {
                formatsToSupport,
                verbose: false,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            });

            // Fast decoding with widescreen video stream & uncropped full-frame view
            const config = {
                fps: 25,
                aspectRatio: 1.5,
                disableFlip: false,
                videoConstraints: {
                    deviceId: typeof target === 'string' ? { exact: target } : undefined,
                    facingMode: typeof target === 'object' && target.facingMode ? target.facingMode : (typeof target === 'string' ? undefined : (selectedFacingMode || 'environment')),
                    width: { ideal: 1920, min: 1280 },
                    height: { ideal: 1080, min: 720 },
                    advanced: [{ focusMode: 'continuous' }]
                }
            };

            let cameraTarget = target;
            if (!cameraTarget) {
                if (selectedCameraId) {
                    cameraTarget = selectedCameraId;
                } else if (cameras.length > 0) {
                    const mainCam = cameras.find(c => c.isMain) || cameras[0];
                    cameraTarget = mainCam ? mainCam.deviceId : { facingMode: selectedFacingMode || 'environment' };
                } else {
                    cameraTarget = { facingMode: selectedFacingMode || 'environment' };
                }
            }

            try {
                await html5QrCodeRef.current.start(
                    cameraTarget,
                    config,
                    onScanSuccess,
                    () => {} // per-frame reject
                );
            } catch (targetErr) {
                // If starting with specific deviceId failed (e.g. OverconstrainedError on Safari), fallback to facingMode
                console.warn('Camera target failed, attempting environment fallback:', targetErr);
                await html5QrCodeRef.current.start(
                    { facingMode: 'environment' },
                    { fps: 25, aspectRatio: 1.5, disableFlip: false },
                    onScanSuccess,
                    () => {}
                );
            }

            setIsStarting(false);
            setScanning(true);
            setFlashOn(false);
            setScanStatus('📷 Scanning active • Center barcode in the viewfinder');

            // Re-enumerate cameras & detect torch and zoom
            setTimeout(() => {
                refreshCameras();
                checkTorchCapability();
                checkZoomCapability();
                // Automatically set to 1.5x zoom for wide 1D barcodes
                applyZoom(1.5);
            }, 350);

            // Parallel Hardware BarcodeDetector loop directly on raw uncompressed video element
            const tryStartNativeDetector = (retryCount = 0) => {
                if (!scanningRef.current) return;
                const videoEl = document.querySelector('#barcode-scanner-region video');
                if (videoEl && videoEl.readyState >= 2) {
                    startNativeDetectorLoop(videoEl);
                } else if (retryCount < 10) {
                    setTimeout(() => tryStartNativeDetector(retryCount + 1), 200);
                }
            };
            setTimeout(() => tryStartNativeDetector(), 350);

        } catch (err) {
            console.error('Scanner start error:', err);
            setError(`Camera error: ${err.message || err}. Please ensure camera permission is granted in your browser.`);
            setScanStatus('');
            setScanning(false);
            setIsStarting(false);
            scanningRef.current = false;
        }
    };

    // Parallel Native BarcodeDetector Engine (Hardware ML-accelerated, sub-15ms, full video texture)
    const startNativeDetectorLoop = (videoEl) => {
        if (!('BarcodeDetector' in window) || !videoEl) return;
        try {
            const formats = [
                'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'codabar', 'qr_code', 'data_matrix'
            ];
            const detector = new window.BarcodeDetector({ formats });
            let isDetecting = false;

            const detectFrame = async () => {
                if (!scanningRef.current || !videoEl || isDetecting) return;
                isDetecting = true;
                try {
                    const barcodes = await detector.detect(videoEl);
                    if (barcodes && barcodes.length > 0 && scanningRef.current) {
                        const code = barcodes[0].rawValue;
                        const format = barcodes[0].format || 'Native';
                        console.log('⚡ Hardware BarcodeDetector Instant Hit:', code, format);
                        onScanSuccess(code, { result: { format: { formatName: format } } });
                        return;
                    }
                } catch (e) {
                    // Frame skip
                } finally {
                    isDetecting = false;
                }

                if (scanningRef.current) {
                    animFrameRef.current = requestAnimationFrame(detectFrame);
                }
            };

            animFrameRef.current = requestAnimationFrame(detectFrame);
        } catch (err) {
            console.warn('Native detector loop note:', err);
        }
    };

    const startScanning = () => {
        const target = selectedCameraId ? selectedCameraId : { facingMode: selectedFacingMode || 'environment' };
        return startScanningWithTarget(target);
    };

    // Stop Scanning
    const stopScanning = async () => {
        scanningRef.current = false;
        setIsStarting(false);

        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        if (html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
                html5QrCodeRef.current.clear();
            } catch (e) {}
            html5QrCodeRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
        }

        setScanning(false);
        setFlashOn(false);
        if (!error) {
            setScanStatus('');
        }
    };

    // Camera Switch and Flip Handlers
    const handleCameraChange = async (newVal) => {
        if (newVal === 'environment' || newVal === 'user') {
            setSelectedFacingMode(newVal);
            setSelectedCameraId(null);
            if (scanning) {
                await stopScanning();
                setTimeout(() => startScanningWithTarget({ facingMode: newVal }), 150);
            }
        } else {
            setSelectedCameraId(newVal);
            const matchingCam = cameras.find(c => c.deviceId === newVal);
            if (matchingCam) {
                const label = (matchingCam.label || '').toLowerCase();
                setSelectedFacingMode(label.includes('front') || label.includes('user') ? 'user' : 'environment');
            }
            if (scanning) {
                await stopScanning();
                setTimeout(() => startScanningWithTarget(newVal), 150);
            }
        }
    };

    const handleFlipCamera = async () => {
        let nextTarget = null;
        if (cameras.length > 1) {
            const currentIdx = cameras.findIndex(c => c.deviceId === selectedCameraId);
            const isCurrentlyFront = currentIdx !== -1 && cameras[currentIdx]?.isFront;
            const frontCam = cameras.find(c => c.isFront);
            const mainCam = cameras.find(c => c.isMain) || cameras.find(c => !c.isFront);

            // Toggle cleanly between front camera and the Main 1x rear camera
            const nextCam = isCurrentlyFront ? (mainCam || cameras[0]) : (frontCam || cameras[(currentIdx + 1) % cameras.length]);
            if (nextCam) {
                setSelectedCameraId(nextCam.deviceId);
                setSelectedFacingMode(nextCam.isFront ? 'user' : 'environment');
                nextTarget = nextCam.deviceId;
            }
        } else {
            const nextFacing = selectedFacingMode === 'environment' ? 'user' : 'environment';
            setSelectedFacingMode(nextFacing);
            setSelectedCameraId(null);
            nextTarget = { facingMode: nextFacing };
        }

        if (scanning) {
            await stopScanning();
            setTimeout(() => startScanningWithTarget(nextTarget), 150);
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
                <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* Responsive Widescreen Viewfinder (Preserves Full 1D Barcode Width) */}
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: typeof width === 'number' && width < 420 ? '420px' : `${width}px`,
                        height: `${Math.max(height, 280)}px`,
                        borderRadius: '12px',
                        overflow: 'hidden',
                        backgroundColor: '#090d16',
                        border: `2px solid ${scanning ? '#2563eb' : '#334155'}`,
                        boxShadow: scanning ? '0 0 20px rgba(37,99,235,0.25)' : 'none',
                        transition: 'border-color 0.3s, box-shadow 0.3s'
                    }}>
                        <style>{`
                            @keyframes scanning-laser {
                                0% { top: 15%; opacity: 0; }
                                20% { opacity: 1; }
                                80% { opacity: 1; }
                                100% { top: 85%; opacity: 0; }
                            }
                            .laser-line {
                                position: absolute;
                                left: 2%;
                                width: 96%;
                                height: 3px;
                                background: linear-gradient(90deg, transparent, #ef4444, #f87171, #ef4444, transparent);
                                box-shadow: 0 0 14px 4px rgba(239, 68, 68, 0.7);
                                z-index: 20;
                                animation: scanning-laser 2s infinite ease-in-out;
                                pointer-events: none;
                            }
                            #barcode-scanner-region video {
                                width: 100% !important;
                                height: 100% !important;
                                object-fit: contain !important; /* CRITICAL: Never crop barcode edges with object-fit: cover */
                            }
                            .viewfinder-crosshairs {
                                position: absolute;
                                inset: 12px;
                                border: 2px dashed rgba(255,255,255,0.35);
                                border-radius: 8px;
                                pointer-events: none;
                                z-index: 15;
                            }
                            .corner-tl { position: absolute; top: 8px; left: 8px; width: 22px; height: 22px; border-top: 3px solid #60a5fa; border-left: 3px solid #60a5fa; pointer-events: none; z-index: 18; }
                            .corner-tr { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border-top: 3px solid #60a5fa; border-right: 3px solid #60a5fa; pointer-events: none; z-index: 18; }
                            .corner-bl { position: absolute; bottom: 8px; left: 8px; width: 22px; height: 22px; border-bottom: 3px solid #60a5fa; border-left: 3px solid #60a5fa; pointer-events: none; z-index: 18; }
                            .corner-br { position: absolute; bottom: 8px; right: 8px; width: 22px; height: 22px; border-bottom: 3px solid #60a5fa; border-right: 3px solid #60a5fa; pointer-events: none; z-index: 18; }
                        `}</style>

                        {/* Html5Qrcode scanner mount container */}
                        <div
                            id="barcode-scanner-region"
                            style={{
                                width: '100%',
                                height: '100%',
                                display: scanning ? 'block' : 'none',
                                position: 'absolute',
                                inset: 0
                            }}
                        />

                        {/* Standby Viewfinder Placeholder (Visible before scanning starts) */}
                        {!scanning && !isStarting && (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '20px',
                                background: 'radial-gradient(circle at center, #1e293b 0%, #090d16 85%)',
                                position: 'relative'
                            }}>
                                <div className="corner-tl"></div>
                                <div className="corner-tr"></div>
                                <div className="corner-bl"></div>
                                <div className="corner-br"></div>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: 'rgba(37,99,235,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '10px',
                                    border: '1px solid rgba(37,99,235,0.4)'
                                }}>
                                    <CameraViewfinderIcon className="w-8 h-8 text-blue-400" />
                                </div>
                                <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
                                    Camera Viewfinder Standby
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, maxWidth: '240px' }}>
                                    Select camera lens below and tap Start Camera Scan
                                </p>
                            </div>
                        )}

                        {/* Loading / Connecting Overlay */}
                        {isStarting && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 30,
                                background: 'rgba(9, 13, 22, 0.9)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <div className="animate-spin h-9 w-9 border-3 border-blue-500 border-t-transparent rounded-full mb-3"></div>
                                <p style={{ color: '#93c5fd', fontSize: '13px', fontWeight: 'bold' }}>
                                    Opening camera stream...
                                </p>
                            </div>
                        )}

                        {/* Active Viewfinder Overlays */}
                        {scanning && !isStarting && (
                            <>
                                <div className="laser-line"></div>
                                <div className="viewfinder-crosshairs"></div>
                                <div className="corner-tl"></div>
                                <div className="corner-tr"></div>
                                <div className="corner-bl"></div>
                                <div className="corner-br"></div>
                                <div style={{
                                    position: 'absolute',
                                    top: '8px',
                                    left: '8px',
                                    zIndex: 25,
                                    background: 'rgba(16, 185, 129, 0.9)',
                                    color: 'white',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    letterSpacing: '0.5px'
                                }}>
                                    ⚡ LIVE SCANNER
                                </div>
                                <div style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    zIndex: 25,
                                    background: 'rgba(15, 23, 42, 0.85)',
                                    color: '#cbd5e1',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #334155'
                                }}>
                                    {selectedFacingMode === 'user' ? '🤳 Front Lens' : '📷 Rear Lens'}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Scan Status Display */}
                    {scanStatus && (
                        <div style={{
                            width: '100%',
                            maxWidth: `${width}px`,
                            padding: '9px 12px',
                            margin: '10px 0',
                            background: scanStatus.includes('✅') ? 'rgba(16, 185, 129, 0.15)' :
                                scanStatus.includes('❌') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: scanStatus.includes('✅') ? '#34d399' :
                                scanStatus.includes('❌') ? '#f87171' : '#60a5fa',
                            border: `1px solid ${
                                scanStatus.includes('✅') ? 'rgba(16, 185, 129, 0.4)' :
                                scanStatus.includes('❌') ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'
                            }`,
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>
                            {scanStatus}
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            width: '100%',
                            maxWidth: `${width}px`,
                            color: '#f87171',
                            padding: '9px 12px',
                            margin: '10px 0',
                            background: 'rgba(239, 68, 68, 0.15)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            textAlign: 'left'
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Quick Sensor Zoom Pills (1x, 1.5x, 2x, 2.5x) */}
                    {scanning && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            margin: '6px 0 10px 0',
                            width: '100%',
                            maxWidth: typeof width === 'number' && width < 420 ? '420px' : `${width}px`
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>🔍 Zoom:</span>
                                {[1, 1.5, 2, 2.5].map((lvl) => (
                                    <button
                                        key={lvl}
                                        type="button"
                                        onClick={() => applyZoom(lvl)}
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '16px',
                                            border: zoomLevel === lvl ? '1px solid #3b82f6' : '1px solid #334155',
                                            background: zoomLevel === lvl ? '#2563eb' : '#1e293b',
                                            color: zoomLevel === lvl ? '#ffffff' : '#94a3b8',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {lvl}x
                                    </button>
                                ))}
                            </div>
                            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
                                📏 For wide barcodes, align along the red laser at 1.5x zoom (20–30 cm away)
                            </p>
                        </div>
                    )}

                    {/* Camera Selector Dropdown and Flip Button ALWAYS VISIBLE */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        maxWidth: `${width}px`,
                        marginBottom: '12px'
                    }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <select
                                value={selectedCameraId || selectedFacingMode}
                                onChange={(e) => handleCameraChange(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #475569',
                                    fontSize: '12px',
                                    backgroundColor: '#0f172a',
                                    color: '#f8fafc',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                {cameras.length === 0 ? (
                                    <>
                                        <option value="environment">📷 Rear / Environment Camera (Recommended)</option>
                                        <option value="user">🤳 Front / Selfie Camera</option>
                                    </>
                                ) : (
                                    cameras.map((cam, idx) => (
                                        <option key={cam.deviceId || idx} value={cam.deviceId}>
                                            {cam.displayName || cam.label || `Camera ${idx + 1}`}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={handleFlipCamera}
                            style={{
                                padding: '9px 14px',
                                background: '#1e293b',
                                color: '#e2e8f0',
                                border: '1px solid #475569',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                whiteSpace: 'nowrap'
                            }}
                            title="Flip Camera Lens"
                        >
                            <span>🔄</span> Flip
                        </button>
                    </div>

                    {/* Primary Action Buttons: Start / Stop / Flash */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {!scanning ? (
                            <button
                                onClick={startScanning}
                                disabled={isStarting}
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
                            <>
                                <button
                                    onClick={stopScanning}
                                    type="button"
                                    style={{
                                        padding: '12px 22px',
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

                                <button
                                    onClick={toggleFlash}
                                    type="button"
                                    style={{
                                        padding: '12px 18px',
                                        backgroundColor: flashOn ? '#f59e0b' : flashSupported ? '#334155' : '#1e293b',
                                        color: flashOn ? '#000' : flashSupported ? '#fff' : '#94a3b8',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                    title={flashSupported ? (flashOn ? 'Turn Flash OFF' : 'Turn Flash ON') : 'Flash/Torch support depends on camera hardware'}
                                >
                                    {flashOn ? '🔦 Flash ON' : '💡 Flash OFF'}
                                </button>
                            </>
                        )}
                    </div>
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
