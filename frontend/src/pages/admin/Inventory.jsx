import { useState, useEffect } from 'react';
import { barcodeAPI, warehouseAPI, binAPI, movementsAPI, binContentsAPI } from '../../api/inventory';
import { useAuth } from '../../context/AuthContext';
import BarcodeScanner from '../../components/inventory/BarcodeScanner';
import BarcodeGenerator from '../../components/inventory/BarcodeGenerator';
import FloatingNotification from '../../components/ui/FloatingNotification';

/**
 * Inventory Management Page
 * Main admin page for barcode scanning, warehouse management, and inventory tracking
 */
const Inventory = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'superadmin';
    const adminWarehouseId = user?.warehouse_id;
    const [activeTab, setActiveTab] = useState('scan-send');
    const [warehouses, setWarehouses] = useState([]);
    const [bins, setBins] = useState([]);
    const [movements, setMovements] = useState([]);
    const [scannedProduct, setScannedProduct] = useState(null);
    const [notFoundBarcode, setNotFoundBarcode] = useState(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [transferAction, setTransferAction] = useState('send'); // 'send' or 'receive'
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [newBin, setNewBin] = useState({ bin_number: '', description: '', capacity: 100 });

    // Effective warehouse: superadmin operates on selectedWarehouse (or first warehouse), admin operates on assigned warehouse
    const effectiveWarehouseId = isSuperAdmin
        ? (selectedWarehouse ? String(selectedWarehouse) : (warehouses[0]?.id ? String(warehouses[0]?.id) : null))
        : (adminWarehouseId ? String(adminWarehouseId) : null);

    const activeWarehouseObj = warehouses.find(w => String(w.id) === String(effectiveWarehouseId));

    // Warehouse CRUD state
    const [showWarehouseForm, setShowWarehouseForm] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [warehouseForm, setWarehouseForm] = useState({
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        notes: '',
        status: 'active',
        latitude: '',
        longitude: '',
        assigned_admin_id: ''
    });
    const [adminUsers, setAdminUsers] = useState([]);
    const [adminBins, setAdminBins] = useState([]);
    const [selectedBin, setSelectedBin] = useState('');
    const [sendQuantity, setSendQuantity] = useState(1); // Quantity for sending products
    const [pendingMovement, setPendingMovement] = useState(null); // Matched movement for receive
    const [showUnexpectedConfirm, setShowUnexpectedConfirm] = useState(false); // Confirm unexpected receive
    const [receiveQuantity, setReceiveQuantity] = useState(1); // Quantity for unexpected receive

    // Bin Inventory View State
    const [binInventory, setBinInventory] = useState([]);
    const [binInventorySearch, setBinInventorySearch] = useState('');
    const [selectedBinRows, setSelectedBinRows] = useState([]);
    const [binInventoryWarehouse, setBinInventoryWarehouse] = useState('');
    const [binInventoryLoading, setBinInventoryLoading] = useState(false);
    const [inventoryViewMode, setInventoryViewMode] = useState('bin'); // 'bin' or 'product'
    const [selectedBinOverlay, setSelectedBinOverlay] = useState(null); // For bin parts overlay
    const [binProducts, setBinProducts] = useState([]); // Products in selected bin
    const [productInventory, setProductInventory] = useState([]); // Products view data
    const [productInventoryLoading, setProductInventoryLoading] = useState(false);
    const [binManagementSearch, setBinManagementSearch] = useState(''); // Search in bin management
    const [showShiftModal, setShowShiftModal] = useState(false); // Shift product modal
    const [shiftData, setShiftData] = useState({ product: null, fromBin: '', toBin: '', quantity: 1 });
    const [showEditBinModal, setShowEditBinModal] = useState(false); // Edit bin modal
    const [editBinData, setEditBinData] = useState({ id: null, bin_number: '', description: '' });
    const [binScannerActive, setBinScannerActive] = useState(false); // Scanner mode for bin search
    // Movements filters
    const [movementsSearch, setMovementsSearch] = useState('');
    const [movementsSourceFilter, setMovementsSourceFilter] = useState('');
    const [movementsDestFilter, setMovementsDestFilter] = useState('');
    const [movementsDateFilter, setMovementsDateFilter] = useState('');

    // Geolocation state
    const [userLocation, setUserLocation] = useState(null);
    const [nearestWarehouse, setNearestWarehouse] = useState(null);
    const [locationError, setLocationError] = useState(null);

    // Calculate distance between two coordinates using Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    // Find nearest warehouse based on user location
    const findNearestWarehouse = (location, warehouseList) => {
        if (!location || !warehouseList || warehouseList.length === 0) return null;

        let nearest = null;
        let minDistance = Infinity;

        warehouseList.forEach(w => {
            if (w.latitude && w.longitude) {
                const distance = calculateDistance(
                    location.latitude, location.longitude,
                    parseFloat(w.latitude), parseFloat(w.longitude)
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = { ...w, distance: Math.round(distance) };
                }
            }
        });

        return nearest;
    };

    // Get user's current location
    const detectUserLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                setUserLocation(location);
                setLocationError(null);

                // Find and set nearest warehouse
                const nearest = findNearestWarehouse(location, warehouses);
                if (nearest) {
                    setNearestWarehouse(nearest);
                    setSelectedWarehouse(String(nearest.id));
                    setMessage({
                        type: 'success',
                        text: `📍 Detected nearest warehouse: ${nearest.name} (${nearest.distance} km away)`
                    });
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                setLocationError('Unable to get your location. Please select warehouse manually.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Fetch initial data
    useEffect(() => {
        fetchWarehouses();
        fetchMovements();
        fetchAdminUsers();
    }, []);

    // Refresh bins when effectiveWarehouseId changes
    useEffect(() => {
        if (effectiveWarehouseId) {
            fetchBins(effectiveWarehouseId);
        }
    }, [effectiveWarehouseId]);

    // Fetch bins for operating warehouse (for receive mode assignment)
    useEffect(() => {
        const fetchAdminBins = async () => {
            if (effectiveWarehouseId) {
                try {
                    const data = await binAPI.getAll(effectiveWarehouseId);
                    setAdminBins(data.bins || []);
                } catch (error) {
                    console.error('Error fetching admin bins:', error);
                }
            } else {
                setAdminBins([]);
            }
        };
        fetchAdminBins();
    }, [effectiveWarehouseId]);

    // Auto-load inventory when warehouse-inventory tab is active
    useEffect(() => {
        if (activeTab === 'warehouse-inventory' && effectiveWarehouseId) {
            fetchBinInventory(effectiveWarehouseId, binInventorySearch);
            fetchProductInventory(effectiveWarehouseId, binInventorySearch);
        }
    }, [activeTab, effectiveWarehouseId]);

    // Auto-load bins when bin-management tab is active
    useEffect(() => {
        if (activeTab === 'bin-management' && effectiveWarehouseId) {
            fetchBins(effectiveWarehouseId);
        }
    }, [activeTab, effectiveWarehouseId]);

    const fetchWarehouses = async () => {
        try {
            const data = await warehouseAPI.getAll();
            const whList = data.warehouses || [];
            setWarehouses(whList);
            if (whList.length > 0 && !selectedWarehouse) {
                const defaultWh = (adminWarehouseId && whList.find(w => String(w.id) === String(adminWarehouseId)))
                    ? String(adminWarehouseId)
                    : String(whList[0].id);
                setSelectedWarehouse(defaultWh);
            }
        } catch (error) {
            console.error('Error fetching warehouses:', error);
        }
    };

    // Fetch admin users for warehouse assignment
    const fetchAdminUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/users?role=admin', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAdminUsers(data.users || []);
            }
        } catch (error) {
            console.error('Error fetching admin users:', error);
        }
    };

    const fetchBins = async (warehouseId) => {
        if (!warehouseId) return;
        try {
            const data = await binAPI.getAll(warehouseId);
            setBins(data.bins || []);
        } catch (error) {
            console.error('Error fetching bins:', error);
        }
    };

    const fetchMovements = async () => {
        try {
            const params = { status: 'in_transit' };
            if (!isSuperAdmin && effectiveWarehouseId) {
                params.warehouse_id = effectiveWarehouseId;
            }
            const data = await movementsAPI.getAll(params);
            setMovements(data.movements || []);
        } catch (error) {
            console.error('Error fetching movements:', error);
        }
    };

    // Fetch bin inventory for a warehouse
    const fetchBinInventory = async (warehouseId, search = '') => {
        if (!warehouseId) {
            setBinInventory([]);
            return;
        }
        setBinInventoryLoading(true);
        try {
            const data = await binContentsAPI.getByWarehouse(warehouseId, search);
            setBinInventory(data.bins || []);
            setSelectedBinRows([]); // Reset selection on new fetch
        } catch (error) {
            console.error('Error fetching bin inventory:', error);
            setBinInventory([]);
        }
        setBinInventoryLoading(false);
    };

    // Fetch products by warehouse for product view mode
    const fetchProductInventory = async (warehouseId, search = '') => {
        if (!warehouseId) {
            setProductInventory([]);
            return;
        }
        setProductInventoryLoading(true);
        try {
            const productsModule = await import('../../api/products');
            const result = await productsModule.getProducts({
                warehouse_id: warehouseId,
                search: search,
                limit: 500
            });
            setProductInventory(result.products || result || []);
        } catch (error) {
            console.error('Error fetching product inventory:', error);
            setProductInventory([]);
        }
        setProductInventoryLoading(false);
    };

    // Export bin inventory to CSV/Excel
    const exportToExcel = () => {
        const selected = selectedBinRows.length > 0
            ? binInventory.filter((_, i) => selectedBinRows.includes(i))
            : binInventory;

        if (selected.length === 0) {
            setMessage({ type: 'error', text: 'No bins to export' });
            return;
        }

        const warehouseName = warehouses.find(w => String(w.id) === binInventoryWarehouse)?.name || 'Warehouse';
        const now = new Date().toLocaleString();

        let csv = `Bin Inventory Report\n${warehouseName}\nGenerated: ${now}\n\n`;
        csv += 'Bin Number,Part Numbers,Product Names,Unique Products,Total Quantity\n';

        selected.forEach(bin => {
            csv += `"${bin.bin_number}","${bin.part_numbers || ''}","${bin.product_names || ''}",${bin.unique_products},${bin.total_quantity}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bin-inventory-${warehouseName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: `Exported ${selected.length} bins to Excel/CSV` });
    };

    // Export bin inventory to PDF
    const exportToPDF = () => {
        const selected = selectedBinRows.length > 0
            ? binInventory.filter((_, i) => selectedBinRows.includes(i))
            : binInventory;

        if (selected.length === 0) {
            setMessage({ type: 'error', text: 'No bins to export' });
            return;
        }

        const warehouseName = warehouses.find(w => String(w.id) === binInventoryWarehouse)?.name || 'Warehouse';
        const now = new Date().toLocaleString();

        // Create printable HTML for PDF
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bin Inventory - ${warehouseName}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #8B2332; border-bottom: 2px solid #B8860B; padding-bottom: 10px; }
                    h2 { color: #666; font-size: 14px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #8B2332; color: white; padding: 10px; text-align: left; }
                    td { padding: 8px; border-bottom: 1px solid #ddd; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .footer { margin-top: 30px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <h1>📦 Bin Inventory Report</h1>
                <h2>Warehouse: ${warehouseName}</h2>
                <h2>Generated: ${now}</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Bin Number</th>
                            <th>Part Numbers</th>
                            <th>Unique Products</th>
                            <th>Total Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${selected.map(bin => `
                            <tr>
                                <td><strong>${bin.bin_number}</strong></td>
                                <td>${bin.part_numbers || '-'}</td>
                                <td>${bin.unique_products}</td>
                                <td>${bin.total_quantity}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    <p>Total Bins: ${selected.length}</p>
                    <p>Sardaarji Autoparts - Inventory Management System</p>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        setMessage({ type: 'success', text: `Exported ${selected.length} bins to PDF` });
    };

    const handleScan = async (barcode, product = null) => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        setNotFoundBarcode(null); // Reset not found state

        try {
            // If product is already provided by scanner, use it directly
            if (product) {
                // For SEND mode, verify product is in operating warehouse
                if (activeTab === 'scan-send' && effectiveWarehouseId && String(product.warehouse_id) !== String(effectiveWarehouseId)) {
                    setScannedProduct(null);
                    setMessage({ type: 'warning', text: `Cannot send: Product is in ${product.warehouse_name || 'another warehouse'}, not your active warehouse.` });
                } else if (activeTab === 'scan-receive') {
                    // RECEIVE MODE: Show product details, let user select bin then click Receive
                    setScannedProduct(product);
                    setPendingMovement(null);
                    setShowUnexpectedConfirm(true);
                    setReceiveQuantity(1);
                    setMessage({
                        type: 'info',
                        text: `📦 Found: ${product.name} (Qty: ${product.quantity}). Select a bin and click RECEIVE.`
                    });
                    console.log('📥 RECEIVE MODE: Product found, waiting for bin selection and receive click');
                } else {
                    // SEND mode - product is in operating warehouse
                    setScannedProduct(product);
                    setSendQuantity(1);
                    setMessage({ type: 'success', text: `Found: ${product.name} (Qty: ${product.quantity})` });
                }
            } else {
                // Search for product by barcode/part_number - search GLOBALLY first
                const productsModule = await import('../../api/products');

                // Search without warehouse filter so we can find the product regardless of location
                const searchParams = { search: barcode, limit: 50 };
                console.log('🔍 SEARCH DEBUG:', { effectiveWarehouseId, searchParams, userWarehouseId: user?.warehouse_id });
                const result = await productsModule.getProducts(searchParams);
                const products = result.products || result;
                console.log('🔍 SEARCH RESULTS:', products?.length, 'products found');

                // Find matching products by barcode/part number
                let matchingProducts = products?.filter(p =>
                    p.part_number === barcode || p.barcode === barcode ||
                    p.part_number?.toLowerCase().includes(barcode.toLowerCase()) ||
                    p.name?.toLowerCase().includes(barcode.toLowerCase())
                ) || [];

                // Sort so that the product in the operating warehouse is FIRST
                if (matchingProducts.length > 1 && effectiveWarehouseId) {
                    matchingProducts.sort((a, b) => {
                        if (String(a.warehouse_id) === String(effectiveWarehouseId)) return -1;
                        if (String(b.warehouse_id) === String(effectiveWarehouseId)) return 1;
                        return 0;
                    });
                }

                if (matchingProducts.length === 0 && products?.length > 0) {
                    // If no exact match, use first result
                    matchingProducts = [products[0]];
                }

                if (matchingProducts.length > 0) {
                    if (activeTab === 'scan-send') {
                        // SEND MODE: Find product specifically in operating warehouse
                        const productInMyWarehouse = matchingProducts.find(p =>
                            String(p.warehouse_id) === String(effectiveWarehouseId)
                        );

                        if (productInMyWarehouse) {
                            setScannedProduct(productInMyWarehouse);
                            setSendQuantity(1);
                            setMessage({ type: 'success', text: `Found: ${productInMyWarehouse.name} (Qty: ${productInMyWarehouse.quantity} in active warehouse)` });
                        } else {
                            // Product exists but not in operating warehouse
                            const otherLocations = matchingProducts.map(p => p.warehouse_name || `Warehouse ${p.warehouse_id}`).join(', ');
                            setScannedProduct(null);
                            setMessage({ type: 'warning', text: `Product not in active warehouse (${activeWarehouseObj?.name || 'Selected'}). Found in: ${otherLocations}. Switch to RECEIVE mode or change operating warehouse.` });
                        }
                    } else {
                        // RECEIVE MODE: Check pending movements FIRST, then look for products

                        // Search for pending movement by barcode/part_number destined to operating warehouse
                        const matchedMovement = movements.find(m =>
                            (m.part_number === barcode || m.barcode === barcode ||
                                m.part_number?.toLowerCase().includes(barcode.toLowerCase()) ||
                                m.barcode?.toLowerCase().includes(barcode.toLowerCase())) &&
                            String(m.to_warehouse_id) === String(effectiveWarehouseId) &&
                            m.status === 'in_transit'
                        );

                        if (matchedMovement) {
                            // EXPECTED SHIPMENT FOUND - even if product doesn't exist in receiving warehouse
                            setPendingMovement(matchedMovement);
                            setReceiveQuantity(matchedMovement.quantity || 1);
                            setScannedProduct({
                                id: matchedMovement.product_id,
                                name: matchedMovement.product_name || barcode,
                                part_number: matchedMovement.part_number,
                                barcode: matchedMovement.barcode,
                                quantity: matchedMovement.quantity
                            });
                            setShowUnexpectedConfirm(false);
                            setNotFoundBarcode(null);
                            setMessage({
                                type: 'success',
                                text: `✅ EXPECTED: ${matchedMovement.product_name || barcode} (${matchedMovement.quantity} units from ${matchedMovement.from_warehouse_name}). Click RECEIVE.`
                            });
                        } else if (matchingProducts.length > 0) {
                            // Product exists but no pending movement - show product, wait for receive click
                            const foundProduct = matchingProducts[0];
                            setScannedProduct(foundProduct);
                            setPendingMovement(null);
                            setShowUnexpectedConfirm(true);
                            setReceiveQuantity(1);
                            setMessage({
                                type: 'info',
                                text: `📦 Found: ${foundProduct.name} (Qty: ${foundProduct.quantity}). Select a bin and click RECEIVE.`
                            });
                            console.log('📥 RECEIVE MODE: Product found via search, waiting for bin selection and receive click');
                        } else {
                            // No product found AND no pending movement
                            setNotFoundBarcode(barcode);
                            setScannedProduct(null);
                            setPendingMovement(null);
                            setShowUnexpectedConfirm(true);
                            setMessage({ type: 'warning', text: `⚠️ No pending shipment or product found for: ${barcode}. Confirm to add as new.` });
                        }
                    }
                } else {
                    // No product found at all - still check pending movements for RECEIVE mode
                    if (activeTab === 'scan-receive') {
                        const matchedMovement = movements.find(m =>
                            (m.part_number === barcode || m.barcode === barcode ||
                                m.part_number?.toLowerCase().includes(barcode.toLowerCase()) ||
                                m.barcode?.toLowerCase().includes(barcode.toLowerCase())) &&
                            String(m.to_warehouse_id) === String(effectiveWarehouseId) &&
                            m.status === 'in_transit'
                        );

                        if (matchedMovement) {
                            // EXPECTED SHIPMENT FOUND
                            setPendingMovement(matchedMovement);
                            setReceiveQuantity(matchedMovement.quantity || 1);
                            setScannedProduct({
                                id: matchedMovement.product_id,
                                name: matchedMovement.product_name || barcode,
                                part_number: matchedMovement.part_number,
                                barcode: matchedMovement.barcode,
                                quantity: matchedMovement.quantity
                            });
                            setShowUnexpectedConfirm(false);
                            setNotFoundBarcode(null);
                            setMessage({
                                type: 'success',
                                text: `✅ EXPECTED: ${matchedMovement.product_name || barcode} (${matchedMovement.quantity} units from ${matchedMovement.from_warehouse_name}). Click RECEIVE.`
                            });
                        } else {
                            // No product and no pending movement - show add as new
                            setNotFoundBarcode(barcode);
                            setScannedProduct(null);
                            setPendingMovement(null);
                            setShowUnexpectedConfirm(true);
                            setMessage({ type: 'warning', text: `⚠️ No pending shipment for: ${barcode}. Confirm to add as new product.` });
                        }
                    } else {
                        // SEND mode - product not found
                        setNotFoundBarcode(barcode);
                        setScannedProduct(null);
                        setMessage({ type: 'warning', text: `Product not found for barcode: ${barcode}` });
                    }
                }
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error scanning barcode' });
            console.error('Scan error:', error);
        }

        setLoading(false);
    };

    const handleReceive = async (binNumber) => {
        if (!scannedProduct?.barcode) return;

        setLoading(true);
        try {
            const result = await movementsAPI.receive({
                barcode: scannedProduct.barcode,
                binNumber: binNumber,
                warehouseId: effectiveWarehouseId
            });

            setMessage({ type: 'success', text: result.message });
            setScannedProduct(null);
            fetchMovements();
        } catch (error) {
            setMessage({ type: 'error', text: 'Error receiving product' });
        }
        setLoading(false);
    };

    const handleCreateBin = async (e) => {
        e.preventDefault();
        const warehouseToUse = effectiveWarehouseId || selectedWarehouse;
        if (!warehouseToUse || !newBin.bin_number) {
            setMessage({ type: 'error', text: 'Warehouse not assigned or bin number missing' });
            return;
        }

        setLoading(true);
        try {
            const result = await binAPI.create({
                warehouse_id: warehouseToUse,
                ...newBin
            });

            if (result.bin) {
                setMessage({ type: 'success', text: `Bin "${result.bin.bin_number}" created successfully` });
                setNewBin({ bin_number: '', description: '', capacity: 100 });
                await fetchBins(warehouseToUse);
            } else {
                setMessage({ type: 'error', text: result.message || 'Failed to create bin' });
            }
        } catch (error) {
            console.error('Error creating bin:', error);
            setMessage({ type: 'error', text: 'Error creating bin: ' + (error.message || 'Unknown error') });
        }
        setLoading(false);
    };

    // Handle clicking on a bin to view its products
    const handleBinClick = async (bin) => {
        setSelectedBinOverlay(bin);
        setBinProducts([]);
        try {
            const productsModule = await import('../../api/products');
            const result = await productsModule.getProducts({
                warehouse_id: effectiveWarehouseId,
                bin_number: bin.bin_number,
                limit: 100
            });
            setBinProducts(result.products || result || []);
        } catch (error) {
            console.error('Error fetching bin products:', error);
            setBinProducts([]);
        }
    };

    // Open edit bin modal
    const handleEditBin = (bin) => {
        setEditBinData({
            id: bin.id,
            bin_number: bin.bin_number,
            description: bin.description || ''
        });
        setShowEditBinModal(true);
    };

    // Update bin (rename)
    const handleUpdateBin = async () => {
        if (!editBinData.id || !editBinData.bin_number) return;
        setLoading(true);
        try {
            const result = await binAPI.update(editBinData.id, {
                bin_number: editBinData.bin_number,
                description: editBinData.description
            });
            if (result.bin) {
                setMessage({ type: 'success', text: `Bin renamed to "${result.bin.bin_number}"` });
                setShowEditBinModal(false);
                if (effectiveWarehouseId) await fetchBins(effectiveWarehouseId);
            } else {
                setMessage({ type: 'error', text: result.message || 'Failed to update bin' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error updating bin: ' + error.message });
        }
        setLoading(false);
    };

    // Delete bin
    const handleDeleteBin = async (binId) => {
        if (!window.confirm('Are you sure you want to delete this bin?')) return;
        setLoading(true);
        try {
            const result = await binAPI.delete(binId);
            setMessage({ type: 'success', text: 'Bin deleted successfully' });
            setShowEditBinModal(false);
            setSelectedBinOverlay(null);
            if (effectiveWarehouseId) await fetchBins(effectiveWarehouseId);
        } catch (error) {
            setMessage({ type: 'error', text: 'Error deleting bin: ' + error.message });
        }
        setLoading(false);
    };

    // Open shift modal for a product
    const handleOpenShiftModal = (product, fromBin) => {
        setShiftData({
            product: product,
            fromBin: fromBin,
            toBin: '',
            quantity: 1
        });
        setShowShiftModal(true);
    };

    // Shift product to another bin
    const handleShiftProduct = async () => {
        if (!shiftData.product || !shiftData.toBin || shiftData.quantity < 1) {
            setMessage({ type: 'error', text: 'Please select target bin and quantity' });
            return;
        }
        setLoading(true);
        try {
            const productsModule = await import('../../api/products');
            const result = await productsModule.updateProduct({
                id: shiftData.product.id,
                bin_number: shiftData.toBin
            });
            if (result.product || result.id || result.name) {
                setMessage({ type: 'success', text: `Moved ${shiftData.quantity} items to bin ${shiftData.toBin}` });
                setShowShiftModal(false);
                if (selectedBinOverlay) {
                    handleBinClick(selectedBinOverlay);
                }
                if (effectiveWarehouseId) await fetchBins(effectiveWarehouseId);
            } else {
                setMessage({ type: 'error', text: result.message || 'Failed to shift product' });
            }
        } catch (error) {
            console.error('Shift error:', error);
            setMessage({ type: 'error', text: 'Error shifting product: ' + (error.message || 'Unknown error') });
        }
        setLoading(false);
    };

    // Handle barcode scan for bin search
    const handleBinScanResult = (barcode) => {
        setBinManagementSearch(barcode);
        setBinScannerActive(false);
    };

    // Warehouse CRUD handlers
    const resetWarehouseForm = () => {
        setWarehouseForm({
            name: '',
            code: '',
            address: '',
            city: '',
            state: '',
            zip: '',
            phone: '',
            notes: '',
            status: 'active'
        });
        setEditingWarehouse(null);
        setShowWarehouseForm(false);
    };

    const handleEditWarehouse = (warehouse) => {
        setEditingWarehouse(warehouse);
        setWarehouseForm({
            name: warehouse.name || '',
            code: warehouse.code || '',
            address: warehouse.address || '',
            city: warehouse.city || '',
            state: warehouse.state || '',
            zip: warehouse.zip || '',
            phone: warehouse.phone || '',
            notes: warehouse.notes || '',
            status: warehouse.status || 'active',
            latitude: warehouse.latitude || '',
            longitude: warehouse.longitude || '',
            assigned_admin_id: warehouse.admin_id ? String(warehouse.admin_id) : ''
        });
        setShowWarehouseForm(true);
    };

    const handleSaveWarehouse = async (e) => {
        e.preventDefault();
        if (!warehouseForm.name || !warehouseForm.code) {
            setMessage({ type: 'error', text: 'Name and Code are required' });
            return;
        }

        setLoading(true);
        try {
            if (editingWarehouse) {
                await warehouseAPI.update({ id: editingWarehouse.id, ...warehouseForm });
                setMessage({ type: 'success', text: 'Warehouse updated successfully' });
            } else {
                await warehouseAPI.create(warehouseForm);
                setMessage({ type: 'success', text: 'Warehouse created successfully' });
            }
            resetWarehouseForm();
            fetchWarehouses();
        } catch (error) {
            setMessage({ type: 'error', text: `Error ${editingWarehouse ? 'updating' : 'creating'} warehouse` });
        }
        setLoading(false);
    };

    const handleDeleteWarehouse = async (warehouse) => {
        if (!confirm(`Are you sure you want to delete warehouse "${warehouse.name}"?`)) return;

        setLoading(true);
        try {
            await warehouseAPI.delete(warehouse.id);
            setMessage({ type: 'success', text: 'Warehouse deleted successfully' });
            fetchWarehouses();
        } catch (error) {
            setMessage({ type: 'error', text: 'Error deleting warehouse' });
        }
        setLoading(false);
    };

    const tabs = [
        { id: 'scan-send', label: '📤 Scan & Send', icon: '📤' },
        { id: 'scan-receive', label: '📥 Scan & Receive', icon: '📥' },
        { id: 'movements', label: '🚚 Movements', icon: '🚚' },
        { id: 'warehouse-inventory', label: '📦 Warehouse Inventory', icon: '📦' },
        { id: 'bin-management', label: '🗄️ Bin Management', icon: '🗄️' },
        ...(user?.role === 'superadmin' ? [{ id: 'warehouses', label: '🏭 Warehouses', icon: '🏭' }] : []),
    ];

    return (
        <div className="inventory-page" style={{ padding: '16px', maxWidth: '1300px', margin: '0 auto', color: '#f8fafc' }}>
            {/* Header Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <h1 style={{ margin: 0, fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 'bold', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>📦 Inventory Management</span>
                </h1>
                {isSuperAdmin && (
                    <span style={{ padding: '5px 12px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '8px', color: '#fbbf24', fontSize: '12px', fontWeight: 'bold' }}>
                        ⚡ Superadmin Central Control
                    </span>
                )}
            </div>

            {/* Floating Notification (Mobile-Friendly) */}
            <FloatingNotification
                message={message.text}
                type={message.type}
                onDismiss={() => setMessage({ type: '', text: '' })}
            />

            {/* Superadmin Operating Warehouse Switcher Banner */}
            {isSuperAdmin ? (
                <div style={{
                    marginBottom: '20px',
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
                    borderRadius: '12px',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '15px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            color: '#fbbf24',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <span>⚡ OPERATING AS:</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                                value={effectiveWarehouseId || ''}
                                onChange={(e) => {
                                    setSelectedWarehouse(e.target.value);
                                    if (activeTab === 'warehouse-inventory') {
                                        fetchBinInventory(e.target.value, binInventorySearch);
                                        fetchProductInventory(e.target.value, binInventorySearch);
                                    }
                                }}
                                style={{
                                    padding: '9px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid #f59e0b',
                                    background: '#0f172a',
                                    color: '#f8fafc',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                                }}
                            >
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>
                                        {w.country === 'CAN' ? '🇨🇦 ' : w.country === 'IND' ? '🇮🇳 ' : '🏢 '}
                                        {w.name} ({w.code || w.id})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Warehouse stats pills */}
                    {activeWarehouseObj && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ padding: '6px 12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', fontSize: '13px', color: '#34d399' }}>
                                <span style={{ color: '#94a3b8', marginRight: '6px' }}>Total Units:</span>
                                <strong>{activeWarehouseObj.total_units || 0}</strong>
                            </div>
                            <div style={{ padding: '6px 12px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '8px', fontSize: '13px', color: '#fbbf24' }}>
                                <span style={{ color: '#94a3b8', marginRight: '6px' }}>Unique Parts:</span>
                                <strong>{activeWarehouseObj.product_count || 0}</strong>
                            </div>
                            <div style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '8px', fontSize: '13px', color: '#60a5fa' }}>
                                <span style={{ color: '#94a3b8', marginRight: '6px' }}>Active Bins:</span>
                                <strong>{activeWarehouseObj.bin_count || 0}</strong>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Regular Admin Assigned Warehouse Banner */
                <div style={{
                    marginBottom: '20px',
                    padding: '12px 18px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    borderRadius: '10px',
                    border: '1px solid rgba(71, 85, 105, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '14px' }}>
                        <span>🏢 Assigned Warehouse:</span>
                        <strong style={{ color: '#f8fafc' }}>
                            {activeWarehouseObj?.name || 'Assigned Warehouse'}
                            {activeWarehouseObj?.code ? ` (${activeWarehouseObj.code})` : ''}
                        </strong>
                        {activeWarehouseObj?.city && (
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                                • 📍 {activeWarehouseObj.city}, {activeWarehouseObj.state || activeWarehouseObj.country}
                            </span>
                        )}
                    </div>
                    {activeWarehouseObj && (
                        <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                            <span style={{ color: '#34d399' }}>📦 Units: <strong>{activeWarehouseObj.total_units || 0}</strong></span>
                            <span style={{ color: '#fbbf24' }}>🔧 Parts: <strong>{activeWarehouseObj.product_count || 0}</strong></span>
                        </div>
                    )}
                </div>
            )}

            {/* Tab Navigation - Modern Industrial Segment Control */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '22px',
                background: 'rgba(15, 23, 42, 0.85)',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid rgba(51, 65, 85, 0.7)',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '10px 18px',
                                border: isActive ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid transparent',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: isActive ? '600' : '500',
                                background: isActive
                                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.15))'
                                    : 'transparent',
                                color: isActive ? '#fbbf24' : '#94a3b8',
                                transition: 'all 0.15s ease-in-out',
                                whiteSpace: 'nowrap',
                                flex: '0 0 auto',
                                boxShadow: isActive ? '0 2px 10px rgba(245, 158, 11, 0.2)' : 'none',
                                WebkitTapHighlightColor: 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {/* SCAN & SEND / SCAN & RECEIVE TAB */}
                {(activeTab === 'scan-send' || activeTab === 'scan-receive') && (
                    <div className={activeTab === 'scan-send' ? 'scan-send-tab' : 'scan-receive-tab'}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Scanner Section - Industrial Dark Frame */}
                            <div style={{
                                padding: '22px',
                                background: 'linear-gradient(145deg, #111827 0%, #0b0f17 100%)',
                                borderRadius: '14px',
                                border: activeTab === 'scan-send'
                                    ? '1px solid rgba(245, 158, 11, 0.4)'
                                    : '1px solid rgba(16, 185, 129, 0.4)',
                                boxShadow: activeTab === 'scan-send'
                                    ? '0 4px 25px rgba(245, 158, 11, 0.08)'
                                    : '0 4px 25px rgba(16, 185, 129, 0.08)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                                    <h3 style={{
                                        margin: 0,
                                        color: activeTab === 'scan-send' ? '#fbbf24' : '#34d399',
                                        fontSize: 'clamp(17px, 4vw, 21px)',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        {activeTab === 'scan-send' ? '📤 Scan Product to SEND' : '📥 Scan Product to RECEIVE'}
                                    </h3>
                                    <span style={{
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        background: activeTab === 'scan-send' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                        border: activeTab === 'scan-send' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                                        color: activeTab === 'scan-send' ? '#fcd34d' : '#6ee7b7'
                                    }}>
                                        {activeTab === 'scan-send'
                                            ? `SOURCE: ${activeWarehouseObj?.name || 'Active Warehouse'}`
                                            : `DESTINATION: ${activeWarehouseObj?.name || 'Active Warehouse'}`}
                                    </span>
                                </div>
                                <p style={{ marginBottom: '16px', color: '#94a3b8', fontSize: '13px' }}>
                                    {activeTab === 'scan-send'
                                        ? 'Scan a product located in the active warehouse to dispatch a transfer to another branch.'
                                        : 'Search or scan an incoming or stock product, select a destination bin, then confirm reception.'}
                                </p>
                                <BarcodeScanner
                                    warehouseId={effectiveWarehouseId}
                                    onScan={(barcode, product) => {
                                        setTransferAction(activeTab === 'scan-send' ? 'send' : 'receive');
                                        handleScan(barcode, product);
                                    }}
                                    autoStart={false}
                                />
                            </div>

                            {/* Scanned Product Details */}
                            <div style={{
                                padding: '22px',
                                background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                                borderRadius: '14px',
                                border: '1px solid rgba(51, 65, 85, 0.6)'
                            }}>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#cbd5e1', fontWeight: 'bold' }}>
                                    🔍 Scanned Product Identification
                                </h3>

                                {loading && <p style={{ color: '#fbbf24' }}>Loading identification details...</p>}

                                {scannedProduct ? (
                                    <div>
                                        <BarcodeGenerator
                                            barcode={scannedProduct.barcode}
                                            productName={scannedProduct.name}
                                            partNumber={scannedProduct.part_number}
                                            price={scannedProduct.price}
                                            labelSize="small"
                                        />

                                        <div style={{
                                            marginTop: '16px',
                                            padding: '16px',
                                            background: '#0b0f17',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(71, 85, 105, 0.4)',
                                            fontSize: '14px'
                                        }}>
                                            <p style={{ margin: '0 0 8px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>
                                                {scannedProduct.name}
                                            </p>
                                            <p style={{ margin: '0 0 8px 0', color: '#94a3b8' }}>
                                                <strong style={{ color: '#cbd5e1' }}>Part #:</strong>{' '}
                                                <span style={{ color: '#fbbf24', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                                    {scannedProduct.part_number || 'N/A'}
                                                </span>
                                            </p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                                                <p style={{ margin: 0, color: '#94a3b8' }}>
                                                    <strong style={{ color: '#cbd5e1' }}>Price:</strong> ${parseFloat(scannedProduct.price || 0).toFixed(2)}
                                                </p>
                                                <p style={{ margin: 0, color: '#94a3b8' }}>
                                                    <strong style={{ color: '#cbd5e1' }}>Available Stock:</strong>{' '}
                                                    <span style={{
                                                        color: scannedProduct.quantity > 0 ? '#34d399' : '#f87171',
                                                        fontWeight: 'bold',
                                                        fontSize: '16px',
                                                        padding: '2px 8px',
                                                        background: scannedProduct.quantity > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                        borderRadius: '6px'
                                                    }}>
                                                        {scannedProduct.quantity}
                                                    </span>
                                                </p>
                                            </div>
                                            <p style={{ margin: '0 0 6px 0', color: '#94a3b8' }}>
                                                <strong style={{ color: '#cbd5e1' }}>Current Location:</strong> {scannedProduct.warehouse_name || 'Not assigned'}
                                            </p>
                                            <p style={{ margin: 0, color: '#94a3b8' }}>
                                                <strong style={{ color: '#cbd5e1' }}>Current Bin:</strong> {scannedProduct.bin_number || 'Not assigned'}
                                            </p>
                                        </div>

                                        {/* Mode-specific Actions Section */}
                                        <div style={{
                                            marginTop: '20px',
                                            padding: '18px',
                                            background: activeTab === 'scan-send' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                                            borderRadius: '10px',
                                            border: activeTab === 'scan-send' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                                        }}>
                                            <h4 style={{ margin: '0 0 14px 0', color: activeTab === 'scan-send' ? '#fbbf24' : '#34d399', fontSize: '15px', fontWeight: 'bold' }}>
                                                {activeTab === 'scan-send' ? '📤 Dispatch Transfer to Branch' : '📥 Confirm Reception into Warehouse'}
                                            </h4>

                                            {/* Only show detect location for SEND mode */}
                                            {activeTab === 'scan-send' && (
                                                <div style={{ marginBottom: '16px' }}>
                                                    <button
                                                        onClick={detectUserLocation}
                                                        style={{
                                                            padding: '10px 16px',
                                                            backgroundColor: '#7c3aed',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            fontWeight: '600',
                                                            fontSize: '13px',
                                                            width: '100%',
                                                            marginBottom: '10px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '8px'
                                                        }}
                                                    >
                                                        <span>📍 Detect GPS Location & Find Nearest Warehouse</span>
                                                    </button>

                                                    {/* Show nearest warehouse info */}
                                                    {nearestWarehouse && (
                                                        <div style={{
                                                            padding: '10px 14px',
                                                            background: 'rgba(16, 185, 129, 0.15)',
                                                            borderRadius: '6px',
                                                            marginBottom: '10px',
                                                            border: '1px solid rgba(16, 185, 129, 0.3)'
                                                        }}>
                                                            <strong style={{ color: '#34d399' }}>✅ Nearest Warehouse: {nearestWarehouse.name}</strong>
                                                            <span style={{ marginLeft: '10px', color: '#94a3b8', fontSize: '13px' }}>
                                                                ({nearestWarehouse.distance} km away)
                                                            </span>
                                                        </div>
                                                    )}

                                                    {locationError && (
                                                        <div style={{
                                                            padding: '10px 14px',
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            borderRadius: '6px',
                                                            color: '#f87171',
                                                            fontSize: '13px',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)'
                                                        }}>
                                                            ⚠️ {locationError}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Warehouse Selection for SEND */}
                                            {activeTab === 'scan-send' ? (
                                                <div style={{ marginBottom: '18px' }}>
                                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#cbd5e1', fontSize: '13px' }}>
                                                        Destination Branch Warehouse:
                                                    </label>
                                                    <select
                                                        value={selectedWarehouse}
                                                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px 14px',
                                                            borderRadius: '8px',
                                                            border: '1px solid #475569',
                                                            background: '#0b0f17',
                                                            color: '#f8fafc',
                                                            fontSize: '14px',
                                                            outline: 'none'
                                                        }}
                                                    >
                                                        <option value="">-- Select Destination Warehouse --</option>
                                                        {warehouses
                                                            .filter(w => String(w.id) !== String(scannedProduct?.warehouse_id))
                                                            .map(w => (
                                                                <option key={w.id} value={w.id}>
                                                                    {w.country === 'CAN' ? '🇨🇦 ' : w.country === 'IND' ? '🇮🇳 ' : '🏢 '}
                                                                    {w.name} {w.location ? `(${w.location})` : ''}
                                                                    {nearestWarehouse && nearestWarehouse.id === w.id ? ' ⭐ NEAREST' : ''}
                                                                </option>
                                                            ))
                                                        }
                                                    </select>

                                                    {/* Remaining Stock Display */}
                                                    <div style={{
                                                        marginTop: '16px',
                                                        padding: '14px 18px',
                                                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(245, 158, 11, 0.3)'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                                            <div>
                                                                <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>📦 Stock at Origin:</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '22px' }}>
                                                                    {scannedProduct?.quantity || 0}
                                                                </span>
                                                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>units available</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
                                                            💡 1 unit will be deducted from source and dispatched in-transit to destination.
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* RECEIVE MODE: Warehouse info & Bin Selector */
                                                <div style={{
                                                    marginBottom: '18px',
                                                    padding: '14px 18px',
                                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(16, 185, 129, 0.3)'
                                                }}>
                                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#34d399', fontSize: '13px' }}>
                                                        🏢 Receiving Into Operating Warehouse:
                                                    </label>
                                                    {effectiveWarehouseId ? (
                                                        <p style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: '#f8fafc' }}>
                                                            {warehouses.find(w => String(w.id) === String(effectiveWarehouseId))?.name || 'Active Warehouse'}
                                                        </p>
                                                    ) : (
                                                        <p style={{ margin: 0, color: '#f87171' }}>
                                                            ⚠️ No warehouse selected or assigned. Please choose an operating warehouse above.
                                                        </p>
                                                    )}

                                                    {/* Bin Selector for Receive Mode */}
                                                    {effectiveWarehouseId && adminBins.length > 0 && (
                                                        <div style={{ marginTop: '14px' }}>
                                                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#cbd5e1', fontSize: '13px' }}>
                                                                📦 Destination Bin Rack (Optional):
                                                            </label>
                                                            <select
                                                                value={selectedBin}
                                                                onChange={(e) => setSelectedBin(e.target.value)}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '12px 14px',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid #10b981',
                                                                    backgroundColor: '#0b0f17',
                                                                    color: '#f8fafc',
                                                                    fontSize: '14px',
                                                                    outline: 'none'
                                                                }}
                                                            >
                                                                <option value="">-- Assign to Bin (Optional) --</option>
                                                                {adminBins.map(bin => (
                                                                    <option key={bin.id} value={bin.bin_number}>
                                                                        {bin.bin_number} {bin.description ? `(${bin.description})` : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                    {effectiveWarehouseId && adminBins.length === 0 && (
                                                        <p style={{ marginTop: '10px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                            No bins configured for this warehouse. Product will be received into warehouse stock.
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Action Execution Button */}
                                            <button
                                                onClick={async () => {
                                                    if (activeTab === 'scan-send' && !selectedWarehouse) {
                                                        setMessage({ type: 'error', text: 'Please select a destination warehouse' });
                                                        return;
                                                    }
                                                    if (activeTab === 'scan-receive' && !effectiveWarehouseId) {
                                                        setMessage({ type: 'error', text: 'No operating warehouse selected. Please choose a warehouse.' });
                                                        return;
                                                    }
                                                    setLoading(true);
                                                    try {
                                                        if (activeTab === 'scan-send') {
                                                            if (scannedProduct.quantity < 1) {
                                                                setMessage({ type: 'error', text: `Cannot send - no stock available (0 remaining).` });
                                                                setLoading(false);
                                                                return;
                                                            }
                                                            await movementsAPI.ship(
                                                                [scannedProduct.id],
                                                                scannedProduct.warehouse_id,
                                                                selectedWarehouse,
                                                                `Shipped 1 via barcode scan`,
                                                                1
                                                            );
                                                            const destWarehouse = warehouses.find(w => String(w.id) === String(selectedWarehouse));
                                                            setMessage({
                                                                type: 'success',
                                                                text: `✅ 1 unit shipped to ${destWarehouse?.name || 'destination'}! (${scannedProduct.quantity - 1} remaining)`
                                                            });
                                                            fetchMovements();
                                                            fetchWarehouses();
                                                            if (effectiveWarehouseId) fetchBins(effectiveWarehouseId);
                                                        } else {
                                                            const myWarehouse = warehouses.find(w => String(w.id) === String(effectiveWarehouseId));

                                                            if (pendingMovement) {
                                                                await movementsAPI.receive({
                                                                    movementId: pendingMovement.id,
                                                                    binNumber: selectedBin || null,
                                                                    warehouseId: effectiveWarehouseId
                                                                });
                                                                setMessage({
                                                                    type: 'success',
                                                                    text: `✅ Received ${receiveQuantity} unit(s) from ${pendingMovement.from_warehouse_name}${selectedBin ? ` → Bin: ${selectedBin}` : ''}!`
                                                                });
                                                                setPendingMovement(null);
                                                            } else {
                                                                await movementsAPI.addUnexpected({
                                                                    partNumber: scannedProduct.part_number,
                                                                    warehouseId: effectiveWarehouseId,
                                                                    binNumber: selectedBin || scannedProduct.bin_number || null,
                                                                    quantity: receiveQuantity
                                                                });
                                                                const newQty = (parseInt(scannedProduct.quantity) || 0) + receiveQuantity;
                                                                setMessage({
                                                                    type: 'success',
                                                                    text: `✅ Received ${receiveQuantity} unit(s) of ${scannedProduct.name} into ${myWarehouse?.name || 'warehouse'}${selectedBin ? ` → Bin: ${selectedBin}` : ''}! New total: ${newQty}`
                                                                });
                                                            }
                                                            setSelectedBin('');
                                                            setReceiveQuantity(1);
                                                            setShowUnexpectedConfirm(false);
                                                            fetchMovements();
                                                            fetchWarehouses();
                                                            if (effectiveWarehouseId) fetchBins(effectiveWarehouseId);
                                                        }
                                                        setScannedProduct(null);
                                                    } catch (err) {
                                                        console.error("Action error:", err);
                                                        setMessage({ type: 'error', text: `❌ Failed: ${err.message || 'Unknown error'}` });
                                                    }
                                                    setLoading(false);
                                                }}
                                                disabled={loading || (activeTab === 'scan-send' && !selectedWarehouse) || (activeTab === 'scan-receive' && !effectiveWarehouseId)}
                                                style={{
                                                    width: '100%',
                                                    padding: '16px',
                                                    background: activeTab === 'scan-send'
                                                        ? 'linear-gradient(135deg, #d97706, #b45309)'
                                                        : 'linear-gradient(135deg, #059669, #047857)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    cursor: loading || (activeTab === 'scan-send' && !selectedWarehouse) || (activeTab === 'scan-receive' && !effectiveWarehouseId) ? 'not-allowed' : 'pointer',
                                                    opacity: loading || (activeTab === 'scan-send' && !selectedWarehouse) || (activeTab === 'scan-receive' && !effectiveWarehouseId) ? 0.6 : 1,
                                                    fontWeight: 'bold',
                                                    fontSize: '17px',
                                                    letterSpacing: '0.5px',
                                                    boxShadow: activeTab === 'scan-send'
                                                        ? '0 4px 15px rgba(217, 119, 6, 0.4)'
                                                        : '0 4px 15px rgba(5, 150, 105, 0.4)',
                                                    transition: 'all 0.15s',
                                                    WebkitTapHighlightColor: 'transparent'
                                                }}
                                            >
                                                {loading ? '⏳ Processing Transaction...' : (
                                                    activeTab === 'scan-send' ? '📤 DISPATCH 1 UNIT TO DESTINATION' : '📥 RECEIVE 1 UNIT INTO WAREHOUSE'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : notFoundBarcode ? (
                                    /* Product Not Found - Dark Styled Options */
                                    <div style={{
                                        padding: '20px',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        border: '1px solid rgba(245, 158, 11, 0.4)',
                                        borderRadius: '10px'
                                    }}>
                                        <h4 style={{ color: '#fbbf24', margin: '0 0 12px 0', fontSize: '16px' }}>
                                            ⚠️ Product Not Found in Catalog
                                        </h4>
                                        <p style={{ margin: '0 0 12px 0', color: '#cbd5e1' }}>
                                            <strong>Scanned Barcode:</strong>
                                            <span style={{ fontFamily: 'monospace', marginLeft: '10px', padding: '4px 10px', background: '#0b0f17', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc' }}>
                                                {notFoundBarcode}
                                            </span>
                                        </p>
                                        <p style={{ color: '#94a3b8', margin: '0 0 16px 0', fontSize: '13px' }}>
                                            This barcode is not registered in the catalog yet. Choose an action:
                                        </p>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <a
                                                href={`/admin/products/add?part_number=${encodeURIComponent(notFoundBarcode)}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '12px 20px',
                                                    backgroundColor: '#10b981',
                                                    color: 'white',
                                                    textDecoration: 'none',
                                                    borderRadius: '8px',
                                                    fontWeight: 'bold',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                ➕ Create New Product (with barcode pre-filled)
                                            </a>

                                            <button
                                                onClick={() => {
                                                    setNotFoundBarcode(null);
                                                    setMessage({ type: '', text: '' });
                                                }}
                                                style={{
                                                    padding: '12px 20px',
                                                    backgroundColor: '#334155',
                                                    color: '#f8fafc',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontWeight: '500',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                ✖️ Cancel / Scan Another
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
                                        Scan a barcode above or search by part number to display identification details.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* MOVEMENTS TAB */}
                {activeTab === 'movements' && (
                    <div className="movements-tab">
                        <h3>In-Transit Shipments ({movements.length})</h3>

                        {/* Filters */}
                        <div style={{ marginBottom: '20px', padding: '15px', background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)', borderRadius: '8px', border: '1px solid #B8860B' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    placeholder="🔍 Search product/part#..."
                                    value={movementsSearch}
                                    onChange={(e) => setMovementsSearch(e.target.value)}
                                    style={{ flex: '1', minWidth: '180px', padding: '10px', borderRadius: '6px', border: '1px solid #B8860B', background: '#1a1a1a', color: '#F5F0E1', fontSize: '14px' }}
                                />
                                <select
                                    value={movementsSourceFilter}
                                    onChange={(e) => setMovementsSourceFilter(e.target.value)}
                                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #B8860B', background: '#1a1a1a', color: '#F5F0E1', minWidth: '140px' }}
                                >
                                    <option value="">All Sources</option>
                                    {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                                </select>
                                <select
                                    value={movementsDestFilter}
                                    onChange={(e) => setMovementsDestFilter(e.target.value)}
                                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #B8860B', background: '#1a1a1a', color: '#F5F0E1', minWidth: '140px' }}
                                >
                                    <option value="">All Destinations</option>
                                    {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                                </select>
                                <input
                                    type="date"
                                    value={movementsDateFilter}
                                    onChange={(e) => setMovementsDateFilter(e.target.value)}
                                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #B8860B', background: '#1a1a1a', color: '#F5F0E1' }}
                                />
                                {(movementsSearch || movementsSourceFilter || movementsDestFilter || movementsDateFilter) && (
                                    <button
                                        onClick={() => { setMovementsSearch(''); setMovementsSourceFilter(''); setMovementsDestFilter(''); setMovementsDateFilter(''); }}
                                        style={{ padding: '10px 15px', background: '#555', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                                    >Clear Filters</button>
                                )}
                            </div>
                        </div>

                        {movements.filter(m => {
                            const matchSearch = !movementsSearch ||
                                (m.product_name || '').toLowerCase().includes(movementsSearch.toLowerCase()) ||
                                (m.part_number || '').toLowerCase().includes(movementsSearch.toLowerCase()) ||
                                (m.barcode || '').toLowerCase().includes(movementsSearch.toLowerCase());
                            const matchSource = !movementsSourceFilter || m.from_warehouse_name === movementsSourceFilter;
                            const matchDest = !movementsDestFilter || m.to_warehouse_name === movementsDestFilter;
                            const matchDate = !movementsDateFilter || (m.shipped_at || m.created_at).startsWith(movementsDateFilter);
                            return matchSearch && matchSource && matchDest && matchDate;
                        }).length === 0 ? (
                            <p style={{ color: '#666', padding: '20px' }}>No shipments found matching filters</p>
                        ) : (
                            <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', minWidth: '900px' }}>
                                    <thead>
                                        <tr style={{ background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>Product</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>Part#</th>
                                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>Qty</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>From → To</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B', minWidth: '280px' }}>Pipeline Status</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>Tracking</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>Duration</th>
                                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.filter(m => {
                                            const matchSearch = !movementsSearch ||
                                                (m.product_name || '').toLowerCase().includes(movementsSearch.toLowerCase()) ||
                                                (m.part_number || '').toLowerCase().includes(movementsSearch.toLowerCase()) ||
                                                (m.barcode || '').toLowerCase().includes(movementsSearch.toLowerCase());
                                            const matchSource = !movementsSourceFilter || m.from_warehouse_name === movementsSourceFilter;
                                            const matchDest = !movementsDestFilter || m.to_warehouse_name === movementsDestFilter;
                                            const matchDate = !movementsDateFilter || (m.shipped_at || m.created_at || '').startsWith(movementsDateFilter);
                                            return matchSearch && matchSource && matchDest && matchDate;
                                        }).map(m => {
                                            // Pipeline stages definition
                                            const PIPELINE = [
                                                { key: 'pending', label: 'Created', icon: '📋', ts: m.created_at },
                                                { key: 'picked', label: 'Picked', icon: '🔍', ts: m.picked_at },
                                                { key: 'packed', label: 'Packed', icon: '📦', ts: m.packed_at },
                                                { key: 'customs_review', label: 'Customs', icon: '🛃', ts: m.customs_cleared_at },
                                                { key: 'in_transit', label: 'In Transit', icon: '✈️', ts: m.shipped_at },
                                                { key: 'arrived', label: 'Arrived', icon: '📥', ts: m.received_at },
                                                { key: 'completed', label: 'Done', icon: '✅', ts: m.scanned_at }
                                            ];
                                            const statusIndex = PIPELINE.findIndex(s => s.key === m.status);

                                            // Duration calc
                                            const shippedDate = m.shipped_at ? new Date(m.shipped_at) : new Date(m.created_at);
                                            const receivedDate = m.received_at ? new Date(m.received_at) : null;
                                            const endDate = m.status === 'completed' && m.received_at ? receivedDate : new Date();
                                            const diffMs = endDate - shippedDate;
                                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                            const durationText = diffDays > 0 ? `${diffDays}d ${diffHours}h` : `${diffHours}h`;

                                            // Determine which country flags to show
                                            const fromFlag = m.from_warehouse_country === 'CAN' ? '🇨🇦' : m.from_warehouse_country === 'IND' ? '🇮🇳' : '';
                                            const toFlag = m.to_warehouse_country === 'CAN' ? '🇨🇦' : m.to_warehouse_country === 'IND' ? '🇮🇳' : '';

                                            // Next valid status for advancement
                                            const nextStatus = statusIndex < PIPELINE.length - 1 ? PIPELINE[statusIndex + 1] : null;

                                            return (
                                                <tr key={m.id} style={{ borderBottom: '1px solid rgba(184, 134, 11, 0.3)', background: '#1a1a1a' }}>
                                                    <td style={{ padding: '12px', color: '#F5F0E1' }}>
                                                        {m.product_name}
                                                        {m.hs_code && <div style={{ fontSize: '10px', color: '#888' }}>HS: {m.hs_code}</div>}
                                                    </td>
                                                    <td style={{ padding: '12px', fontFamily: 'monospace', color: '#B8860B' }}>{m.part_number || m.barcode}</td>
                                                    <td style={{ padding: '12px', textAlign: 'center', color: '#F5F0E1', fontWeight: 'bold' }}>{m.quantity || 1}</td>
                                                    <td style={{ padding: '12px', color: '#F5F0E1', fontSize: '13px' }}>
                                                        <span>{fromFlag} {m.from_warehouse_name}</span>
                                                        <span style={{ color: '#B8860B', margin: '0 6px' }}>→</span>
                                                        <span>{toFlag} {m.to_warehouse_name}</span>
                                                        {m.from_bin_number && <div style={{ fontSize: '10px', color: '#888' }}>Bin: {m.from_bin_number}</div>}
                                                    </td>
                                                    {/* Pipeline Status Stepper */}
                                                    <td style={{ padding: '12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                            {PIPELINE.map((stage, i) => {
                                                                const isDone = i < statusIndex;
                                                                const isCurrent = i === statusIndex;
                                                                const isPending = i > statusIndex;
                                                                return (
                                                                    <div key={stage.key} style={{ display: 'flex', alignItems: 'center' }} title={`${stage.label}${stage.ts ? ': ' + new Date(stage.ts).toLocaleString() : ''}`}>
                                                                        <div style={{
                                                                            width: isCurrent ? '24px' : '18px',
                                                                            height: isCurrent ? '24px' : '18px',
                                                                            borderRadius: '50%',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontSize: isCurrent ? '12px' : '9px',
                                                                            background: isDone ? '#4caf50' : isCurrent ? '#1976d2' : '#444',
                                                                            color: 'white',
                                                                            border: isCurrent ? '2px solid #64b5f6' : 'none',
                                                                            fontWeight: 'bold',
                                                                            transition: 'all 0.2s'
                                                                        }}>
                                                                            {isDone ? '✓' : stage.icon}
                                                                        </div>
                                                                        {i < PIPELINE.length - 1 && (
                                                                            <div style={{
                                                                                width: '12px',
                                                                                height: '2px',
                                                                                background: isDone ? '#4caf50' : '#444'
                                                                            }} />
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div style={{ marginTop: '4px', fontSize: '10px', color: statusIndex >= PIPELINE.length - 1 ? '#4caf50' : '#1976d2', fontWeight: 'bold' }}>
                                                            {PIPELINE[statusIndex]?.icon} {PIPELINE[statusIndex]?.label || m.status}
                                                            {m.customs_status && m.customs_status !== 'not_required' && (
                                                                <span style={{ marginLeft: '6px', color: m.customs_status === 'cleared' ? '#4caf50' : '#ff9800' }}>
                                                                    | 🛃 {m.customs_status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '11px', color: '#888' }}>
                                                        {m.tracking_number || '-'}
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '12px' }}>
                                                        <span style={{
                                                            color: m.status === 'completed' ? '#4caf50' : (diffDays > 3 ? '#f44336' : '#B8860B'),
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {durationText}
                                                        </span>
                                                        <div style={{ fontSize: '10px', color: '#666' }}>
                                                            {m.created_by_name && <span>by {m.created_by_name}</span>}
                                                        </div>
                                                    </td>
                                                    {/* Actions: Advance Status */}
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        {nextStatus && m.status !== 'completed' && m.status !== 'cancelled' ? (
                                                            <button
                                                                onClick={async () => {
                                                                    if (!confirm(`Advance to "${nextStatus.label}"?`)) return;
                                                                    try {
                                                                        await movementsAPI.updateStatus({
                                                                            movement_id: m.id,
                                                                            new_status: nextStatus.key
                                                                        });
                                                                        fetchMovements();
                                                                        setMessage({ type: 'success', text: `✅ Status advanced to ${nextStatus.label}` });
                                                                    } catch (err) {
                                                                        setMessage({ type: 'error', text: 'Failed to update status' });
                                                                    }
                                                                }}
                                                                style={{
                                                                    padding: '5px 10px',
                                                                    fontSize: '11px',
                                                                    background: 'linear-gradient(135deg, #1976d2, #1565c0)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                                title={`Advance to: ${nextStatus.label}`}
                                                            >
                                                                → {nextStatus.icon} {nextStatus.label}
                                                            </button>
                                                        ) : (
                                                            <span style={{ fontSize: '11px', color: '#4caf50' }}>
                                                                {m.status === 'completed' ? '✅ Done' : m.status === 'cancelled' ? '❌' : '-'}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* WAREHOUSE INVENTORY TAB - Multi-Warehouse Matrix & Bin/Product Catalog */}
                {activeTab === 'warehouse-inventory' && (
                    <div className="warehouse-inventory-tab">
                        {/* All Warehouses Inventory Matrix */}
                        <div style={{ marginBottom: '28px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>🏭 All Warehouses Inventory Matrix</span>
                                    </h3>
                                    <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
                                        Full stock overview across all branches. Click any warehouse card to inspect its complete parts and bins.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        fetchWarehouses();
                                        if (effectiveWarehouseId) {
                                            fetchBinInventory(effectiveWarehouseId, binInventorySearch);
                                            fetchProductInventory(effectiveWarehouseId, binInventorySearch);
                                        }
                                    }}
                                    style={{
                                        padding: '7px 14px',
                                        background: 'rgba(51, 65, 85, 0.6)',
                                        border: '1px solid #475569',
                                        borderRadius: '6px',
                                        color: '#cbd5e1',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    🔄 Refresh Matrix
                                </button>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '16px'
                            }}>
                                {warehouses.map(w => {
                                    const isCurrent = String(w.id) === String(effectiveWarehouseId);
                                    return (
                                        <div
                                            key={w.id}
                                            onClick={() => {
                                                setSelectedWarehouse(String(w.id));
                                                fetchBins(w.id);
                                                fetchBinInventory(w.id, binInventorySearch);
                                                fetchProductInventory(w.id, binInventorySearch);
                                            }}
                                            style={{
                                                padding: '18px',
                                                borderRadius: '12px',
                                                background: isCurrent
                                                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))'
                                                    : 'linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(30, 41, 59, 0.5))',
                                                border: isCurrent
                                                    ? '2px solid #f59e0b'
                                                    : '1px solid rgba(51, 65, 85, 0.6)',
                                                boxShadow: isCurrent ? '0 4px 20px rgba(245, 158, 11, 0.2)' : 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                gap: '12px'
                                            }}
                                        >
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: isCurrent ? '#fbbf24' : '#f8fafc' }}>
                                                        {w.country === 'CAN' ? '🇨🇦 ' : w.country === 'IND' ? '🇮🇳 ' : '🏢 '}
                                                        {w.name}
                                                    </div>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontFamily: 'monospace',
                                                        padding: '2px 8px',
                                                        background: isCurrent ? 'rgba(245, 158, 11, 0.2)' : 'rgba(51, 65, 85, 0.5)',
                                                        color: isCurrent ? '#fbbf24' : '#94a3b8',
                                                        borderRadius: '4px',
                                                        border: isCurrent ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #475569'
                                                    }}>
                                                        {w.code || `WH-${w.id}`}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                                                    📍 {w.city ? `${w.city}, ${w.state || w.country || ''}` : (w.address || 'Address unlisted')}
                                                </div>
                                            </div>

                                            {/* Metrics row */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Units</div>
                                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#34d399' }}>{w.total_units || 0}</div>
                                                </div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Parts</div>
                                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>{w.product_count || 0}</div>
                                                </div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Bins</div>
                                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#60a5fa' }}>{w.bin_count || 0}</div>
                                                </div>
                                            </div>

                                            {/* Footer / Selector indicator */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
                                                <span>👤 {w.admin_first_name ? `${w.admin_first_name} ${w.admin_last_name || ''}` : (w.admin_email || 'Unassigned')}</span>
                                                <span style={{
                                                    color: isCurrent ? '#fbbf24' : '#64748b',
                                                    fontWeight: isCurrent ? 'bold' : 'normal'
                                                }}>
                                                    {isCurrent ? '● Active' : 'Inspect →'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Selected Warehouse Deep Dive Section */}
                        <div style={{
                            marginBottom: '20px',
                            padding: '16px 20px',
                            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
                            borderRadius: '12px',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div>
                                <strong style={{ color: '#fbbf24', fontSize: '16px' }}>
                                    📦 Inspected Warehouse:
                                </strong>
                                <span style={{ marginLeft: '10px', color: '#f8fafc', fontSize: '16px', fontWeight: 'bold' }}>
                                    {activeWarehouseObj?.name || 'Not selected'} {activeWarehouseObj?.code ? `(${activeWarehouseObj.code})` : ''}
                                </span>
                            </div>

                            {/* Warehouse selector for quickly changing warehouse */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <label style={{ color: '#94a3b8', fontSize: '13px' }}>Switch Warehouse:</label>
                                <select
                                    value={effectiveWarehouseId || ''}
                                    onChange={(e) => {
                                        setSelectedWarehouse(e.target.value);
                                        fetchBins(e.target.value);
                                        fetchBinInventory(e.target.value, binInventorySearch);
                                        fetchProductInventory(e.target.value, binInventorySearch);
                                    }}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '6px',
                                        border: '1px solid #f59e0b',
                                        backgroundColor: '#0f172a',
                                        color: '#f8fafc',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                >
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.country === 'CAN' ? '🇨🇦 ' : w.country === 'IND' ? '🇮🇳 ' : '🏢 '}
                                            {w.name} ({w.code || w.id})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Bin/Product View Toggle */}
                        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>View Catalog:</span>
                            <button
                                onClick={() => {
                                    setInventoryViewMode('bin');
                                    if (effectiveWarehouseId) fetchBinInventory(effectiveWarehouseId, binInventorySearch);
                                }}
                                style={{
                                    padding: '9px 18px',
                                    borderRadius: '6px',
                                    border: inventoryViewMode === 'bin' ? '2px solid #f59e0b' : '1px solid #475569',
                                    background: inventoryViewMode === 'bin' ? 'linear-gradient(135deg, #d97706, #b45309)' : '#1e293b',
                                    color: inventoryViewMode === 'bin' ? '#ffffff' : '#94a3b8',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '13px'
                                }}
                            >
                                📦 By Bin Rack
                            </button>
                            <button
                                onClick={() => {
                                    setInventoryViewMode('product');
                                    if (effectiveWarehouseId) fetchProductInventory(effectiveWarehouseId, binInventorySearch);
                                }}
                                style={{
                                    padding: '9px 18px',
                                    borderRadius: '6px',
                                    border: inventoryViewMode === 'product' ? '2px solid #f59e0b' : '1px solid #475569',
                                    background: inventoryViewMode === 'product' ? 'linear-gradient(135deg, #d97706, #b45309)' : '#1e293b',
                                    color: inventoryViewMode === 'product' ? '#ffffff' : '#94a3b8',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '13px'
                                }}
                            >
                                🔧 By Product & Part#
                            </button>
                        </div>

                        {/* Note about bin creation */}
                        <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px dashed rgba(245, 158, 11, 0.4)' }}>
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>💡 To configure or rename bins for this warehouse, switch to the </span>
                            <button
                                onClick={() => setActiveTab('bin-management')}
                                style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px', fontWeight: 'bold' }}
                            >
                                Bin Management
                            </button>
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}> tab</span>
                        </div>

                        {/* BIN VIEW MODE */}
                        {inventoryViewMode === 'bin' && (
                            <>
                                {/* Bins Grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                    gap: '15px'
                                }}>
                                    {bins.map(bin => (
                                        <div
                                            key={bin.id}
                                            onClick={() => handleBinClick(bin)}
                                            style={{
                                                padding: '18px 14px',
                                                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                                borderRadius: '10px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                transition: 'transform 0.15s, box-shadow 0.15s'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.2)'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                        >
                                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>
                                                {bin.bin_number}
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#34d399', marginTop: '6px', fontWeight: 'bold' }}>
                                                {bin.product_count || 0} items
                                            </div>
                                            {bin.description && (
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                                    {bin.description}
                                                </div>
                                            )}
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                                                Click to view contents
                                            </div>
                                        </div>
                                    ))}
                                    {bins.length === 0 && (
                                        <div style={{ gridColumn: '1 / -1', padding: '30px', textAlign: 'center', color: '#94a3b8', background: '#0f172a', borderRadius: '10px', border: '1px solid #334155' }}>
                                            No bins configured for this warehouse. Use Bin Management to create bin racks.
                                        </div>
                                    )}
                                </div>

                                {/* Bin Inventory Table */}
                                <div style={{ marginTop: '28px', padding: '22px', background: 'linear-gradient(145deg, #0f172a, #1e293b)', borderRadius: '12px', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
                                    <h4 style={{ margin: '0 0 16px 0', color: '#fbbf24', fontSize: '17px', fontWeight: 'bold' }}>
                                        📋 Products by Bin Rack
                                    </h4>

                                    {/* Live Search */}
                                    <div style={{ marginBottom: '16px' }}>
                                        <input
                                            type="text"
                                            placeholder="🔍 Search by part number, name, or bin (instant live search)..."
                                            value={binInventorySearch}
                                            onChange={(e) => {
                                                setBinInventorySearch(e.target.value);
                                                if (effectiveWarehouseId) {
                                                    fetchBinInventory(effectiveWarehouseId, e.target.value);
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                border: '1px solid #475569',
                                                background: '#0b0f17',
                                                color: '#f8fafc',
                                                fontSize: '14px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    {/* Loading state while auto-fetching */}
                                    {binInventoryLoading && (
                                        <div style={{ textAlign: 'center', padding: '30px', color: '#fbbf24' }}>
                                            Loading inventory data...
                                        </div>
                                    )}

                                    {/* Gross Total Summary */}
                                    {!binInventoryLoading && binInventory.length > 0 && (
                                        <div style={{ marginBottom: '16px', padding: '14px 18px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                            <div style={{ color: '#cbd5e1', fontSize: '14px' }}>
                                                <span>Active Bins:</span>
                                                <span style={{ marginLeft: '8px', fontWeight: 'bold', color: '#fbbf24', fontSize: '16px' }}>{binInventory.length}</span>
                                            </div>
                                            <div style={{ color: '#cbd5e1', fontSize: '14px' }}>
                                                <span>Total In-Stock Units:</span>
                                                <span style={{ marginLeft: '8px', fontWeight: 'bold', color: '#34d399', fontSize: '18px' }}>
                                                    {binInventory.reduce((sum, item) => sum + (parseInt(item.total_quantity) || 0), 0)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Table */}
                                    {!binInventoryLoading && binInventory.length > 0 ? (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(30, 41, 59, 0.8)' }}>
                                                        <th style={{ padding: '12px 14px', textAlign: 'left', color: '#fbbf24', borderBottom: '1px solid #475569' }}>Bin</th>
                                                        <th style={{ padding: '12px 14px', textAlign: 'left', color: '#fbbf24', borderBottom: '1px solid #475569' }}>Part Numbers</th>
                                                        <th style={{ padding: '12px 14px', textAlign: 'right', color: '#fbbf24', borderBottom: '1px solid #475569' }}>Total Items</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {binInventory.map((item, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.4)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.2)' }}>
                                                            <td style={{ padding: '12px 14px', fontWeight: 'bold', color: '#fbbf24' }}>{item.bin_number || 'No Bin'}</td>
                                                            <td style={{ padding: '12px 14px', maxWidth: '400px', wordBreak: 'break-word', color: '#f8fafc' }}>{item.part_numbers}</td>
                                                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 'bold', color: '#34d399', fontSize: '15px' }}>{item.total_quantity}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : !binInventoryLoading && (
                                        <p style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', margin: 0 }}>
                                            No bin records found for this warehouse matching search criteria.
                                        </p>
                                    )}
                                </div>
                            </>
                        )}

                        {/* PRODUCT VIEW MODE */}
                        {inventoryViewMode === 'product' && (
                            <div style={{ padding: '22px', background: 'linear-gradient(145deg, #0f172a, #1e293b)', borderRadius: '12px', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
                                <h4 style={{ margin: '0 0 16px 0', color: '#fbbf24', fontSize: '17px', fontWeight: 'bold' }}>
                                    🔧 Products in Warehouse
                                </h4>

                                {/* Live Search for Products */}
                                <div style={{ marginBottom: '16px' }}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Search products by part#, name..."
                                        value={binInventorySearch}
                                        onChange={(e) => {
                                            setBinInventorySearch(e.target.value);
                                            if (effectiveWarehouseId) fetchProductInventory(effectiveWarehouseId, e.target.value);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            borderRadius: '8px',
                                            border: '1px solid #475569',
                                            background: '#0b0f17',
                                            color: '#f8fafc',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                {/* Product Summary */}
                                {!productInventoryLoading && productInventory.length > 0 && (
                                    <div style={{ marginBottom: '16px', padding: '14px 18px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                        <div style={{ color: '#cbd5e1', fontSize: '14px' }}>
                                            <span>Unique Products:</span>
                                            <span style={{ marginLeft: '8px', fontWeight: 'bold', color: '#fbbf24', fontSize: '16px' }}>{productInventory.length}</span>
                                        </div>
                                        <div style={{ color: '#cbd5e1', fontSize: '14px' }}>
                                            <span>Total In-Stock Units:</span>
                                            <span style={{ marginLeft: '8px', fontWeight: 'bold', color: '#34d399', fontSize: '18px' }}>
                                                {productInventory.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Products Table */}
                                {productInventoryLoading ? (
                                    <p style={{ textAlign: 'center', padding: '30px', color: '#fbbf24' }}>Loading products...</p>
                                ) : productInventory.length > 0 ? (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(30, 41, 59, 0.8)' }}>
                                                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#fbbf24', borderBottom: '1px solid #475569' }}>Part Number</th>
                                                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#fbbf24', borderBottom: '1px solid #475569' }}>Product Name</th>
                                                    <th style={{ padding: '12px 14px', textAlign: 'left', color: '#fbbf24', borderBottom: '1px solid #475569' }}>Bin</th>
                                                    <th style={{ padding: '12px 14px', textAlign: 'right', color: '#fbbf24', borderBottom: '1px solid #475569' }}>Stock Qty</th>
                                                    <th style={{ padding: '12px 14px', textAlign: 'right', color: '#fbbf24', borderBottom: '1px solid #475569' }}>Price</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {productInventory.map((p, idx) => (
                                                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.4)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.2)' }}>
                                                        <td style={{ padding: '12px 14px', fontWeight: 'bold', color: '#fbbf24', fontFamily: 'monospace' }}>{p.part_number || '-'}</td>
                                                        <td style={{ padding: '12px 14px', color: '#f8fafc' }}>{p.name}</td>
                                                        <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{p.bin_number || 'No Bin'}</td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 'bold', color: '#34d399', fontSize: '15px' }}>{p.quantity}</td>
                                                        <td style={{ padding: '12px 14px', textAlign: 'right', color: '#f8fafc' }}>${parseFloat(p.price || 0).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No products found in this warehouse.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* BIN MANAGEMENT TAB - Create and arrange bins */}
                {activeTab === 'bin-management' && (
                    <div className="bin-management-tab">
                        <div style={{ marginBottom: '20px', padding: '20px', background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)', borderRadius: '12px', border: '1px solid #B8860B' }}>
                            <h3 style={{ color: '#B8860B', fontFamily: "'Oswald', sans-serif", marginBottom: '15px' }}>🗄️ Create New Bin</h3>
                            <form onSubmit={handleCreateBin} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
                                <div style={{ flex: '1', minWidth: '150px' }}>
                                    <label style={{ display: 'block', color: '#F5F0E1', marginBottom: '5px', fontSize: '12px' }}>Bin Number *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., A-01"
                                        value={newBin.bin_number}
                                        onChange={(e) => setNewBin({ ...newBin, bin_number: e.target.value })}
                                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #B8860B', backgroundColor: '#1a1a1a', color: '#F5F0E1' }}
                                        required
                                    />
                                </div>
                                <div style={{ flex: '2', minWidth: '200px' }}>
                                    <label style={{ display: 'block', color: '#F5F0E1', marginBottom: '5px', fontSize: '12px' }}>Description</label>
                                    <input
                                        type="text"
                                        placeholder="Description (optional)"
                                        value={newBin.description}
                                        onChange={(e) => setNewBin({ ...newBin, description: e.target.value })}
                                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #B8860B', backgroundColor: '#1a1a1a', color: '#F5F0E1' }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        padding: '12px 24px',
                                        background: 'linear-gradient(135deg, #B8860B, #8B6914)',
                                        color: '#1a1a1a',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontFamily: "'Oswald', sans-serif"
                                    }}
                                >
                                    + Create Bin
                                </button>
                            </form>
                        </div>

                        <div style={{ padding: '20px', background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)', borderRadius: '12px', border: '1px solid #B8860B' }}>
                            <h3 style={{ color: '#B8860B', fontFamily: "'Oswald', sans-serif", marginBottom: '15px' }}>📦 Bin Rack Layout ({bins.length} bins)</h3>

                            {/* Search Input */}
                            <div style={{ marginBottom: '15px' }}>
                                <input
                                    type="text"
                                    placeholder="🔍 Search by bin number..."
                                    value={binManagementSearch}
                                    onChange={(e) => setBinManagementSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 15px',
                                        borderRadius: '6px',
                                        border: '1px solid #B8860B',
                                        background: '#1a1a1a',
                                        color: '#F5F0E1',
                                        fontSize: '14px'
                                    }}
                                />
                                <button
                                    onClick={() => setBinScannerActive(true)}
                                    style={{
                                        padding: '12px 20px',
                                        background: 'linear-gradient(135deg, #B8860B, #8B6914)',
                                        color: '#1a1a1a',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '14px'
                                    }}
                                >📷 Scan</button>
                            </div>

                            {/* Scanner Modal */}
                            {binScannerActive && (
                                <div style={{ marginBottom: '15px', padding: '15px', background: 'rgba(184, 134, 11, 0.1)', borderRadius: '8px', border: '1px solid #B8860B' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ color: '#B8860B', fontWeight: 'bold' }}>📷 Scanner Active</span>
                                        <button
                                            onClick={() => setBinScannerActive(false)}
                                            style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
                                        >✕</button>
                                    </div>
                                    <BarcodeScanner
                                        onScan={(barcode) => handleBinScanResult(barcode)}
                                        onError={(error) => console.error('Scanner error:', error)}
                                    />
                                </div>
                            )}

                            <p style={{ color: '#888', fontSize: '12px', marginBottom: '15px' }}>Click on a bin to view its contents</p>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                gap: '12px'
                            }}>
                                {bins
                                    .filter(bin => !binManagementSearch || bin.bin_number.toLowerCase().includes(binManagementSearch.toLowerCase()))
                                    .map(bin => (
                                        <div
                                            key={bin.id}
                                            onClick={() => handleBinClick(bin)}
                                            style={{
                                                padding: '15px',
                                                background: 'rgba(184, 134, 11, 0.1)',
                                                border: '2px solid #B8860B',
                                                borderRadius: '8px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(184, 134, 11, 0.3)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(184, 134, 11, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                        >
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#B8860B' }}>{bin.bin_number}</div>
                                            <div style={{ fontSize: '12px', color: '#4caf50', marginTop: '5px' }}>{bin.product_count || 0} items</div>
                                        </div>
                                    ))}
                                {bins.length === 0 && (
                                    <p style={{ color: '#888', gridColumn: '1 / -1', textAlign: 'center', padding: '30px' }}>No bins created yet. Create your first bin above.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Bin Products Overlay Modal */}
                {selectedBinOverlay && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }} onClick={() => setSelectedBinOverlay(null)}>
                        <div style={{
                            background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
                            border: '2px solid #B8860B',
                            borderRadius: '12px',
                            padding: '25px',
                            maxWidth: '650px',
                            width: '100%',
                            maxHeight: '80vh',
                            overflow: 'auto'
                        }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ color: '#B8860B', fontFamily: "'Oswald', sans-serif", margin: 0 }}>
                                    📦 Bin {selectedBinOverlay.bin_number}
                                </h3>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => handleEditBin(selectedBinOverlay)}
                                        style={{ padding: '6px 12px', background: '#B8860B', color: '#1a1a1a', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                    >✏️ Edit</button>
                                    <button
                                        onClick={() => handleDeleteBin(selectedBinOverlay.id)}
                                        style={{ padding: '6px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                    >🗑️ Delete</button>
                                    <button
                                        onClick={() => setSelectedBinOverlay(null)}
                                        style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer' }}
                                    >×</button>
                                </div>
                            </div>
                            {selectedBinOverlay.description && (
                                <p style={{ color: '#888', fontSize: '14px', marginBottom: '15px' }}>{selectedBinOverlay.description}</p>
                            )}
                            <div style={{ color: '#F5F0E1' }}>
                                {binProducts.length === 0 ? (
                                    <p style={{ textAlign: 'center', padding: '30px', color: '#888' }}>Loading products... or this bin is empty</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {binProducts.map(p => (
                                            <div key={p.id} style={{
                                                padding: '12px',
                                                background: 'rgba(0,0,0,0.3)',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(184, 134, 11, 0.3)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold', color: '#F5F0E1' }}>{p.name || p.part_number}</div>
                                                    <div style={{ fontSize: '12px', color: '#B8860B' }}>{p.part_number}</div>
                                                </div>
                                                <div style={{ textAlign: 'center', marginRight: '15px' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#4caf50', fontSize: '18px' }}>{p.quantity}</div>
                                                    <div style={{ fontSize: '10px', color: '#888' }}>in stock</div>
                                                </div>
                                                <button
                                                    onClick={() => handleOpenShiftModal(p, selectedBinOverlay.bin_number)}
                                                    style={{ padding: '8px 12px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                                >📦→ Shift</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Bin Modal */}
                {showEditBinModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 10001,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }} onClick={() => setShowEditBinModal(false)}>
                        <div style={{
                            background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
                            border: '2px solid #B8860B',
                            borderRadius: '12px',
                            padding: '25px',
                            maxWidth: '400px',
                            width: '100%'
                        }} onClick={(e) => e.stopPropagation()}>
                            <h3 style={{ color: '#B8860B', fontFamily: "'Oswald', sans-serif", marginBottom: '20px' }}>✏️ Edit Bin</h3>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', color: '#F5F0E1', marginBottom: '5px', fontSize: '12px' }}>Bin Number</label>
                                <input
                                    type="text"
                                    value={editBinData.bin_number}
                                    onChange={(e) => setEditBinData({ ...editBinData, bin_number: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #B8860B', backgroundColor: '#1a1a1a', color: '#F5F0E1' }}
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', color: '#F5F0E1', marginBottom: '5px', fontSize: '12px' }}>Description</label>
                                <input
                                    type="text"
                                    value={editBinData.description}
                                    onChange={(e) => setEditBinData({ ...editBinData, description: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #B8860B', backgroundColor: '#1a1a1a', color: '#F5F0E1' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setShowEditBinModal(false)}
                                    style={{ padding: '10px 20px', background: '#555', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                >Cancel</button>
                                <button
                                    onClick={handleUpdateBin}
                                    disabled={loading}
                                    style={{ padding: '10px 20px', background: '#B8860B', color: '#1a1a1a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >{loading ? 'Saving...' : 'Save Changes'}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Shift Product Modal */}
                {showShiftModal && shiftData.product && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 10001,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }} onClick={() => setShowShiftModal(false)}>
                        <div style={{
                            background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
                            border: '2px solid #2196F3',
                            borderRadius: '12px',
                            padding: '25px',
                            maxWidth: '450px',
                            width: '100%'
                        }} onClick={(e) => e.stopPropagation()}>
                            <h3 style={{ color: '#2196F3', fontFamily: "'Oswald', sans-serif", marginBottom: '20px' }}>📦→ Shift Product</h3>
                            <div style={{ padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', marginBottom: '20px' }}>
                                <div style={{ fontWeight: 'bold', color: '#F5F0E1' }}>{shiftData.product.name || shiftData.product.part_number}</div>
                                <div style={{ fontSize: '12px', color: '#B8860B' }}>{shiftData.product.part_number}</div>
                                <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>Current stock: {shiftData.product.quantity}</div>
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', color: '#F5F0E1', marginBottom: '5px', fontSize: '12px' }}>From Bin</label>
                                <input
                                    type="text"
                                    value={shiftData.fromBin}
                                    disabled
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #555', backgroundColor: '#333', color: '#888' }}
                                />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', color: '#F5F0E1', marginBottom: '5px', fontSize: '12px' }}>To Bin *</label>
                                <select
                                    value={shiftData.toBin}
                                    onChange={(e) => setShiftData({ ...shiftData, toBin: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #2196F3', backgroundColor: '#1a1a1a', color: '#F5F0E1' }}
                                >
                                    <option value="">Select target bin...</option>
                                    {bins.filter(b => b.bin_number !== shiftData.fromBin).map(b => (
                                        <option key={b.id} value={b.bin_number}>{b.bin_number}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', color: '#F5F0E1', marginBottom: '5px', fontSize: '12px' }}>Quantity to Move *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={shiftData.product?.quantity || 1}
                                    value={shiftData.quantity}
                                    onChange={(e) => setShiftData({ ...shiftData, quantity: Math.min(parseInt(e.target.value) || 1, shiftData.product?.quantity || 1) })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #2196F3', backgroundColor: '#1a1a1a', color: '#F5F0E1', fontSize: '16px', fontWeight: 'bold' }}
                                />
                                <div style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>Max: {shiftData.product?.quantity || 0}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setShowShiftModal(false)}
                                    style={{ padding: '10px 20px', background: '#555', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                >Cancel</button>
                                <button
                                    onClick={handleShiftProduct}
                                    disabled={loading || !shiftData.toBin}
                                    style={{ padding: '10px 20px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >{loading ? 'Moving...' : 'Move to Bin'}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* WAREHOUSES TAB */}
                {activeTab === 'warehouses' && (
                    <div className="warehouses-tab">
                        {/* Add Warehouse Button */}
                        <div style={{ marginBottom: '20px' }}>
                            <button
                                onClick={() => setShowWarehouseForm(true)}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: '#4caf50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: 'bold'
                                }}
                            >
                                + Add Warehouse
                            </button>
                        </div>

                        {/* Warehouse Form Modal */}
                        {showWarehouseForm && (
                            <div style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1000
                            }}>
                                <div style={{
                                    background: 'white',
                                    padding: '30px',
                                    borderRadius: '12px',
                                    maxWidth: '500px',
                                    width: '90%',
                                    maxHeight: '90vh',
                                    overflowY: 'auto'
                                }}>
                                    <h2 style={{ marginBottom: '20px', color: '#333' }}>
                                        {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
                                    </h2>
                                    <form onSubmit={handleSaveWarehouse}>
                                        <div style={{ display: 'grid', gap: '15px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Name *</label>
                                                    <input
                                                        type="text"
                                                        value={warehouseForm.name}
                                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                                                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white', color: '#333' }}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Code *</label>
                                                    <input
                                                        type="text"
                                                        value={warehouseForm.code}
                                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value.toUpperCase() })}
                                                        placeholder="e.g., WH-01"
                                                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white', color: '#333' }}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Address</label>
                                                <input
                                                    type="text"
                                                    value={warehouseForm.address}
                                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white', color: '#333' }}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>City</label>
                                                    <input
                                                        type="text"
                                                        value={warehouseForm.city}
                                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, city: e.target.value })}
                                                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white', color: '#333' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>State</label>
                                                    <input
                                                        type="text"
                                                        value={warehouseForm.state}
                                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, state: e.target.value })}
                                                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white', color: '#333' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>ZIP</label>
                                                    <input
                                                        type="text"
                                                        value={warehouseForm.zip}
                                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, zip: e.target.value })}
                                                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white', color: '#333' }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Phone</label>
                                                    <input
                                                        type="tel"
                                                        value={warehouseForm.phone}
                                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, phone: e.target.value })}
                                                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white', color: '#333' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Status</label>
                                                    <select
                                                        value={warehouseForm.status}
                                                        onChange={(e) => setWarehouseForm({ ...warehouseForm, status: e.target.value })}
                                                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white', color: '#333' }}
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Admin Assignment */}
                                            <div style={{ padding: '15px', background: '#fff3e0', borderRadius: '8px', border: '1px solid #ff9800' }}>
                                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#e65100' }}>
                                                    👤 Assign Warehouse Admin
                                                </label>
                                                <select
                                                    value={warehouseForm.assigned_admin_id}
                                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, assigned_admin_id: e.target.value })}
                                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white', color: '#333' }}
                                                >
                                                    <option value="">-- No Admin Assigned --</option>
                                                    {adminUsers
                                                        .filter(admin => {
                                                            // Show admin if:
                                                            // 1. They have no warehouse assigned (warehouse_id is null)
                                                            // 2. OR they are the current warehouse's admin
                                                            if (!admin.warehouse_id) return true;
                                                            if (editingWarehouse && String(admin.warehouse_id) === String(editingWarehouse.id)) return true;
                                                            return false;
                                                        })
                                                        .map(admin => (
                                                            <option key={admin.id} value={admin.id}>
                                                                {admin.first_name || ''} {admin.last_name || ''} ({admin.email})
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#666' }}>
                                                    This admin will be responsible for receiving inventory at this warehouse.
                                                </p>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Notes</label>
                                                <textarea
                                                    value={warehouseForm.notes}
                                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, notes: e.target.value })}
                                                    rows={3}
                                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', resize: 'vertical', backgroundColor: 'white', color: '#333' }}
                                                />
                                            </div>

                                            {/* Location Coordinates */}
                                            <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                    <label style={{ fontWeight: 'bold', color: '#333' }}>📍 GPS Coordinates</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!navigator.geolocation) {
                                                                setMessage({ type: 'error', text: 'Geolocation not supported' });
                                                                return;
                                                            }
                                                            navigator.geolocation.getCurrentPosition(
                                                                (pos) => {
                                                                    setWarehouseForm(prev => ({
                                                                        ...prev,
                                                                        latitude: pos.coords.latitude.toFixed(6),
                                                                        longitude: pos.coords.longitude.toFixed(6)
                                                                    }));
                                                                    setMessage({ type: 'success', text: 'Location detected!' });
                                                                },
                                                                () => setMessage({ type: 'error', text: 'Could not get location' }),
                                                                { enableHighAccuracy: true }
                                                            );
                                                        }}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: '#9c27b0',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        📍 Auto-Detect
                                                    </button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                    <div>
                                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>Latitude</label>
                                                        <input
                                                            type="text"
                                                            value={warehouseForm.latitude}
                                                            onChange={(e) => setWarehouseForm({ ...warehouseForm, latitude: e.target.value })}
                                                            placeholder="e.g., 43.7615"
                                                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'white', color: '#333' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>Longitude</label>
                                                        <input
                                                            type="text"
                                                            value={warehouseForm.longitude}
                                                            onChange={(e) => setWarehouseForm({ ...warehouseForm, longitude: e.target.value })}
                                                            placeholder="e.g., -79.2315"
                                                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'white', color: '#333' }}
                                                        />
                                                    </div>
                                                </div>
                                                {warehouseForm.latitude && warehouseForm.longitude && (
                                                    <div style={{ marginTop: '15px' }}>
                                                        {/* Embedded Google Maps */}
                                                        <div style={{
                                                            borderRadius: '8px',
                                                            overflow: 'hidden',
                                                            border: '1px solid #ddd',
                                                            marginBottom: '10px'
                                                        }}>
                                                            <iframe
                                                                title="Warehouse Location"
                                                                width="100%"
                                                                height="200"
                                                                style={{ border: 0 }}
                                                                loading="lazy"
                                                                src={`https://maps.google.com/maps?q=${warehouseForm.latitude},${warehouseForm.longitude}&z=15&output=embed`}
                                                            />
                                                        </div>
                                                        <a
                                                            href={`https://www.google.com/maps?q=${warehouseForm.latitude},${warehouseForm.longitude}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                display: 'inline-block',
                                                                padding: '6px 12px',
                                                                backgroundColor: '#4285f4',
                                                                color: 'white',
                                                                borderRadius: '4px',
                                                                textDecoration: 'none',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            🗺️ Open in Google Maps
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                onClick={resetWarehouseForm}
                                                style={{
                                                    padding: '10px 20px',
                                                    backgroundColor: '#e0e0e0',
                                                    color: '#333',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                style={{
                                                    padding: '10px 20px',
                                                    backgroundColor: '#1976d2',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {loading ? 'Saving...' : (editingWarehouse ? 'Update' : 'Create')}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Warehouses Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '20px'
                        }}>
                            {warehouses.map(w => (
                                <div
                                    key={w.id}
                                    style={{
                                        padding: '20px',
                                        background: 'white',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>🏭 {w.name}</h3>
                                        <span style={{
                                            padding: '2px 8px',
                                            fontSize: '11px',
                                            borderRadius: '4px',
                                            backgroundColor: w.status === 'active' ? '#e8f5e9' : '#ffebee',
                                            color: w.status === 'active' ? '#2e7d32' : '#c62828'
                                        }}>
                                            {w.status || 'active'}
                                        </span>
                                    </div>
                                    {w.code && <p style={{ color: '#1976d2', margin: '0 0 10px 0', fontWeight: 'bold' }}>Code: {w.code}</p>}
                                    <p style={{ color: '#666', margin: '5px 0', fontSize: '14px' }}>
                                        📍 {w.address || w.city || w.location || 'No address'}
                                        {w.city && w.state && `, ${w.city}, ${w.state}`}
                                    </p>
                                    {w.phone && <p style={{ color: '#666', margin: '5px 0', fontSize: '14px' }}>📞 {w.phone}</p>}

                                    {/* Display Assigned Admin */}
                                    <div style={{
                                        marginTop: '10px',
                                        padding: '8px',
                                        background: w.admin_email ? '#fff3e0' : '#ffebee',
                                        borderRadius: '4px',
                                        border: w.admin_email ? '1px solid #ff9800' : '1px solid #ef5350'
                                    }}>
                                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: w.admin_email ? '#e65100' : '#c62828' }}>
                                            👤 {w.admin_email ? (
                                                <>
                                                    Admin: {w.admin_first_name || ''} {w.admin_last_name || ''}
                                                    <span style={{ display: 'block', fontWeight: 'normal', color: '#666' }}>{w.admin_email}</span>
                                                </>
                                            ) : 'No admin assigned'}
                                        </p>
                                    </div>

                                    {/* Display Coordinates + Map */}
                                    {(w.latitude && w.longitude) ? (
                                        <div style={{ marginTop: '10px' }}>
                                            <div style={{ padding: '8px', background: '#e3f2fd', borderRadius: '4px 4px 0 0' }}>
                                                <p style={{ margin: 0, fontSize: '12px', color: '#1565c0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>🌐 Lat: {parseFloat(w.latitude).toFixed(4)}, Lng: {parseFloat(w.longitude).toFixed(4)}</span>
                                                    <a
                                                        href={`https://www.google.com/maps?q=${w.latitude},${w.longitude}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ fontSize: '11px', color: '#1976d2', textDecoration: 'none', fontWeight: 'bold' }}
                                                    >
                                                        🗺️ Open in Maps ↗
                                                    </a>
                                                </p>
                                            </div>
                                            <iframe
                                                title={`${w.name} location`}
                                                src={`https://maps.google.com/maps?q=${w.latitude},${w.longitude}&z=15&output=embed`}
                                                style={{
                                                    width: '100%',
                                                    height: '150px',
                                                    border: 'none',
                                                    borderRadius: '0 0 4px 4px'
                                                }}
                                                loading="lazy"
                                                allowFullScreen
                                            />
                                        </div>
                                    ) : (
                                        <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                                            📍 No GPS coordinates set — edit warehouse to add lat/long
                                        </p>
                                    )}

                                    <div style={{
                                        display: 'flex',
                                        gap: '20px',
                                        marginTop: '15px',
                                        paddingTop: '15px',
                                        borderTop: '1px solid #eee'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                                                {w.product_count || 0}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>Products</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>
                                                {w.bin_count || 0}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>Bins</div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                        <button
                                            onClick={() => handleEditWarehouse(w)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                backgroundColor: '#1976d2',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '13px'
                                            }}
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteWarehouse(w)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                backgroundColor: '#f44336',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '13px'
                                            }}
                                        >
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* BIN INVENTORY SECTION */}
                        <div style={{
                            marginTop: '40px',
                            padding: '25px',
                            background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
                            borderRadius: '12px',
                            border: '1px solid #B8860B'
                        }}>
                            <h3 style={{
                                color: '#F5F0E1',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontFamily: "'Oswald', sans-serif"
                            }}>
                                📦 Bin Inventory View
                            </h3>

                            {/* Warehouse Selector & Search */}
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1', minWidth: '200px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', color: '#B8860B', fontWeight: 'bold' }}>
                                        Select Warehouse:
                                    </label>
                                    <select
                                        value={binInventoryWarehouse}
                                        onChange={(e) => {
                                            setBinInventoryWarehouse(e.target.value);
                                            fetchBinInventory(e.target.value, binInventorySearch);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '6px',
                                            border: '1px solid #B8860B',
                                            backgroundColor: '#333',
                                            color: '#F5F0E1',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <option value="">-- Select Warehouse --</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ flex: '1', minWidth: '200px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', color: '#B8860B', fontWeight: 'bold' }}>
                                        Search (Part No / Bin No):
                                    </label>
                                    <input
                                        type="text"
                                        value={binInventorySearch}
                                        onChange={(e) => setBinInventorySearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && binInventoryWarehouse) {
                                                fetchBinInventory(binInventoryWarehouse, binInventorySearch);
                                            }
                                        }}
                                        placeholder="Enter part number or bin number..."
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '6px',
                                            border: '1px solid #666',
                                            backgroundColor: '#333',
                                            color: '#F5F0E1',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                                    <button
                                        onClick={() => fetchBinInventory(binInventoryWarehouse, binInventorySearch)}
                                        disabled={!binInventoryWarehouse || binInventoryLoading}
                                        style={{
                                            padding: '12px 20px',
                                            backgroundColor: '#B8860B',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: binInventoryWarehouse ? 'pointer' : 'not-allowed',
                                            opacity: binInventoryWarehouse ? 1 : 0.5
                                        }}
                                    >
                                        🔍 Search
                                    </button>
                                </div>
                            </div>

                            {/* Export Buttons */}
                            {binInventory.length > 0 && (
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                    <button
                                        onClick={exportToExcel}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: '#4caf50',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        📊 Export Excel/CSV
                                    </button>
                                    <button
                                        onClick={exportToPDF}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: '#8B2332',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        📄 Export PDF
                                    </button>
                                    {selectedBinRows.length > 0 && (
                                        <span style={{ color: '#B8860B', alignSelf: 'center', marginLeft: '10px' }}>
                                            {selectedBinRows.length} bin(s) selected
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Bin Inventory Table */}
                            {binInventoryLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#B8860B' }}>
                                    Loading...
                                </div>
                            ) : binInventory.length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#8B2332' }}>
                                                <th style={{ padding: '12px', color: 'white', textAlign: 'center', width: '50px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedBinRows.length === binInventory.length}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedBinRows(binInventory.map((_, i) => i));
                                                            } else {
                                                                setSelectedBinRows([]);
                                                            }
                                                        }}
                                                        style={{ width: '18px', height: '18px' }}
                                                    />
                                                </th>
                                                <th style={{ padding: '12px', color: 'white', textAlign: 'left' }}>Bin Number</th>
                                                <th style={{ padding: '12px', color: 'white', textAlign: 'left' }}>Part Numbers</th>
                                                <th style={{ padding: '12px', color: 'white', textAlign: 'center' }}>Unique Products</th>
                                                <th style={{ padding: '12px', color: 'white', textAlign: 'center' }}>Total Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {binInventory.map((bin, index) => (
                                                <tr
                                                    key={bin.bin_number}
                                                    style={{
                                                        background: selectedBinRows.includes(index) ? '#3d3d3d' : (index % 2 === 0 ? '#2a2a2a' : '#333'),
                                                        borderBottom: '1px solid #444'
                                                    }}
                                                >
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBinRows.includes(index)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedBinRows([...selectedBinRows, index]);
                                                                } else {
                                                                    setSelectedBinRows(selectedBinRows.filter(i => i !== index));
                                                                }
                                                            }}
                                                            style={{ width: '18px', height: '18px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '12px', color: '#B8860B', fontWeight: 'bold' }}>
                                                        {bin.bin_number}
                                                    </td>
                                                    <td style={{ padding: '12px', color: '#F5F0E1', maxWidth: '300px', wordBreak: 'break-word' }}>
                                                        {bin.part_numbers || '-'}
                                                    </td>
                                                    <td style={{ padding: '12px', color: '#4caf50', textAlign: 'center', fontWeight: 'bold' }}>
                                                        {bin.unique_products}
                                                    </td>
                                                    <td style={{ padding: '12px', color: '#F5F0E1', textAlign: 'center', fontWeight: 'bold' }}>
                                                        {bin.total_quantity}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : binInventoryWarehouse ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                    No products found in bins for this warehouse.
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                    Select a warehouse to view bin inventory.
                                </div>
                            )}
                        </div>

                        {warehouses.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                <p style={{ fontSize: '18px' }}>No warehouses yet</p>
                                <p>Click "Add Warehouse" to create your first warehouse</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Inventory;
