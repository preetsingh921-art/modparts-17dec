import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

/**
 * BarcodeScanner Component
 * Camera-based barcode scanner for mobile devices
 */
const BarcodeScanner = ({
    onScan,
    onError,
    autoStart = true,
    showPreview = true,
    width = 300,
    height = 200
}) => {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState(null);
    const [manualInput, setManualInput] = useState('');
    const [hasCamera, setHasCamera] = useState(true);
    const videoRef = useRef(null);
    const readerRef = useRef(null);

    // Initialize barcode reader
    useEffect(() => {
        readerRef.current = new BrowserMultiFormatReader();

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

    const startScanning = useCallback(async () => {
        if (!readerRef.current || !videoRef.current || !hasCamera) return;

        setError(null);
        setScanning(true);

        try {
            await readerRef.current.decodeFromVideoDevice(
                null, // Use default camera
                videoRef.current,
                (result, error) => {
                    if (result) {
                        const barcodeText = result.getText();
                        console.log('Scanned barcode:', barcodeText);

                        // Vibrate on successful scan (mobile)
                        if (navigator.vibrate) {
                            navigator.vibrate(200);
                        }

                        if (onScan) {
                            onScan(barcodeText);
                        }

                        // Stop scanning after successful read
                        stopScanning();
                    }
                    if (error && error.name !== 'NotFoundException') {
                        console.error('Scanning error:', error);
                    }
                }
            );
        } catch (err) {
            console.error('Failed to start scanner:', err);
            setError('Failed to access camera. Please check permissions.');
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
            if (onScan) {
                onScan(manualInput.trim());
            }
            setManualInput('');
        }
    };

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
                        border: scanning ? '3px solid #4CAF50' : '3px solid #ccc',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}
                >
                    <video
                        ref={videoRef}
                        width={width}
                        height={height}
                        style={{ display: 'block' }}
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
                                width: '60%',
                                height: '40%',
                                border: '2px solid red',
                                borderRadius: '4px',
                                animation: 'pulse 1s infinite'
                            }} />
                        </div>
                    )}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div style={{
                    color: 'red',
                    padding: '10px',
                    marginBottom: '10px',
                    background: '#ffebee',
                    borderRadius: '4px'
                }}>
                    {error}
                </div>
            )}

            {/* Camera Controls */}
            {hasCamera && (
                <div style={{ marginBottom: '15px' }}>
                    {!scanning ? (
                        <button
                            onClick={startScanning}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                        >
                            📷 Start Scanning
                        </button>
                    ) : (
                        <button
                            onClick={stopScanning}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '16px'
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
                    marginBottom: '15px'
                }}>
                    <p>📵 No camera detected. Use manual entry below.</p>
                </div>
            )}

            {/* Manual Input */}
            <form onSubmit={handleManualSubmit} style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <input
                        type="text"
                        placeholder="Enter barcode manually..."
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        style={{
                            padding: '10px',
                            fontSize: '16px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            width: '200px'
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Look Up
                    </button>
                </div>
            </form>

            {/* Pulse Animation Style */}
            <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
        </div>
    );
};

export default BarcodeScanner;
