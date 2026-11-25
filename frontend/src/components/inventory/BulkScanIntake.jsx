import React, { useState, useEffect, useRef } from 'react';
import BarcodeScanner from './BarcodeScanner';
import { movementsAPI } from '../../api/inventory';
import { getCategories } from '../../api/categories';
import { getProducts } from '../../api/products';
import { useToast } from '../../context/ToastContext';
import { ScanBulkIcon, ScanSendIcon, ScanReceiveIcon } from './ScanIcons';

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

const STORAGE_PREFIX = 'modparts_pos_batch_v2';
const PARKED_PREFIX = 'modparts_pos_parked_v2';

const BulkScanIntake = ({
  warehouses = [],
  activeWarehouseId = null,
  bins = [],
  onIntakeComplete = null,
  initialMode = 'intake' // 'intake' | 'send' | 'receive'
}) => {
  const { success, error: showError } = useToast();

  // Mode: 'intake' (Bulk Restock), 'send' (Outbound Dispatch), 'receive' (Inbound Reception)
  const [activeMode, setActiveMode] = useState(initialMode);

  // Warehouse states
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    activeWarehouseId ? String(activeWarehouseId) : (warehouses[0]?.id ? String(warehouses[0].id) : '')
  );
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [defaultBin, setDefaultBin] = useState('INCOMING');
  const [categories, setCategories] = useState([]);
  const [batchItems, setBatchItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastScannedFeedback, setLastScannedFeedback] = useState(null);
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [scannerCollapsed, setScannerCollapsed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [restoredNotice, setRestoredNotice] = useState(null);
  const [hasParkedBatch, setHasParkedBatch] = useState(false);

  // Unified Omni-Search State
  const [omniQuery, setOmniQuery] = useState('');
  const [omniResults, setOmniResults] = useState([]);
  const [isSearchingOmni, setIsSearchingOmni] = useState(false);
  const [showOmniDropdown, setShowOmniDropdown] = useState(false);
  const searchTimerRef = useRef(null);
  const omniInputRef = useRef(null);

  // Web Audio Synthesizer Ref for zero-dependency POS beeps
  const audioCtxRef = useRef(null);

  // Sync mode if initialMode prop updates
  useEffect(() => {
    if (initialMode && ['intake', 'send', 'receive'].includes(initialMode)) {
      setActiveMode(initialMode);
    }
  }, [initialMode]);

  // Sync active warehouse ID if passed
  useEffect(() => {
    if (activeWarehouseId) {
      setSelectedWarehouseId(String(activeWarehouseId));
    }
  }, [activeWarehouseId]);

  // Set default destination warehouse for send mode if empty
  useEffect(() => {
    if (activeMode === 'send' && !destinationWarehouseId && warehouses.length > 1) {
      const otherWh = warehouses.find(w => String(w.id) !== String(selectedWarehouseId));
      if (otherWh) setDestinationWarehouseId(String(otherWh.id));
    }
  }, [activeMode, selectedWarehouseId, warehouses, destinationWarehouseId]);

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

  // Web Audio Synthesizer: POS beeps & chimes
  const playBeep = (type = 'scan') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'repeat') {
        // High 2-tone chime for incrementing existing item
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.setValueAtTime(2400, now + 0.04);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'error') {
        // Low frequency buzzer for out of stock or error
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      } else {
        // Crisp 1800Hz POS barcode scan beep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // LocalStorage Persistence: Rehydrate batch on mode / warehouse change or refresh
  const currentStorageKey = `${STORAGE_PREFIX}_${activeMode}_${selectedWarehouseId || 'wh'}`;
  const currentParkedKey = `${PARKED_PREFIX}_${activeMode}_${selectedWarehouseId || 'wh'}`;

  useEffect(() => {
    // Check if parked batch exists
    const parkedRaw = localStorage.getItem(currentParkedKey);
    setHasParkedBatch(!!parkedRaw);

    // Rehydrate active batch
    try {
      const raw = localStorage.getItem(currentStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          setBatchItems(parsed.items);
          if (parsed.defaultBin) setDefaultBin(parsed.defaultBin);
          if (parsed.destinationWarehouseId) setDestinationWarehouseId(parsed.destinationWarehouseId);
          const minutesAgo = Math.max(0, Math.round((Date.now() - (parsed.savedAt || Date.now())) / 60000));
          setRestoredNotice({
            count: parsed.items.length,
            minutesAgo
          });
        } else {
          setBatchItems([]);
          setRestoredNotice(null);
        }
      } else {
        setBatchItems([]);
        setRestoredNotice(null);
      }
    } catch (err) {
      console.warn('Failed to restore batch from localStorage:', err);
    }
  }, [currentStorageKey, currentParkedKey]);

  // LocalStorage Persistence: Auto-save on batch modification
  useEffect(() => {
    if (batchItems.length > 0) {
      try {
        localStorage.setItem(currentStorageKey, JSON.stringify({
          items: batchItems,
          defaultBin,
          destinationWarehouseId,
          savedAt: Date.now()
        }));
      } catch (err) {
        console.warn('Failed to save batch to localStorage:', err);
      }
    } else {
      try {
        localStorage.removeItem(currentStorageKey);
      } catch (e) {}
    }
  }, [batchItems, defaultBin, destinationWarehouseId, currentStorageKey]);

  // Hold / Park current batch
  const handleParkBatch = () => {
    if (batchItems.length === 0) return;
    try {
      localStorage.setItem(currentParkedKey, JSON.stringify({
        items: batchItems,
        defaultBin,
        destinationWarehouseId,
        parkedAt: Date.now()
      }));
      setBatchItems([]);
      setLastScannedFeedback(null);
      setHasParkedBatch(true);
      setRestoredNotice(null);
      success(`Batch parked (${batchItems.length} items). New scan session ready.`);
    } catch (e) {
      showError('Failed to park batch');
    }
  };

  // Resume parked batch
  const handleResumeParked = () => {
    try {
      const raw = localStorage.getItem(currentParkedKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        setBatchItems(parsed.items);
        if (parsed.defaultBin) setDefaultBin(parsed.defaultBin);
        if (parsed.destinationWarehouseId) setDestinationWarehouseId(parsed.destinationWarehouseId);
        localStorage.removeItem(currentParkedKey);
        setHasParkedBatch(false);
        success(`Resumed parked batch with ${parsed.items.length} items!`);
      }
    } catch (e) {
      showError('Failed to resume parked batch');
    }
  };

  // Handle Scan Event (from USB gun, camera, or omni-search)
  const handleScan = (scannedCode, product = null) => {
    if (!scannedCode) return;
    const cleanScanned = scannedCode.trim();
    const cleanKey = cleanScanned.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    setBatchItems(prevItems => {
      // Check if this SKU is already in the batch
      const existingIdx = prevItems.findIndex(item => item.cleanKey === cleanKey);

      if (existingIdx !== -1) {
        // Increment quantity of existing batch item
        const updated = [...prevItems];
        const currentItem = updated[existingIdx];
        const newQty = currentItem.quantity + 1;

        // Check stock limitation in Send mode
        if (activeMode === 'send' && currentItem.existing_stock !== undefined && newQty > currentItem.existing_stock) {
          playBeep('error');
        } else {
          playBeep('repeat');
        }

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

      // Calculate existing stock at selected source warehouse
      let originStock = 0;
      if (product) {
        if (selectedWarehouseId && String(product.warehouse_id) === String(selectedWarehouseId)) {
          originStock = product.quantity || 0;
        } else if (Array.isArray(product.warehouse_stock)) {
          const matchWh = product.warehouse_stock.find(w => String(w.warehouse_id) === String(selectedWarehouseId));
          originStock = matchWh ? (matchWh.quantity || 0) : 0;
        } else {
          originStock = product.local_quantity !== undefined ? product.local_quantity : (product.quantity || 0);
        }
      }

      const newItem = {
        id: newItemId,
        product_id: product?.id || null,
        cleanKey,
        barcode: cleanScanned,
        part_number: product?.part_number || formattedSKU,
        name: product?.name || (formattedSKU !== cleanScanned ? `Part ${formattedSKU}` : `Part ${cleanScanned}`),
        category_id: product?.category_id || (categories[0]?.id || null),
        price: product?.price ? parseFloat(product.price) : 0.00,
        quantity: 1,
        bin_number: product?.bin_number || defaultBin || '',
        condition_status: product?.condition_status || 'New',
        is_new_sku: isNewSku,
        existing_stock: originStock,
        warehouse_id: selectedWarehouseId
      };

      if (activeMode === 'send' && !isNewSku && originStock < 1) {
        playBeep('error');
      } else {
        playBeep('scan');
      }

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

  // Debounced Omni-Search handler
  const handleOmniSearchChange = (val) => {
    setOmniQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!val || val.trim().length < 2) {
      setOmniResults([]);
      setShowOmniDropdown(false);
      return;
    }
    setIsSearchingOmni(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const searchParams = selectedWarehouseId
          ? { search: val.trim(), warehouse_id: selectedWarehouseId, global_catalog: 'true', limit: 25 }
          : { search: val.trim(), limit: 25 };
        const res = await getProducts(searchParams);
        const prods = res.products || [];
        setOmniResults(prods);
        setShowOmniDropdown(prods.length > 0);
      } catch (err) {
        setOmniResults([]);
      } finally {
        setIsSearchingOmni(false);
      }
    }, 280);
  };

  // Select product from Omni-Search dropdown
  const handleSelectOmniProduct = (product) => {
    setShowOmniDropdown(false);
    setOmniQuery('');
    setOmniResults([]);
    const code = product.part_number || product.barcode || product.name;
    handleScan(code, product);
    omniInputRef.current?.focus();
  };

  // Submit Omni-Search (Enter key or Add button)
  const handleOmniSubmit = (e) => {
    e.preventDefault();
    if (!omniQuery.trim()) return;
    const query = omniQuery.trim();
    setShowOmniDropdown(false);

    // Exact match in search results
    const exactMatch = omniResults.find(p =>
      p.part_number?.toUpperCase() === query.toUpperCase() ||
      p.barcode?.toUpperCase() === query.toUpperCase()
    );

    handleScan(query, exactMatch || omniResults[0] || null);
    setOmniQuery('');
    setOmniResults([]);
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
          if (activeMode === 'send' && item.existing_stock !== undefined && newQty > item.existing_stock) {
            playBeep('error');
          } else if (delta > 0) {
            playBeep('repeat');
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  // Multiplier (+5, +10)
  const handleMultiplyQuantity = (id, addQty) => {
    handleStepQuantity(id, addQty);
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
      setRestoredNotice(null);
      try {
        localStorage.removeItem(currentStorageKey);
      } catch (e) {}
    }
  };

  // Commit batch according to activeMode
  const handleCommitBatch = async () => {
    if (batchItems.length === 0) {
      showError('Please scan at least one product before submitting');
      return;
    }

    if (!selectedWarehouseId) {
      showError('Please select a target warehouse');
      return;
    }

    // Validate names
    const invalidItem = batchItems.find(item => !item.name || !item.name.trim());
    if (invalidItem) {
      showError(`Please provide a product name for SKU: ${invalidItem.barcode}`);
      return;
    }

    // Validation for SEND mode
    if (activeMode === 'send') {
      if (!destinationWarehouseId) {
        showError('Please select a destination branch warehouse for transfer');
        return;
      }
      if (String(destinationWarehouseId) === String(selectedWarehouseId)) {
        showError('Source and destination warehouses cannot be the same');
        return;
      }
      // Check stock availability
      const overStockItem = batchItems.find(item => item.quantity > (item.existing_stock || 0));
      if (overStockItem) {
        showError(`Cannot dispatch ${overStockItem.quantity} of "${overStockItem.name}". Only ${overStockItem.existing_stock || 0} available at origin warehouse.`);
        playBeep('error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payloadItems = batchItems.map(item => ({
        product_id: item.product_id || item.id,
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

      let res;
      const sourceWhName = warehouses.find(w => String(w.id) === String(selectedWarehouseId))?.name || `Warehouse ${selectedWarehouseId}`;
      const destWhName = warehouses.find(w => String(w.id) === String(destinationWarehouseId))?.name || `Warehouse ${destinationWarehouseId}`;

      if (activeMode === 'intake') {
        res = await movementsAPI.bulkIntake({
          warehouseId: selectedWarehouseId,
          items: payloadItems,
          defaultBin
        });
      } else if (activeMode === 'send') {
        res = await movementsAPI.bulkShip({
          fromWarehouseId: selectedWarehouseId,
          toWarehouseId: destinationWarehouseId,
          items: payloadItems,
          notes: `POS Outbound Batch Transfer (${payloadItems.length} items)`
        });
      } else if (activeMode === 'receive') {
        res = await movementsAPI.bulkReceive({
          warehouseId: selectedWarehouseId,
          items: payloadItems,
          defaultBin
        });
      }

      if (res && (res.success || res.movements || res.processedCount !== undefined)) {
        setSummaryData({
          mode: activeMode,
          sourceWarehouseName: sourceWhName,
          destWarehouseName: destWhName,
          processedCount: payloadItems.length,
          updatedCount: res.updatedCount || res.movements?.length || payloadItems.length,
          createdCount: res.createdCount || 0,
          totalUnits: payloadItems.reduce((sum, it) => sum + it.quantity, 0),
          items: payloadItems
        });
        setShowSummaryModal(true);
        setBatchItems([]);
        setLastScannedFeedback(null);
        setRestoredNotice(null);
        try {
          localStorage.removeItem(currentStorageKey);
        } catch (e) {}

        const successMsg = activeMode === 'send'
          ? `Dispatched ${payloadItems.reduce((sum, it) => sum + it.quantity, 0)} units to ${destWhName}!`
          : activeMode === 'receive'
          ? `Received ${payloadItems.reduce((sum, it) => sum + it.quantity, 0)} units into ${sourceWhName}!`
          : (res.message || 'Bulk intake committed successfully!');

        success(successMsg);

        if (onIntakeComplete) {
          onIntakeComplete(res);
        }
      } else {
        showError(res?.message || 'Failed to complete batch transaction');
      }
    } catch (err) {
      console.error('Batch submit error:', err);
      showError(err.message || 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Computed metrics
  const totalUnits = batchItems.reduce((acc, it) => acc + (parseInt(it.quantity) || 0), 0);
  const uniqueSkus = batchItems.length;
  const totalBatchValue = batchItems.reduce((acc, it) => acc + ((parseFloat(it.price) || 0) * (parseInt(it.quantity) || 1)), 0);
  const existingCount = batchItems.filter(it => !it.is_new_sku).length;
  const newSkuCount = batchItems.filter(it => it.is_new_sku).length;

  return (
    <div className="pos-bulk-scan-station text-white space-y-4">
      {/* ===== TOP POS CONTROL BAR & MODE SWITCHER ===== */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-700/70">
          {/* Station Title & Status */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shadow-inner ${
              activeMode === 'send'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : activeMode === 'receive'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-purple-500/20 border-purple-500/40 text-purple-400'
            }`}>
              {activeMode === 'send' ? (
                <ScanSendIcon className="w-6 h-6" />
              ) : activeMode === 'receive' ? (
                <ScanReceiveIcon className="w-6 h-6" />
              ) : (
                <ScanBulkIcon className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  POS Scanning Station
                </h2>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  activeMode === 'send'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : activeMode === 'receive'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                }`}>
                  {activeMode === 'send' ? 'Outbound Transfer' : activeMode === 'receive' ? 'Inbound Reception' : 'Restock / Intake'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {activeMode === 'send'
                  ? 'Scan parts to dispatch from source warehouse to destination branch.'
                  : activeMode === 'receive'
                  ? 'Scan incoming stock to receive and assign into warehouse bin racks.'
                  : 'Scan parts continuously to restock inventory or intake brand-new SKUs.'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-700 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setActiveMode('intake')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeMode === 'intake'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ScanBulkIcon className="w-3.5 h-3.5" />
              <span>Bulk Intake</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('send')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeMode === 'send'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ScanSendIcon className="w-3.5 h-3.5" />
              <span>Scan & Send</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('receive')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeMode === 'receive'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ScanReceiveIcon className="w-3.5 h-3.5" />
              <span>Scan & Receive</span>
            </button>
          </div>

          {/* Sound & Scanner Toggle Buttons */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute POS Beep' : 'Enable POS Beep'}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors"
            >
              {soundEnabled ? '🔊 Sound ON' : '🔇 Muted'}
            </button>
            <button
              type="button"
              onClick={() => setScannerCollapsed(!scannerCollapsed)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors"
            >
              {scannerCollapsed ? '📷 Expand Scanner' : '▲ Collapse Scanner'}
            </button>
          </div>
        </div>

        {/* Warehouse Selection Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 pt-1">
          {/* Warehouse 1 (Source / Operating) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              {activeMode === 'send' ? 'Origin Source Warehouse *' : 'Target Operating Warehouse *'}
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  📍 {w.name} {w.code ? `(${w.code})` : ''} - {w.country}
                </option>
              ))}
            </select>
          </div>

          {/* Mode-Specific Field 2: Destination Warehouse for Send, Default Bin for Intake/Receive */}
          {activeMode === 'send' ? (
            <div>
              <label className="block text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                Destination Branch Warehouse *
              </label>
              <select
                value={destinationWarehouseId}
                onChange={(e) => setDestinationWarehouseId(e.target.value)}
                className="w-full bg-slate-800 border border-amber-600/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="">-- Select Destination Branch --</option>
                {warehouses
                  .filter(w => String(w.id) !== String(selectedWarehouseId))
                  .map(w => (
                    <option key={w.id} value={w.id}>
                      🏢 {w.name} {w.location ? `(${w.location})` : ''} - {w.country}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Default Destination Bin Rack
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={defaultBin}
                  onChange={(e) => setDefaultBin(e.target.value.toUpperCase())}
                  placeholder="e.g. INCOMING, A-101"
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-purple-400"
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
          )}

          {/* Batch Quick Operations (Hold / Park / Resume) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              POS Batch Storage & Recovery
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={batchItems.length === 0}
                onClick={handleParkBatch}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-600 text-xs font-semibold text-slate-200 transition-colors"
                title="Park this cart to start another scanning session"
              >
                🅿️ Park Batch
              </button>
              {hasParkedBatch && (
                <button
                  type="button"
                  onClick={handleResumeParked}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-600 text-xs font-semibold text-amber-200 transition-colors animate-pulse"
                  title="Resume previously parked batch"
                >
                  📂 Resume Parked
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Restored Session Notification Banner */}
      {restoredNotice && batchItems.length > 0 && (
        <div className="bg-slate-800/90 border border-amber-500/50 rounded-lg px-4 py-2 flex items-center justify-between text-xs text-amber-200 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-sm">🛡️</span>
            <span>
              <strong>POS Recovery Active:</strong> Restored <strong>{restoredNotice.count}</strong> items from your previous session ({restoredNotice.minutesAgo}m ago). Items survive browser refresh.
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearBatch}
            className="text-[11px] px-2 py-0.5 rounded bg-amber-950/80 hover:bg-red-950 text-amber-300 hover:text-red-300 border border-amber-700/60 transition-colors"
          >
            Discard Session
          </button>
        </div>
      )}

      {/* Embedded Barcode Scanner: Clean & Compact (No giant banners) */}
      {!scannerCollapsed && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
          <BarcodeScanner
            continuous={true}
            autoStart={false}
            compact={true}
            hideManualInput={true}
            warehouseId={selectedWarehouseId}
            onScan={handleScan}
          />
        </div>
      )}

      {/* ===== UNIFIED POS OMNI-SEARCH & QUICK-ADD BAR ===== */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-md relative">
        <form onSubmit={handleOmniSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              🔍
            </span>
            <input
              ref={omniInputRef}
              type="text"
              value={omniQuery}
              onChange={(e) => handleOmniSearchChange(e.target.value)}
              placeholder="Scan barcode, or search by Part #, SKU, or Product Name (e.g. 360-14710)..."
              className="w-full bg-slate-950 border border-slate-600 focus:border-amber-400 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-slate-500 font-mono outline-none transition-colors"
            />
            {isSearchingOmni && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs animate-spin">
                ⏳
              </span>
            )}

            {/* Omni-Search Autocomplete Dropdown */}
            {showOmniDropdown && omniResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-72 overflow-y-auto z-50 text-left divide-y divide-slate-800">
                {omniResults.map((product) => {
                  const isActiveWh = selectedWarehouseId && String(product.warehouse_id) === String(selectedWarehouseId);
                  const localStock = product.local_quantity !== undefined
                    ? product.local_quantity
                    : (isActiveWh ? (product.quantity || 0) : 0);
                  const otherWhs = Array.isArray(product.warehouse_stock)
                    ? product.warehouse_stock.filter(w => String(w.warehouse_id) !== String(selectedWarehouseId) && w.quantity > 0)
                    : [];

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleSelectOmniProduct(product)}
                      className="p-2.5 hover:bg-slate-800/90 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white text-xs truncate">
                          {product.name}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {activeMode === 'send' ? (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                              localStock > 0
                                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                                : 'bg-red-950/70 text-red-300 border-red-700/60'
                            }`}>
                              {localStock > 0 ? `📦 Available: ${localStock}` : '⚠️ 0 in origin stock'}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                              Stock: {product.quantity || 0}
                            </span>
                          )}
                          <span className="text-xs font-mono font-bold text-amber-400">
                            ${parseFloat(product.price || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                        <span className="text-purple-300 font-bold">{product.part_number || product.barcode}</span>
                        {otherWhs.length > 0 && (
                          <span className="text-slate-500 text-[10px]">
                            • Other branches: {otherWhs.map(w => `${w.warehouse_name} (${w.quantity})`).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <span>+ Add SKU</span>
          </button>
        </form>
      </div>

      {/* Live Feedback Toast Banner */}
      {lastScannedFeedback && (
        <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-all ${
          lastScannedFeedback.isNew
            ? 'bg-purple-950/40 border-purple-600/50 text-purple-200'
            : lastScannedFeedback.isRepeat
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
            : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-base">
              {lastScannedFeedback.isNew ? '✨' : lastScannedFeedback.isRepeat ? '➕' : '✅'}
            </span>
            <span>
              <strong>{lastScannedFeedback.code}</strong> — {lastScannedFeedback.name}
            </span>
            <span className="bg-white/10 px-2 py-0.5 rounded font-bold font-mono">
              Qty: {lastScannedFeedback.quantity}
            </span>
            {lastScannedFeedback.isNew && (
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded font-semibold">
                New SKU detected
              </span>
            )}
          </div>
          <span className="opacity-75 font-mono text-[11px]">Hardware Gun & Camera Active</span>
        </div>
      )}

      {/* ===== POS BATCH QUEUE TABLE ===== */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {/* Table Header Bar */}
        <div className="bg-slate-800/90 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span>🛒 Scanned Batch Cart</span>
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                {uniqueSkus} lines
              </span>
            </h3>
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
              {totalUnits} units • ${totalBatchValue.toFixed(2)} total
            </span>
          </div>

          <div className="flex items-center gap-2">
            {batchItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearBatch}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-red-950/40 text-red-300 border border-red-800/50 hover:bg-red-900/60 transition-colors"
              >
                Clear Cart
              </button>
            )}
            <button
              type="button"
              disabled={isSubmitting || batchItems.length === 0}
              onClick={handleCommitBatch}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                batchItems.length === 0 || isSubmitting
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                  : activeMode === 'send'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-400/50 hover:scale-[1.01]'
                  : activeMode === 'receive'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 hover:scale-[1.01]'
                  : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/50 hover:scale-[1.01]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  Processing Transaction...
                </>
              ) : activeMode === 'send' ? (
                <>
                  <span>📤 Dispatch Transfer ({totalUnits} units)</span>
                </>
              ) : activeMode === 'receive' ? (
                <>
                  <span>📥 Receive Inbound ({totalUnits} units)</span>
                </>
              ) : (
                <>
                  <span>📥 Add {totalUnits} Units to Inventory</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Table Body */}
        {batchItems.length === 0 ? (
          <div className="py-14 text-center text-slate-500">
            <div className="text-3xl mb-2">⚡📦</div>
            <p className="text-sm font-semibold text-slate-300">Scanning queue is currently empty</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Scan product barcodes with your USB gun scanner, mobile camera, or type into the search bar above. Scanned items persist across refresh!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700/80">
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5 w-40">Part / SKU</th>
                  <th className="p-2.5">Product Name</th>
                  <th className="p-2.5 w-32">Status / Stock</th>
                  <th className="p-2.5 w-32">Category</th>
                  <th className="p-2.5 w-24 text-center">Price ($)</th>
                  <th className="p-2.5 w-40 text-center">Quantity</th>
                  <th className="p-2.5 w-28">Bin Rack</th>
                  <th className="p-2.5 w-14 text-center">Void</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {batchItems.map((item, idx) => {
                  const isHighlighted = activeHighlightId === item.id;
                  const isOverStock = activeMode === 'send' && item.quantity > (item.existing_stock || 0);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-amber-950/60 border-l-4 border-l-amber-400'
                          : isOverStock
                          ? 'bg-red-950/40 border-l-4 border-l-red-500'
                          : idx % 2 === 0
                          ? 'bg-slate-900/60 hover:bg-slate-800/40'
                          : 'bg-slate-900/20 hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Index */}
                      <td className="p-2.5 text-center text-slate-500 font-mono">
                        {idx + 1}
                      </td>

                      {/* Part Number / Barcode */}
                      <td className="p-2.5">
                        <div className="font-mono font-bold text-amber-300">
                          {item.part_number}
                        </div>
                        {item.barcode !== item.part_number && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Scan: {item.barcode}
                          </div>
                        )}
                      </td>

                      {/* Product Name (Editable) */}
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          placeholder="Product Name"
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </td>

                      {/* Status / Stock Context */}
                      <td className="p-2.5">
                        {activeMode === 'send' ? (
                          <div>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              isOverStock
                                ? 'bg-red-950/80 text-red-300 border-red-700 animate-pulse'
                                : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                            }`}>
                              {isOverStock
                                ? `⚠️ Over Stock (${item.existing_stock || 0} avail)`
                                : `📦 Avail: ${item.existing_stock || 0}`}
                            </span>
                          </div>
                        ) : item.is_new_sku ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-900/50 text-purple-300 border border-purple-700/60">
                            ✨ New SKU
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">
                            ✅ In Catalog ({item.existing_stock || 0} in stock)
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-2.5">
                        <select
                          value={item.category_id || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'category_id', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-white focus:outline-none"
                        >
                          <option value="">Uncategorized</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Price */}
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)}
                          className="w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-center text-xs text-white font-mono focus:outline-none"
                        />
                      </td>

                      {/* Quantity Stepper & Quick Multipliers */}
                      <td className="p-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(item.id, -1)}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-10 bg-slate-800 border border-slate-700 rounded px-1 py-1 text-center font-bold text-white font-mono focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(item.id, 1)}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 font-bold"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMultiplyQuantity(item.id, 5)}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-400 font-mono ml-0.5"
                            title="Add +5 units"
                          >
                            +5
                          </button>
                        </div>
                      </td>

                      {/* Bin Rack */}
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.bin_number || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'bin_number', e.target.value.toUpperCase())}
                          placeholder={defaultBin || 'Bin'}
                          className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white uppercase font-mono focus:outline-none"
                        />
                      </td>

                      {/* Delete */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                          title="Void row"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Metrics */}
        {batchItems.length > 0 && (
          <div className="bg-slate-800/80 px-4 py-3 border-t border-slate-700 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3">
            <div className="flex items-center gap-4">
              <span>Total Units: <strong className="text-white font-mono">{totalUnits}</strong></span>
              <span>Unique SKUs: <strong className="text-white font-mono">{uniqueSkus}</strong></span>
              <span>Estimated Value: <strong className="text-amber-400 font-mono">${totalBatchValue.toFixed(2)}</strong></span>
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCommitBatch}
              className={`font-bold px-4 py-1.5 rounded-lg shadow transition-colors text-white ${
                activeMode === 'send'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : activeMode === 'receive'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-purple-600 hover:bg-purple-500'
              }`}
            >
              Commit All ({totalUnits} units) →
            </button>
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {showSummaryModal && summaryData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-white">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-3 text-2xl">
              ✓
            </div>
            <h3 className="text-lg font-bold text-center mb-1">
              {summaryData.mode === 'send' ? 'Batch Transfer Dispatched!' : summaryData.mode === 'receive' ? 'Inbound Stock Received!' : 'Bulk Intake Successful!'}
            </h3>
            <p className="text-xs text-slate-400 text-center mb-4">
              {summaryData.mode === 'send'
                ? `Dispatched from ${summaryData.sourceWarehouseName} to ${summaryData.destWarehouseName}`
                : `Processed at ${summaryData.sourceWarehouseName}`}
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-slate-800/90 border border-slate-700 rounded-lg p-2.5 text-center">
                <div className="text-xl font-bold text-white font-mono">{summaryData.totalUnits}</div>
                <div className="text-[10px] text-slate-400 uppercase mt-0.5">Total Units</div>
              </div>
              <div className="bg-slate-800/90 border border-slate-700 rounded-lg p-2.5 text-center">
                <div className="text-xl font-bold text-emerald-400 font-mono">{summaryData.processedCount}</div>
                <div className="text-[10px] text-slate-400 uppercase mt-0.5">Unique SKUs</div>
              </div>
              <div className="bg-slate-800/90 border border-slate-700 rounded-lg p-2.5 text-center">
                <div className="text-xl font-bold text-purple-400 font-mono">{summaryData.createdCount || 0}</div>
                <div className="text-[10px] text-slate-400 uppercase mt-0.5">New Catalog SKUs</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSummaryModal(false)}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-lg text-xs transition-colors"
            >
              Scan Next Batch
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkScanIntake;
