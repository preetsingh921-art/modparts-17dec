import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import InlineBarcode from '../../components/ui/InlineBarcode';
import { copyBarcodeAsImage, downloadBarcodeAsPng, printBarcodeLabel } from '../../utils/barcodeUtils';

/**
 * BarcodeGeneratorPage - Custom barcode generator for admin
 * Generate, display, copy, download, and print any barcode
 */
const BarcodeGeneratorPage = () => {
    const { success, error: showError } = useToast();
    const barcodeRef = useRef(null);

    const [barcodeValue, setBarcodeValue] = useState('');
    const [generatedBarcode, setGeneratedBarcode] = useState('');
    const [barcodeSize, setBarcodeSize] = useState('large');
    const [showProductInfo, setShowProductInfo] = useState(false);
    const [productName, setProductName] = useState('');
    const [price, setPrice] = useState('');

    const handleGenerate = () => {
        if (!barcodeValue.trim()) {
            showError('Please enter a barcode value');
            return;
        }
        setGeneratedBarcode(barcodeValue.trim());
        success('Barcode generated!');
    };

    const handleCopyNumber = async () => {
        if (!generatedBarcode) return;
        try {
            await navigator.clipboard.writeText(generatedBarcode);
            success('Barcode number copied to clipboard!');
        } catch (err) {
            showError('Failed to copy barcode number');
        }
    };

    const handleCopyImage = async () => {
        if (!barcodeRef.current) return;
        try {
            const svgElement = barcodeRef.current.getSvgElement();
            if (svgElement) {
                await copyBarcodeAsImage(svgElement);
                success('Barcode image copied to clipboard!');
            }
        } catch (err) {
            console.error('Copy image error:', err);
            showError('Failed to copy barcode image. Right-click the barcode to copy manually.');
        }
    };

    const handleDownload = async () => {
        if (!barcodeRef.current) return;
        try {
            const svgElement = barcodeRef.current.getSvgElement();
            if (svgElement) {
                await downloadBarcodeAsPng(svgElement, `barcode-${generatedBarcode}`);
                success('Barcode PNG downloaded!');
            }
        } catch (err) {
            showError('Failed to download barcode');
        }
    };

    const handlePrint = () => {
        if (!barcodeRef.current) return;
        const svgElement = barcodeRef.current.getSvgElement();
        if (svgElement) {
            printBarcodeLabel({
                svgElement,
                productName: showProductInfo ? productName : '',
                partNumber: generatedBarcode,
                price: showProductInfo ? price : '',
                showPrice: showProductInfo && price
            });
        }
    };

    const handleClear = () => {
        setBarcodeValue('');
        setGeneratedBarcode('');
        setProductName('');
        setPrice('');
    };

    return (
        <div className="container mx-auto px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <Link to="/admin/products" className="text-blue-400 hover:text-blue-300 flex items-center mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Barcode Generator</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Generate Barcode</h2>

                    {/* Barcode Input */}
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm mb-2">Barcode Value / Part Number *</label>
                        <input
                            type="text"
                            value={barcodeValue}
                            onChange={(e) => setBarcodeValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                            placeholder="Enter part number or any text..."
                            className="w-full px-4 py-3 bg-midnight-800 border border-midnight-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Size Selector */}
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm mb-2">Barcode Size</label>
                        <div className="flex gap-2">
                            {['small', 'medium', 'large'].map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setBarcodeSize(size)}
                                    className={`px-4 py-2 rounded capitalize ${barcodeSize === size
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-midnight-700 text-gray-300 hover:bg-midnight-600'
                                        }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Optional Product Info Toggle */}
                    <div className="mb-4">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showProductInfo}
                                onChange={(e) => setShowProductInfo(e.target.checked)}
                                className="mr-2 w-4 h-4"
                            />
                            <span className="text-gray-400 text-sm">Include product info for printing</span>
                        </label>
                    </div>

                    {/* Optional Product Info Fields */}
                    {showProductInfo && (
                        <div className="space-y-4 mb-4 p-4 bg-midnight-800 rounded-lg">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Product Name (optional)</label>
                                <input
                                    type="text"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                    placeholder="Enter product name..."
                                    className="w-full px-4 py-2 bg-midnight-700 border border-midnight-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Price (optional)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-4 py-2 bg-midnight-700 border border-midnight-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Generate Button */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleGenerate}
                            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                        >
                            Generate Barcode
                        </button>
                        <button
                            onClick={handleClear}
                            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Preview & Actions Section */}
                <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Barcode Preview</h2>

                    {generatedBarcode ? (
                        <div className="space-y-6">
                            {/* Barcode Preview */}
                            <div className="bg-white p-8 rounded-lg flex justify-center">
                                <div className="text-center">
                                    {showProductInfo && productName && (
                                        <div className="font-bold text-gray-800 mb-2">{productName}</div>
                                    )}
                                    <InlineBarcode
                                        ref={barcodeRef}
                                        barcode={generatedBarcode}
                                        size={barcodeSize}
                                        showPartNumber={true}
                                        partNumber={generatedBarcode}
                                    />
                                    {showProductInfo && price && (
                                        <div className="font-bold text-gray-800 text-xl mt-2">${parseFloat(price).toFixed(2)}</div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Copy Number */}
                                <button
                                    onClick={handleCopyNumber}
                                    className="flex items-center justify-center bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                    </svg>
                                    Copy Number
                                </button>

                                {/* Copy as Image */}
                                <button
                                    onClick={handleCopyImage}
                                    className="flex items-center justify-center bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                    </svg>
                                    Copy Image
                                </button>

                                {/* Download PNG */}
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center justify-center bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Download PNG
                                </button>

                                {/* Print Label */}
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center justify-center bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                                    </svg>
                                    Print Label
                                </button>
                            </div>

                            {/* Tips */}
                            <div className="bg-midnight-800 p-4 rounded-lg">
                                <p className="text-gray-400 text-sm">
                                    <strong className="text-white">Tip:</strong> For barcode printers, click "Print Label" and select your barcode printer.
                                    Adjust print settings as needed for label size.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-midnight-800 p-12 rounded-lg text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            <p className="text-gray-400 mb-2">No barcode generated yet</p>
                            <p className="text-gray-500 text-sm">Enter a part number or text and click "Generate Barcode"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BarcodeGeneratorPage;
