import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * InlineBarcode - A barcode display component for tables/lists and product details
 * @param {string} barcode - The barcode value to encode
 * @param {number} width - Bar width (default: 2)
 * @param {number} height - Barcode height in pixels (default: 60)
 * @param {string} size - Preset size: 'small', 'medium', 'large' (used if width/height not provided)
 * @param {boolean} showPartNumber - Show the part number text below barcode (default: true)
 * @param {string} partNumber - Part number to display (defaults to barcode value)
 * @param {string} lineColor - Color of barcode lines (default: '#000000' for print-friendly black)
 */
const InlineBarcode = forwardRef(({
    barcode,
    width,
    height,
    size = 'medium',
    showPartNumber = true,
    partNumber,
    lineColor = '#000000'
}, ref) => {
    const svgRef = useRef(null);

    // Size presets (only used if width/height not provided)
    const sizePresets = {
        small: { width: 1.5, height: 40 },
        medium: { width: 2, height: 60 },
        large: { width: 2.5, height: 80 }
    };

    const preset = sizePresets[size] || sizePresets.medium;

    // Use provided width/height or fall back to preset
    const finalWidth = width !== undefined ? width : preset.width;
    const finalHeight = height !== undefined ? height : preset.height;

    // Calculate maxWidth and fontSize based on actual barcode dimensions
    const maxWidth = `${Math.max(150, finalHeight * 3)}px`;
    const fontSize = Math.max(10, Math.min(16, Math.floor(finalHeight / 5)));

    // Expose the SVG ref to parent components
    useImperativeHandle(ref, () => ({
        getSvgElement: () => svgRef.current,
        getBarcode: () => barcode
    }));

    useEffect(() => {
        if (barcode && svgRef.current) {
            try {
                JsBarcode(svgRef.current, barcode, {
                    format: 'CODE128',
                    width: finalWidth,
                    height: finalHeight,
                    displayValue: false, // We'll display part number separately for better control
                    fontSize: fontSize,
                    margin: 5,
                    background: '#ffffff',
                    lineColor: lineColor,
                });
            } catch (e) {
                console.error('Barcode generation error:', e);
            }
        }
    }, [barcode, finalWidth, finalHeight, lineColor, fontSize]);

    if (!barcode) return null;

    const displayPartNumber = partNumber || barcode;

    return (
        <div style={{ display: 'inline-block', textAlign: 'center' }}>
            <svg
                ref={svgRef}
                style={{
                    maxWidth: maxWidth,
                    height: 'auto',
                    display: 'block'
                }}
            />
            {showPartNumber && (
                <div style={{
                    fontFamily: 'monospace',
                    fontSize: `${fontSize + 2}px`,
                    fontWeight: 'bold',
                    color: '#333',
                    marginTop: '4px',
                    letterSpacing: '1px'
                }}>
                    {displayPartNumber}
                </div>
            )}
        </div>
    );
});

InlineBarcode.displayName = 'InlineBarcode';

export default InlineBarcode;
