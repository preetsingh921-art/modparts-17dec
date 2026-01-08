import { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * BarcodeGenerator Component
 * Generates and displays barcode for printing labels
 */
const BarcodeGenerator = ({
    barcode,
    productName,
    partNumber,
    price,
    showPrice = true,
    labelSize = 'medium', // small, medium, large
    onPrint
}) => {
    const svgRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (barcode && svgRef.current) {
            try {
                JsBarcode(svgRef.current, barcode, {
                    format: 'CODE128',
                    width: labelSize === 'small' ? 1.5 : labelSize === 'large' ? 2.5 : 2,
                    height: labelSize === 'small' ? 40 : labelSize === 'large' ? 80 : 60,
                    displayValue: true,
                    fontSize: labelSize === 'small' ? 12 : labelSize === 'large' ? 18 : 14,
                    margin: 10,
                    background: '#ffffff',
                    lineColor: '#000000',
                });
                setError(null);
            } catch (e) {
                setError('Invalid barcode format');
                console.error('Barcode generation error:', e);
            }
        }
    }, [barcode, labelSize]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Barcode Label - ${barcode}</title>
          <style>
            @media print {
              body { margin: 0; padding: 10mm; }
              .label { 
                page-break-after: always;
                text-align: center;
                font-family: Arial, sans-serif;
              }
              .label:last-child { page-break-after: auto; }
            }
            body { font-family: Arial, sans-serif; }
            .label {
              border: 1px dashed #ccc;
              padding: 10px;
              margin: 10px;
              display: inline-block;
              text-align: center;
            }
            .product-name {
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 5px;
              max-width: 200px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .part-number {
              font-size: 12px;
              color: #666;
            }
            .price {
              font-size: 16px;
              font-weight: bold;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="product-name">${productName || ''}</div>
            ${partNumber ? `<div class="part-number">P/N: ${partNumber}</div>` : ''}
            ${svgRef.current?.outerHTML || ''}
            ${showPrice && price ? `<div class="price">$${parseFloat(price).toFixed(2)}</div>` : ''}
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
        </html>
      `);
            printWindow.document.close();
        }
        if (onPrint) onPrint();
    };

    if (!barcode) {
        return (
            <div className="barcode-placeholder" style={{
                padding: '20px',
                background: '#f0f0f0',
                borderRadius: '8px',
                textAlign: 'center'
            }}>
                <p>No barcode assigned</p>
            </div>
        );
    }

    return (
        <div className="barcode-generator" style={{ textAlign: 'center' }}>
            {error ? (
                <div className="error" style={{ color: 'red', padding: '10px' }}>{error}</div>
            ) : (
                <>
                    {productName && (
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{productName}</div>
                    )}
                    {partNumber && (
                        <div style={{ fontSize: '12px', color: '#666' }}>P/N: {partNumber}</div>
                    )}
                    <svg ref={svgRef} style={{ maxWidth: '100%' }} />
                    {showPrice && price && (
                        <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>
                            ${parseFloat(price).toFixed(2)}
                        </div>
                    )}
                    <button
                        onClick={handlePrint}
                        style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        🖨️ Print Label
                    </button>
                </>
            )}
        </div>
    );
};

export default BarcodeGenerator;
