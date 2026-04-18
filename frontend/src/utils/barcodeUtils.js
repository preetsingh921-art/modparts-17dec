/**
 * Barcode Utilities
 * Functions for copying barcode as image, downloading, and printing
 */

/**
 * Convert SVG element to a PNG data URL with optional part number text
 * @param {SVGElement} svgElement - The SVG element to convert
 * @param {number} scale - Scale factor for higher resolution (default 2)
 * @param {string} partNumber - Optional part number to display below barcode
 * @returns {Promise<string>} PNG data URL
 */
export const svgToPngDataUrl = (svgElement, scale = 2, partNumber = null) => {
  return new Promise((resolve, reject) => {
    if (!svgElement) {
      reject(new Error('No SVG element provided'));
      return;
    }

    try {
      // Get SVG dimensions
      const bbox = svgElement.getBBox();
      const width = svgElement.width?.baseVal?.value || bbox.width + 20;
      const baseHeight = svgElement.height?.baseVal?.value || bbox.height + 20;
      // Add extra height for part number text if provided
      const textHeight = partNumber ? 30 : 0;
      const height = baseHeight + textHeight;

      // Clone SVG and add white background
      const clonedSvg = svgElement.cloneNode(true);
      clonedSvg.setAttribute('width', width);
      clonedSvg.setAttribute('height', baseHeight);

      // Add white background rect
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('fill', 'white');
      clonedSvg.insertBefore(rect, clonedSvg.firstChild);

      // Serialize SVG to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Create image from SVG
      const img = new Image();
      img.onload = () => {
        // Create canvas with scaled dimensions
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');

        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image scaled
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        // Draw part number text below barcode
        if (partNumber) {
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(partNumber, width / 2, baseHeight + 20);
        }

        // Get PNG data URL
        const pngDataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(pngDataUrl);
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };

      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Copy barcode SVG as PNG image to clipboard
 * @param {SVGElement} svgElement - The SVG element to copy
 * @param {string} partNumber - Optional part number to include in image
 * @returns {Promise<boolean>} Success status
 */
export const copyBarcodeAsImage = async (svgElement, partNumber = null) => {
  try {
    const pngDataUrl = await svgToPngDataUrl(svgElement, 3, partNumber);

    // Convert data URL to blob
    const response = await fetch(pngDataUrl);
    const blob = await response.blob();

    // Use Clipboard API to copy image
    if (navigator.clipboard && navigator.clipboard.write) {
      const clipboardItem = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([clipboardItem]);
      return true;
    } else {
      // Fallback: Open image in new window for manual copy
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Barcode Image</title></head>
            <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f0f0f0;">
              <div style="background:white;padding:20px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
                <img src="${pngDataUrl}" />
                <p style="text-align:center;margin-top:10px;color:#666;">Right-click and "Copy image" to copy</p>
              </div>
            </body>
          </html>
        `);
      }
      return false;
    }
  } catch (err) {
    console.error('Failed to copy barcode as image:', err);
    throw err;
  }
};

/**
 * Download barcode SVG as PNG file
 * @param {SVGElement} svgElement - The SVG element to download
 * @param {string} filename - Filename without extension
 * @param {string} partNumber - Optional part number to include in image
 */
export const downloadBarcodeAsPng = async (svgElement, filename = 'barcode', partNumber = null) => {
  try {
    const pngDataUrl = await svgToPngDataUrl(svgElement, 3, partNumber);

    // Create download link
    const link = document.createElement('a');
    link.href = pngDataUrl;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Failed to download barcode:', err);
    throw err;
  }
};

/**
 * Print single barcode label
 * @param {Object} options - Print options
 */
export const printBarcodeLabel = ({ svgElement, productName, partNumber, price, showPrice = true }) => {
  if (!svgElement) return;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode Label - ${partNumber || 'Print'}</title>
        <style>
          @media print {
            @page { margin: 5mm; size: auto; }
            body { margin: 0; padding: 0; }
            .label { page-break-after: always; }
            .label:last-child { page-break-after: auto; }
          }
          body { 
            font-family: Arial, sans-serif; 
            display: flex;
            justify-content: center;
            padding: 20px;
          }
          .label {
            border: 1px dashed #ccc;
            padding: 15px 25px;
            display: inline-block;
            text-align: center;
            background: white;
          }
          .product-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
            max-width: 250px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .part-number {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin-top: 8px;
            font-family: monospace;
          }
          .price {
            font-size: 18px;
            font-weight: bold;
            margin-top: 8px;
            color: #222;
          }
          .barcode-svg svg {
            max-width: 100%;
          }
        </style>
      </head>
      <body>
        <div class="label">
          ${productName ? `<div class="product-name">${productName}</div>` : ''}
          <div class="barcode-svg">${svgElement.outerHTML}</div>
          ${partNumber ? `<div class="part-number">P/N: ${partNumber}</div>` : ''}
          ${showPrice && price ? `<div class="price">$${parseFloat(price).toFixed(2)}</div>` : ''}
        </div>
        <script>
          window.onload = function() { 
            setTimeout(function() { window.print(); }, 100);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
};

/**
 * Brother P-touch D610BT tape preset configurations
 * Dimensions are in mm; barcode sizing is tuned for each tape width.
 */
export const BROTHER_TAPE_PRESETS = {
  '3.5mm': { name: '3.5mm TZe', tapeWidth: 3.5, labelHeight: 3.5, barcodeWidth: 0.8, barcodeHeight: 8, fontSize: 4, orientation: 'landscape', showName: false, showPrice: false },
  '6mm':   { name: '6mm TZe',   tapeWidth: 6,   labelHeight: 6,   barcodeWidth: 1.0, barcodeHeight: 14, fontSize: 5, orientation: 'landscape', showName: false, showPrice: false },
  '9mm':   { name: '9mm TZe',   tapeWidth: 9,   labelHeight: 9,   barcodeWidth: 1.2, barcodeHeight: 20, fontSize: 6, orientation: 'landscape', showName: false, showPrice: false },
  '12mm':  { name: '12mm TZe',  tapeWidth: 12,  labelHeight: 12,  barcodeWidth: 1.5, barcodeHeight: 28, fontSize: 7, orientation: 'landscape', showName: true,  showPrice: false },
  '18mm':  { name: '18mm TZe',  tapeWidth: 18,  labelHeight: 18,  barcodeWidth: 1.8, barcodeHeight: 38, fontSize: 9, orientation: 'portrait',  showName: true,  showPrice: false },
  '24mm':  { name: '24mm TZe',  tapeWidth: 24,  labelHeight: 24,  barcodeWidth: 2.2, barcodeHeight: 50, fontSize: 11, orientation: 'portrait', showName: true,  showPrice: true },
};

export const DEFAULT_LABEL_CONFIG = {
  tapePreset: '24mm',
  copies: 1,
  showProductName: true,
  showPartNumber: true,
  showPrice: false,
  orientation: 'portrait', // 'portrait' or 'landscape'
  printerModel: 'brother_d610bt',
};

/**
 * Get saved label settings from localStorage, merged with defaults
 */
export const getSavedLabelSettings = () => {
  try {
    const saved = localStorage.getItem('labelPrinterSettings');
    if (saved) {
      return { ...DEFAULT_LABEL_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load label settings:', e);
  }
  return { ...DEFAULT_LABEL_CONFIG };
};

/**
 * Save label settings to localStorage
 */
export const saveLabelSettings = (settings) => {
  try {
    localStorage.setItem('labelPrinterSettings', JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save label settings:', e);
  }
};

/**
 * Print multiple barcode labels (bulk print) — optimized for Brother P-touch D610BT
 * @param {Array} products - Array of product objects with barcode/part_number info
 * @param {Object} config - Label configuration
 * @param {string} config.tapePreset - Tape preset key (e.g. '24mm')
 * @param {number} config.copies - Number of copies per label
 * @param {boolean} config.showProductName - Show product name on label
 * @param {boolean} config.showPartNumber - Show part number on label
 * @param {boolean} config.showPrice - Show price on label
 * @param {string} config.orientation - 'portrait' or 'landscape'
 */
export const printBulkBarcodeLabels = (products, config = {}) => {
  if (!products || products.length === 0) return;

  const settings = { ...getSavedLabelSettings(), ...config };
  const tape = BROTHER_TAPE_PRESETS[settings.tapePreset] || BROTHER_TAPE_PRESETS['24mm'];
  const copies = Math.max(1, settings.copies || 1);
  const orientation = settings.orientation || tape.orientation;

  // Build labels array with copies
  const allLabels = [];
  products.forEach(product => {
    for (let c = 0; c < copies; c++) {
      allLabels.push(product);
    }
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const labelsHtml = allLabels.map((product, idx) => {
    const partNum = product.part_number || product.barcode || '';
    const barcodeVal = product.barcode || product.part_number || '';
    return `
      <div class="label">
        ${settings.showProductName && product.name ? `<div class="product-name">${product.name}</div>` : ''}
        <svg id="barcode-${idx}"></svg>
        ${settings.showPartNumber && partNum ? `<div class="part-number">P/N: ${partNum}</div>` : ''}
        ${settings.showPrice && product.price ? `<div class="price">$${parseFloat(product.price).toFixed(2)}</div>` : ''}
      </div>
    `;
  }).join('');

  const barcodeScripts = allLabels.map((product, idx) => {
    const barcodeVal = product.barcode || product.part_number || '';
    if (!barcodeVal) return '';
    return `
      if (document.getElementById('barcode-${idx}')) {
        try {
          JsBarcode('#barcode-${idx}', '${barcodeVal.replace(/'/g, "\\'")}', {
            format: 'CODE128',
            width: ${tape.barcodeWidth},
            height: ${tape.barcodeHeight},
            displayValue: false,
            margin: 2,
            background: '#ffffff',
            lineColor: '#000000'
          });
        } catch(e) { console.error('Barcode error for ${idx}:', e); }
      }
    `;
  }).join('\n');

  // Calculate page dimensions based on tape and orientation
  const tapeH = tape.tapeWidth; // mm
  const labelW = Math.max(40, tapeH * 3); // label length on continuous tape
  const pageWidth = orientation === 'landscape' ? labelW : tapeH;
  const pageHeight = orientation === 'landscape' ? tapeH : labelW;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Barcode Labels — Brother P-touch D610BT (${tape.name})</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
      <style>
        @media print {
          @page {
            size: ${pageWidth}mm ${pageHeight}mm;
            margin: 1mm;
          }
          body { margin: 0; padding: 0; }
          .print-controls { display: none !important; }
          .print-info { display: none !important; }
          .label {
            page-break-inside: avoid;
            page-break-after: always;
            margin: 0;
            padding: 1mm;
            border: none;
          }
          .label:last-child { page-break-after: auto; }
        }

        * { box-sizing: border-box; }

        body {
          font-family: Arial, Helvetica, sans-serif;
          padding: 20px;
          background: #f5f5f5;
        }

        .print-controls {
          position: sticky;
          top: 0;
          background: white;
          padding: 16px 20px;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          z-index: 100;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .print-controls button {
          padding: 12px 28px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          background: #16a34a;
          color: white;
          border: none;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .print-controls button:hover { background: #15803d; }

        .print-info {
          background: #e0f2fe;
          border: 1px solid #7dd3fc;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          font-size: 13px;
          color: #0c4a6e;
        }

        .labels-container {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: flex-start;
        }

        .label {
          border: 1px dashed #cbd5e1;
          padding: 8px 12px;
          text-align: center;
          background: white;
          border-radius: 6px;
          min-width: 180px;
          max-width: 280px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .product-name {
          font-weight: 700;
          font-size: ${Math.max(8, tape.fontSize - 1)}px;
          margin-bottom: 3px;
          max-width: 240px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #1e293b;
        }

        .part-number {
          font-size: ${tape.fontSize}px;
          font-weight: 800;
          color: #000;
          margin-top: 3px;
          font-family: 'Courier New', monospace;
          letter-spacing: 1px;
        }

        .price {
          font-size: ${Math.max(8, tape.fontSize - 1)}px;
          font-weight: 700;
          margin-top: 2px;
          color: #1e293b;
        }

        .barcode-svg svg {
          max-width: 100%;
        }
      </style>
    </head>
    <body>
      <div class="print-controls">
        <div>
          <strong>Brother P-touch D610BT</strong> — ${tape.name} tape, ${orientation}, ${allLabels.length} label${allLabels.length !== 1 ? 's' : ''}
        </div>
        <button onclick="window.print()">🖨️ Print ${allLabels.length} Labels</button>
      </div>

      <div class="print-info">
        💡 <strong>Tip:</strong> In the print dialog, select your <strong>Brother P-touch D610BT</strong> printer.
        Set paper size to <strong>${tape.name}</strong> tape and margins to <strong>minimum</strong> for best results.
      </div>

      <div class="labels-container">
        ${labelsHtml}
      </div>

      <script>
        window.onload = function() {
          ${barcodeScripts}
        }
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

export default {
  svgToPngDataUrl,
  copyBarcodeAsImage,
  downloadBarcodeAsPng,
  printBarcodeLabel,
  printBulkBarcodeLabels,
  BROTHER_TAPE_PRESETS,
  DEFAULT_LABEL_CONFIG,
  getSavedLabelSettings,
  saveLabelSettings
};
