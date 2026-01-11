import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * InlineBarcode - A compact barcode display for tables/lists
 */
const InlineBarcode = ({ barcode, width = 1.2, height = 30 }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (barcode && svgRef.current) {
            try {
                JsBarcode(svgRef.current, barcode, {
                    format: 'CODE128',
                    width: width,
                    height: height,
                    displayValue: true,
                    fontSize: 10,
                    margin: 2,
                    background: 'transparent',
                    lineColor: '#22c55e', // Green color to match theme
                });
            } catch (e) {
                console.error('Barcode generation error:', e);
            }
        }
    }, [barcode, width, height]);

    if (!barcode) return null;

    return (
        <svg
            ref={svgRef}
            style={{
                maxWidth: '120px',
                height: 'auto',
                display: 'block'
            }}
        />
    );
};

export default InlineBarcode;
