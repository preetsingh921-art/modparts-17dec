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
 * Print multiple barcode labels (bulk print)
 * @param {Array} products - Array of product objects with barcode info
 */
export const printBulkBarcodeLabels = (products) => {
  if (!products || products.length === 0) return;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const labelsHtml = products.map(product => {
      // Only barcode and part number - no product name, no price
      return `
        <div class="label">
          <svg id="barcode-${product.id}"></svg>
          ${product.barcode ? `<div class="part-number">${product.barcode}</div>` : ''}
        </div>
      `;
    }).join('');

    const barcodeScripts = products.map(product => `
      if (document.getElementById('barcode-${product.id}') && '${product.barcode}') {
        try {
          JsBarcode('#barcode-${product.id}', '${product.barcode}', {
            format: 'CODE128',
            width: 2,
            height: 60,
            displayValue: false,
            margin: 5,
            background: '#ffffff',
            lineColor: '#000000'
          });
        } catch(e) { console.error(e); }
      }
    `).join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bulk Barcode Labels</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          @media print {
            @page { margin: 5mm; size: auto; }
            body { margin: 0; padding: 0; }
            .labels-container { display: block; }
            .label { 
              page-break-inside: avoid;
              margin-bottom: 10px;
            }
          }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
          }
          .labels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            justify-content: flex-start;
          }
          .label {
            border: 1px dashed #ccc;
            padding: 15px 20px;
            text-align: center;
            background: white;
            min-width: 200px;
          }
          .product-name {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 5px;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .part-number {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            margin-top: 8px;
            font-family: monospace;
          }
          .price {
            font-size: 14px;
            font-weight: bold;
            margin-top: 5px;
          }
          .print-controls {
            position: fixed;
            top: 10px;
            right: 10px;
            background: white;
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 100;
          }
          .print-controls button {
            padding: 10px 20px;
            font-size: 14px;
            cursor: pointer;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
          }
          @media print {
            .print-controls { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-controls">
          <button onclick="window.print()">🖨️ Print ${products.length} Labels</button>
        </div>
        <h2 style="margin-bottom: 20px;">Barcode Labels (${products.length})</h2>
        <div class="labels-container">
          ${labelsHtml}
        </div>
        <script>
          window.onload = function() {
            ${barcodeScripts}
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
};

export default {
  svgToPngDataUrl,
  copyBarcodeAsImage,
  downloadBarcodeAsPng,
  printBarcodeLabel,
  printBulkBarcodeLabels
};
