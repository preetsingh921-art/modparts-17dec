import React, { useState, useEffect, useRef } from 'react';
import BarcodeScanner from './BarcodeScanner';
import { movementsAPI } from '../../api/inventory';
import { getCategories } from '../../api/categories';
import { useToast } from '../../context/ToastContext';
import { ScanBulkIcon } from './ScanIcons';

/**
 * Format raw Yamaha part numbers into standard hyphenated SKU
 */
function formatYamahaSKU(raw) {
  if (!raw) return '';
  const clean = raw.trim().toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
  if (clean.startsWith('9')) {
    if (clean.length === 12) {
      return `${clean.substring(0, 5)}-${clean.substring(5, 10)}-${clean.substring(10, 12)}`;
    } else if (clean.length === 10) {
      return `${clean.substring(0, 5)}-${clean.substring(5, 10)}`;
    }
  } else {
    if (clean.length === 12) {
      return `${clean.substring(0, 3)}-${clean.substring(3, 8)}-${clean.substring(8, 10)}-${clean.substring(10, 12)}`;
    } else if (clean.length === 10) {
      return `${clean.substring(0, 3)}-${clean.substring(3, 8)}-${clean.substring(8, 10)}`;
    }
  }
  return raw;
}

const BulkScanIntake = ({
  warehouses = [],
  activeWarehouseId = null,
  bins = [],
  onIntakeComplete = null
}) => {
  const { success, error: showError } = useToast();

  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    activeWarehouseId ? String(activeWarehouseId) : (warehouses[0]?.id ? String(warehouses[0].id) : '')
  );
  const [defaultBin, setDefaultBin] = useState('INCOMING');
  const [categories, setCategories] = useState([]);
  const [batchItems, setBatchItems] = useState([]);
  const [manualSkuInput, setManualSkuInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastScannedFeedback, setLastScannedFeedback] = useState(null);
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [scannerCollapsed, setScannerCollapsed] = useState(false);

  // Sync active warehouse ID if passed
  useEffect(() => {
    if (activeWarehouseId) {
      setSelectedWarehouseId(String(activeWarehouseId));
    }
  }, [activeWarehouseId]);

  // Load categories on mount
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats || []);
      } catch (err) {
        console.warn('Failed to load categories:', err);
      }
    };
    fetchCats();
  }, []);

  // Handle a continuous scan event
  const handleScan = (scannedCode, product = null) => {
    if (!scannedCode) return;
    const cleanScanned = scannedCode.trim();
    const cleanKey = cleanScanned.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    setBatchItems(prevItems => {
      // Check if this SKU is already in the batch
      const existingIdx = prevItems.findIndex(
        item => item.cleanKey === cleanKey
      );

      if (existingIdx !== -1) {
        // Increment quantity of existing batch item
        const updated = [...prevItems];
        const currentItem = updated[existingIdx];
        const newQty = currentItem.quantity + 1;
        updated[existingIdx] = {
          ...currentItem,
          quantity: newQty
        };

        setLastScannedFeedback({
          code: cleanScanned,
          name: currentItem.name,
          quantity: newQty,
          isNew: currentItem.is_new_sku,
          isRepeat: true
        });
        setActiveHighlightId(currentItem.id);
        setTimeout(() => setActiveHighlightId(null), 1200);

        return updated;
      }

      // Brand new item in the batch
      const formattedSKU = formatYamahaSKU(cleanScanned);
      const isNewSku = !product;
      const newItemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newItem = {
        id: newItemId,
        cleanKey,
        barcode: cleanScanned,
        part_number: product?.part_number || formattedSKU,
        name: product?.name || (formattedSKU !== cleanScanned ? `Part ${formattedSKU}` : `Part ${cleanScanned}`),
        category_id: product?.category_id || (categories[0]?.id || null),
        price: product?.price ? parseFloat(product.price) : 0.00,
        quantity: 1,
        bin_number: defaultBin || product?.bin_number || '',
        condition_status: product?.condition_status || 'New',
        is_new_sku: isNewSku,
        existing_stock: product?.quantity || 0,
        warehouse_id: selectedWarehouseId
      };

      setLastScannedFeedback({
        code: cleanScanned,
        name: newItem.name,
        quantity: 1,
        isNew: isNewSku,
        isRepeat: false
      });
      setActiveHighlightId(newItemId);
      setTimeout(() => setActiveHighlightId(null), 1200);

      return [newItem, ...prevItems];
    });
  };

  // Manual Add SKU button
  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!manualSkuInput.trim()) return;
    handleScan(manualSkuInput.trim(), null);
    setManualSkuInput('');
  };

  // Item field update handler
  const handleUpdateItem = (id, field, value) => {
    setBatchItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Quantity step handler
  const handleStepQuantity = (id, delta) => {
    setBatchItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  // Remove item handler
  const handleRemoveItem = (id) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
  };

  // Clear batch handler
  const handleClearBatch = () => {
    if (batchItems.length === 0) return;
    if (window.confirm(`Clear all ${batchItems.length} scanned items from this batch?`)) {
      setBatchItems([]);
      setLastScannedFeedback(null);
    }
  };

  // Commit batch to inventory
  const handleCommitBatch = async () => {
    if (batchItems.length === 0) {
      showError('Please scan at least one product before submitting');
      return;
    }

    if (!selectedWarehouseId) {
      showError('Please select a target destination warehouse');
      return;
    }

    // Validate that all items have valid names
    const invalidItem = batchItems.find(item => !item.name || !item.name.trim());
    if (invalidItem) {
      showError(`Please provide a product name for SKU: ${invalidItem.barcode}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadItems = batchItems.map(item => ({
        barcode: item.barcode,
        part_number: item.part_number,
        name: item.name,
        category_id: item.category_id,
        price: parseFloat(item.price) || 0.00,
        quantity: parseInt(item.quantity) || 1,
        bin_number: item.bin_number || defaultBin,
        condition_status: item.condition_status || 'New',
        is_new_sku: item.is_new_sku
      }));

      const res = await movementsAPI.bulkIntake({
        warehouseId: selectedWarehouseId,
        items: payloadItems,
        defaultBin
      });

      if (res.success) {
        setSummaryData({
          warehouseName: warehouses.find(w => String(w.id) === String(selectedWarehouseId))?.name || `Warehouse ${selectedWarehouseId}`,
          processedCount: res.processedCount || payloadItems.length,
          updatedCount: res.updatedCount || 0,
          createdCount: res.createdCount || 0,
          totalUnits: payloadItems.reduce((sum, it) => sum + it.quantity, 0),
          items: res.items || []
        });
        setShowSummaryModal(true);
        setBatchItems([]);
        setLastScannedFeedback(null);
        success(res.message || 'Bulk intake committed successfully!');

        if (onIntakeComplete) {
          onIntakeComplete(res);
        }
      } else {
        showError(res.message || 'Failed to complete bulk intake');
      }
    } catch (err) {
      console.error('Bulk intake submit error:', err);
      showError(err.message || 'Failed to complete bulk intake');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Computed metrics
  const totalUnits = batchItems.reduce((acc, it) => acc + (parseInt(it.quantity) || 0), 0);
  const uniqueSkus = batchItems.length;
  const existingCount = batchItems.filter(it => !it.is_new_sku).length;
  const newSkuCount = batchItems.filter(it => it.is_new_sku).length;

  return (
    <div className="bulk-scan-intake text-white space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ScanBulkIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Continuous Bulk Scan Intake
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Batch Mode
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Scan multiple parts continuously (USB Gun or Camera). After N scans, review and commit all items into inventory at once.
              </p>
            </div>
          </div>

          {/* Quick Scanner View Toggle */}
          <button
            type="button"
            onClick={() => setScannerCollapsed(!scannerCollapsed)}
            className="self-start md:self-auto text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-2 transition-colors"
          >
            <span>{scannerCollapsed ? '📷 Expand Scanner' : '▲ Collapse Scanner'}</span>
          </button>
        </div>

        {/* Warehouse & Default Bin Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Target Destination Warehouse *
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  📍 {w.name} {w.code ? `(${w.code})` : ''} - {w.country}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Default Destination Bin
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={defaultBin}
                onChange={(e) => setDefaultBin(e.target.value.toUpperCase())}
                placeholder="e.g. INCOMING, A-101"
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400 uppercase"
              />
              {bins.length > 0 && (
                <select
                  onChange={(e) => e.target.value && setDefaultBin(e.target.value)}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-2 text-xs text-slate-400 focus:outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>Presets</option>
                  {bins.slice(0, 15).map(b => (
                    <option key={b.id || b.bin_number} value={b.bin_number}>
                      {b.bin_number}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Manual Barcode / SKU Add
            </label>
            <form onSubmit={handleManualAdd} className="flex gap-2">
              <input
                type="text"
                value={manualSkuInput}
                onChange={(e) => setManualSkuInput(e.target.value)}
                placeholder="Type or paste SKU..."
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="bg-slate-700 hover:bg-slate-600 border border-slate-500 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                + Add
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Embedded Continuous Barcode Scanner */}
      {!scannerCollapsed && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
          <BarcodeScanner
            continuous={true}
            autoStart={false}
            warehouseId={selectedWarehouseId}
            onScan={handleScan}
          />
        </div>
      )}

      {/* Live Feedback Toast Banner */}
      {lastScannedFeedback && (
        <div className={`p-3 rounded-lg border flex items-center justify-between text-sm transition-all ${
          lastScannedFeedback.isNew
            ? 'bg-purple-950/40 border-purple-600/50 text-purple-200'
            : lastScannedFeedback.isRepeat
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
            : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {lastScannedFeedback.isNew ? '✨' : lastScannedFeedback.isRepeat ? '➕' : '✅'}
            </span>
            <span>
              <strong>{lastScannedFeedback.code}</strong> — {lastScannedFeedback.name}
            </span>
            <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-bold">
              Qty: {lastScannedFeedback.quantity}
            </span>
            {lastScannedFeedback.isNew && (
              <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded font-semibold">
                New SKU detected
              </span>
            )}
          </div>
          <span className="text-xs opacity-75 font-mono">Continuous Scan Active</span>
        </div>
      )}

      {/* Batch Overview & Review Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {/* Table Header Bar */}
        <div className="bg-slate-800/90 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-white text-base">
              Scanned Batch Queue
            </h3>
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
              {uniqueSkus} unique SKUs • {totalUnits} total units
            </span>
          </div>

          <div className="flex items-center gap-2">
            {batchItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearBatch}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-950/40 text-red-300 border border-red-800/50 hover:bg-red-900/60 transition-colors"
              >
                Clear Batch
              </button>
            )}
            <button
              type="button"
              disabled={isSubmitting || batchItems.length === 0}
              onClick={handleCommitBatch}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all ${
                batchItems.length === 0 || isSubmitting
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 hover:scale-[1.02]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-base">⏳</span>
                  Adding to Inventory...
                </>
              ) : (
                <>
                  <span>📥 Add {totalUnits} Products to Inventory</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Batch Queue Table */}
        {batchItems.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <div className="text-4xl mb-3">📦⚡</div>
            <p className="text-base font-semibold text-slate-400">Batch queue is currently empty</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Scan product barcodes using your USB scanner gun or mobile camera. Each scan will appear here and increment automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700/80">
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3 w-40">Part / SKU</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3 w-32">Status</th>
                  <th className="p-3 w-40">Category</th>
                  <th className="p-3 w-28 text-center">Price ($)</th>
                  <th className="p-3 w-32 text-center">Quantity</th>
                  <th className="p-3 w-28">Bin</th>
                  <th className="p-3 w-16 text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {batchItems.map((item, idx) => {
                  const isHighlighted = activeHighlightId === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-amber-950/50 border-l-4 border-l-amber-400'
                          : idx % 2 === 0
                          ? 'bg-slate-900/60 hover:bg-slate-800/40'
                          : 'bg-slate-900/20 hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Index */}
                      <td className="p-3 text-center text-xs text-slate-500 font-mono">
                        {idx + 1}
                      </td>

                      {/* Part Number / Barcode */}
                      <td className="p-3">
                        <div className="font-mono text-xs font-bold text-amber-300">
                          {item.part_number}
                        </div>
                        {item.barcode !== item.part_number && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Scan: {item.barcode}
                          </div>
                        )}
                      </td>

                      {/* Editable Product Name */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          placeholder="Product Name"
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </td>

                      {/* Status Badge */}
                      <td className="p-3">
                        {item.is_new_sku ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-purple-900/50 text-purple-300 border border-purple-700/60">
                            ✨ New SKU
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">
                            ✅ In Catalog ({item.existing_stock} in stock)
                          </span>
                        )}
                      </td>

                      {/* Category Dropdown */}
                      <td className="p-3">
                        <select
                          value={item.category_id || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'category_id', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="">Uncategorized</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Unit Price Input */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)}
                          className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-center text-white focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </td>

                      {/* Quantity Controls */}
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(item.id, -1)}
                            className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-12 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-center font-bold text-white focus:outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(item.id, 1)}
                            className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Destination Bin */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.bin_number || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'bin_number', e.target.value.toUpperCase())}
                          placeholder={defaultBin || 'Bin'}
                          className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white uppercase font-mono focus:outline-none focus:border-amber-400"
                        />
                      </td>

                      {/* Delete */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                          title="Remove item from batch"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary Bar */}
        {batchItems.length > 0 && (
          <div className="bg-slate-800/80 px-5 py-3 border-t border-slate-700 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3">
            <div className="flex items-center gap-4">
              <span>Total Units: <strong className="text-white">{totalUnits}</strong></span>
              <span>Unique Parts: <strong className="text-white">{uniqueSkus}</strong></span>
              <span>Existing in Catalog: <strong className="text-emerald-400">{existingCount}</strong></span>
              <span>New SKUs: <strong className="text-purple-300">{newSkuCount}</strong></span>
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCommitBatch}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg shadow transition-colors"
            >
              Commit All to Inventory →
            </button>
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {showSummaryModal && summaryData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-white">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4 text-2xl">
              ✓
            </div>
            <h3 className="text-xl font-bold text-center mb-1">
              Bulk Intake Successful!
            </h3>
            <p className="text-xs text-slate-400 text-center mb-5">
              Added to <span className="text-amber-400 font-semibold">{summaryData.warehouseName}</span>
            </p>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-slate-800/90 border border-slate-700 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white font-mono">{summaryData.totalUnits}</div>
                <div className="text-[11px] text-slate-400 uppercase mt-0.5">Total Units</div>
              </div>
              <div className="bg-slate-800/90 border border-slate-700 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400 font-mono">{summaryData.updatedCount}</div>
                <div className="text-[11px] text-slate-400 uppercase mt-0.5">Stock Updated</div>
              </div>
              <div className="bg-slate-800/90 border border-slate-700 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-400 font-mono">{summaryData.createdCount}</div>
                <div className="text-[11px] text-slate-400 uppercase mt-0.5">New Products</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
              >
                Scan Next Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkScanIntake;
