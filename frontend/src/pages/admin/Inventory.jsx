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

    useEffect(() => {
        // Use selectedWarehouse if set, otherwise use adminWarehouseId
        const warehouseToFetch = selectedWarehouse || adminWarehouseId;
        if (warehouseToFetch) {
            fetchBins(warehouseToFetch);
        }
    }, [selectedWarehouse, adminWarehouseId]);

    // Fetch bins for admin's assigned warehouse (for receive mode)
    useEffect(() => {
        const fetchAdminBins = async () => {
            if (adminWarehouseId) {
                try {
                    const data = await binAPI.getAll(adminWarehouseId);
                    setAdminBins(data.bins || []);
                } catch (error) {
                    console.error('Error fetching admin bins:', error);
                }
            }
        };
        fetchAdminBins();
    }, [adminWarehouseId]);

    // Auto-load bin inventory when warehouse-inventory tab is active
    useEffect(() => {
        if (activeTab === 'warehouse-inventory' && adminWarehouseId && binInventory.length === 0 && !binInventoryLoading) {
            fetchBinInventory(adminWarehouseId, '');
        }
    }, [activeTab, adminWarehouseId]);

    // Auto-load bins when bin-management tab is active
    useEffect(() => {
        if (activeTab === 'bin-management' && adminWarehouseId) {
            fetchBins(adminWarehouseId);
        }
    }, [activeTab, adminWarehouseId]);

    const fetchWarehouses = async () => {
        try {
            const data = await warehouseAPI.getAll();
            setWarehouses(data.warehouses || []);
            if (data.warehouses?.length > 0 && !selectedWarehouse) {
                setSelectedWarehouse(data.warehouses[0].id);
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
        try {
            const data = await binAPI.getAll(warehouseId);
            setBins(data.bins || []);
        } catch (error) {
            console.error('Error fetching bins:', error);
        }
    };

    const fetchMovements = async () => {
        try {
            // Filter by admin's warehouse - show only movements where admin is sender or receiver
            const params = { status: 'in_transit' };
            if (adminWarehouseId) {
                params.warehouse_id = adminWarehouseId;
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
                // For SEND mode, verify product is in admin's warehouse
                if (activeTab === 'scan-send' && adminWarehouseId && String(product.warehouse_id) !== String(adminWarehouseId)) {
                    setScannedProduct(null);
                    setMessage({ type: 'warning', text: `Cannot send: Product is in ${product.warehouse_name || 'another warehouse'}, not your warehouse.` });
                } else {
                    setScannedProduct(product);
                    setSendQuantity(1);
                    setMessage({ type: 'success', text: `Found: ${product.name} (Qty: ${product.quantity})` });
                }
            } else {
                // Search for product by barcode/part_number - ONLY in admin's warehouse
                const productsModule = await import('../../api/products');

                // First, search ONLY in admin's warehouse
                const searchParams = { search: barcode, limit: 20 };
                if (adminWarehouseId) {
                    searchParams.warehouse_id = adminWarehouseId;
                }
                console.log('🔍 SEARCH DEBUG:', { adminWarehouseId, searchParams, userWarehouseId: user?.warehouse_id });
                const result = await productsModule.getProducts(searchParams);
                const products = result.products || result;
                console.log('🔍 SEARCH RESULTS:', products?.length, 'products found, first:', products?.[0]?.warehouse_id);

                // Find matching product in admin's warehouse
                let matchingProducts = products?.filter(p =>
                    p.part_number === barcode || p.barcode === barcode ||
                    p.part_number?.toLowerCase().includes(barcode.toLowerCase()) ||
                    p.name?.toLowerCase().includes(barcode.toLowerCase())
                ) || [];

                if (matchingProducts.length === 0 && products?.length > 0) {
                    // If no exact match, use first result from admin's warehouse
                    matchingProducts = [products[0]];
                }

                if (matchingProducts.length > 0) {
                    if (activeTab === 'scan-send') {
                        // SEND MODE: Find product specifically in admin's warehouse
                        const productInMyWarehouse = matchingProducts.find(p =>
                            String(p.warehouse_id) === String(adminWarehouseId)
                        );

                        if (productInMyWarehouse) {
                            setScannedProduct(productInMyWarehouse);
                            setSendQuantity(1);
                            setMessage({ type: 'success', text: `Found: ${productInMyWarehouse.name} (Qty: ${productInMyWarehouse.quantity} in your warehouse)` });
                        } else {
                            // Product exists but not in admin's warehouse
                            const otherLocations = matchingProducts.map(p => p.warehouse_name || `Warehouse ${p.warehouse_id}`).join(', ');
                            setScannedProduct(null);
                            setMessage({ type: 'warning', text: `Product not in your warehouse. Found in: ${otherLocations}. Switch to RECEIVE mode to add copies.` });
                        }
                    } else {
                        // RECEIVE MODE: Check pending movements FIRST, then look for products

                        // Search for pending movement by barcode/part_number destined to admin's warehouse
                        const matchedMovement = movements.find(m =>
                            (m.part_number === barcode || m.barcode === barcode ||
                                m.part_number?.toLowerCase().includes(barcode.toLowerCase()) ||
                                m.barcode?.toLowerCase().includes(barcode.toLowerCase())) &&
                            String(m.to_warehouse_id) === String(adminWarehouseId) &&
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
                            // Product exists but no pending movement - UNEXPECTED
                            const foundProduct = matchingProducts[0];
                            setScannedProduct(foundProduct);
                            setPendingMovement(null);
                            setShowUnexpectedConfirm(true);
                            setReceiveQuantity(1);
                            setMessage({
                                type: 'warning',
                                text: `⚠️ UNEXPECTED: ${foundProduct.name} was not expected. Confirm to add to inventory.`
                            });
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
                            String(m.to_warehouse_id) === String(adminWarehouseId) &&
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
                binNumber: binNumber
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
        // Use adminWarehouseId for bin creation (user's assigned warehouse)
        const warehouseToUse = adminWarehouseId || selectedWarehouse;
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
                // Await the bins refresh to ensure list is updated before hiding loading
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
                warehouse_id: adminWarehouseId,
                bin_number: bin.bin_number,
                limit: 100
            });
            setBinProducts(result.products || result || []);
        } catch (error) {
            console.error('Error fetching bin products:', error);
            setBinProducts([]);
        }
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
        <div className="inventory-page" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '20px' }}>📦 Inventory Management</h1>

            {/* Floating Notification (Mobile-Friendly) */}
            <FloatingNotification
                message={message.text}
                type={message.type}
                onDismiss={() => setMessage({ type: '', text: '' })}
            />

            {/* Tab Navigation - Responsive */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '20px',
                borderBottom: '2px solid #e0e0e0',
                paddingBottom: '10px',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: '4px 4px 0 0',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                            backgroundColor: activeTab === tab.id ? '#1976d2' : '#f5f5f5',
                            color: activeTab === tab.id ? 'white' : '#333',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                            flex: '0 0 auto',
                            minWidth: 'fit-content'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {/* SCAN & SEND / SCAN & RECEIVE TAB - Shows for both, behavior based on activeTab */}
                {(activeTab === 'scan-send' || activeTab === 'scan-receive') && (
                    <div className={activeTab === 'scan-send' ? 'scan-send-tab' : 'scan-receive-tab'}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }} className="md:grid-cols-2">
                            {/* Scanner Section - Mode-specific styling */}
                            <div style={{
                                padding: '20px',
                                background: activeTab === 'scan-send' ? '#fff3e0' : '#e8f5e9',
                                borderRadius: '8px',
                                border: `2px solid ${activeTab === 'scan-send' ? '#ff9800' : '#4caf50'}`
                            }}>
                                <h3 style={{ marginBottom: '15px', color: activeTab === 'scan-send' ? '#e65100' : '#2e7d32' }}>
                                    {activeTab === 'scan-send' ? '📤 Scan Product to SEND' : '📥 Scan Product to RECEIVE'}
                                </h3>
                                <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
                                    {activeTab === 'scan-send'
                                        ? 'Scan a product from YOUR warehouse to send to another warehouse.'
                                        : 'Scan a product to receive. Expected items will auto-match pending shipments.'}
                                </p>
                                <BarcodeScanner
                                    warehouseId={adminWarehouseId}
                                    onScan={(barcode, product) => {
                                        setTransferAction(activeTab === 'scan-send' ? 'send' : 'receive');
                                        handleScan(barcode, product);
                                    }}
                                    autoStart={false}
                                />
                            </div>

                            {/* Scanned Product Details */}
                            <div style={{
                                padding: '20px',
                                background: '#f5f5f5',
                                borderRadius: '8px'
                            }}>
                                <h3 style={{ marginBottom: '15px' }}>Scanned Product</h3>

                                {loading && <p>Loading...</p>}

                                {scannedProduct ? (
                                    <div>
                                        <BarcodeGenerator
                                            barcode={scannedProduct.barcode}
                                            productName={scannedProduct.name}
                                            partNumber={scannedProduct.part_number}
                                            price={scannedProduct.price}
                                            labelSize="small"
                                        />

                                        <div style={{ marginTop: '20px', padding: '15px', background: 'white', borderRadius: '4px' }}>
                                            <p><strong>Name:</strong> {scannedProduct.name}</p>
                                            <p><strong>Part #:</strong> {scannedProduct.part_number || 'N/A'}</p>
                                            <p><strong>Price:</strong> ${parseFloat(scannedProduct.price).toFixed(2)}</p>
                                            <p><strong>Quantity:</strong> <span style={{ color: scannedProduct.quantity > 0 ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>{scannedProduct.quantity} in stock</span></p>
                                            <p><strong>Current Location:</strong> {scannedProduct.warehouse_name || 'Not assigned'}</p>
                                            <p><strong>Bin:</strong> {scannedProduct.bin_number || 'Not assigned'}</p>
                                        </div>

                                        {/* Mode-specific Actions Section */}
                                        <div style={{ marginTop: '20px', padding: '15px', background: activeTab === 'scan-send' ? '#fff3e0' : '#e8f5e9', borderRadius: '8px', border: `1px solid ${activeTab === 'scan-send' ? '#ff9800' : '#4caf50'}` }}>
                                            <h4 style={{ marginBottom: '15px', color: activeTab === 'scan-send' ? '#e65100' : '#2e7d32' }}>
                                                {activeTab === 'scan-send' ? '📤 Send to Warehouse' : '📥 Receive at Your Warehouse'}
                                            </h4>

                                            {/* Only show detect location for SEND mode */}
                                            {activeTab === 'scan-send' && (
                                                <div style={{ marginBottom: '15px' }}>
                                                    <button
                                                        onClick={detectUserLocation}
                                                        style={{
                                                            padding: '10px 15px',
                                                            backgroundColor: '#9c27b0',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontWeight: 'bold',
                                                            width: '100%',
                                                            marginBottom: '10px'
                                                        }}
                                                    >
                                                        📍 Detect My Location & Find Nearest Warehouse
                                                    </button>

                                                    {/* Show nearest warehouse info */}
                                                    {nearestWarehouse && (
                                                        <div style={{
                                                            padding: '10px',
                                                            background: '#e8f5e9',
                                                            borderRadius: '4px',
                                                            marginBottom: '10px',
                                                            border: '1px solid #4caf50'
                                                        }}>
                                                            <strong style={{ color: '#2e7d32' }}>✅ Nearest: {nearestWarehouse.name}</strong>
                                                            <span style={{ marginLeft: '10px', color: '#666' }}>
                                                                ({nearestWarehouse.distance} km away)
                                                            </span>
                                                        </div>
                                                    )}

                                                    {locationError && (
                                                        <div style={{
                                                            padding: '10px',
                                                            background: '#ffebee',
                                                            borderRadius: '4px',
                                                            color: '#c62828',
                                                            fontSize: '13px'
                                                        }}>
                                                            ⚠️ {locationError}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Warehouse Selection - Only show dropdown for SEND tab */}
                                            {activeTab === 'scan-send' ? (
                                                <div style={{ marginBottom: '15px' }}>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                                        Destination Warehouse:
                                                    </label>
                                                    <select
                                                        value={selectedWarehouse}
                                                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px',
                                                            borderRadius: '4px',
                                                            border: '1px solid #ddd',
                                                            background: 'white'
                                                        }}
                                                    >
                                                        <option value="">-- Select Warehouse --</option>
                                                        {warehouses
                                                            .filter(w => w.id !== scannedProduct?.warehouse_id)
                                                            .map(w => (
                                                                <option key={w.id} value={w.id}>
                                                                    {w.name} {w.location ? `(${w.location})` : ''}
                                                                    {nearestWarehouse && nearestWarehouse.id === w.id ? ' ⭐ NEAREST' : ''}
                                                                </option>
                                                            ))
                                                        }
                                                    </select>

                                                    {/* Remaining Stock Display (qty input removed - each scan = 1 item) */}
                                                    <div style={{ marginTop: '15px', padding: '15px', background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)', borderRadius: '8px', border: '1px solid #B8860B' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                                            <div>
                                                                <span style={{ color: '#B8860B', fontWeight: 'bold', fontSize: '14px' }}>📦 Stock in Warehouse:</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                <span style={{ color: '#4caf50', fontWeight: 'bold', fontSize: '24px' }}>
                                                                    {scannedProduct?.quantity || 0}
                                                                </span>
                                                                <span style={{ color: '#F5F0E1', fontSize: '12px' }}>remaining</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
                                                            💡 Each scan sends 1 item. Scan same product again to send more.
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    marginBottom: '15px',
                                                    padding: '15px',
                                                    backgroundColor: '#e8f5e9',
                                                    borderRadius: '8px',
                                                    border: '1px solid #4caf50'
                                                }}>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#2e7d32' }}>
                                                        🏢 Receiving at Your Warehouse:
                                                    </label>
                                                    {adminWarehouseId ? (
                                                        <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1b5e20' }}>
                                                            {warehouses.find(w => String(w.id) === String(adminWarehouseId))?.name || 'Your assigned warehouse'}
                                                        </p>
                                                    ) : (
                                                        <p style={{ margin: 0, color: '#c62828' }}>
                                                            ⚠️ No warehouse assigned to your account. Contact administrator.
                                                        </p>
                                                    )}

                                                    {/* Bin Selector for Receive Mode */}
                                                    {adminWarehouseId && adminBins.length > 0 && (
                                                        <div style={{ marginTop: '15px' }}>
                                                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#2e7d32' }}>
                                                                📦 Assign to Bin:
                                                            </label>
                                                            <select
                                                                value={selectedBin}
                                                                onChange={(e) => setSelectedBin(e.target.value)}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '10px',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid #4caf50',
                                                                    backgroundColor: 'white'
                                                                }}
                                                            >
                                                                <option value="">-- Select Bin (Optional) --</option>
                                                                {adminBins.map(bin => (
                                                                    <option key={bin.id} value={bin.bin_number}>
                                                                        {bin.bin_number} {bin.description ? `(${bin.description})` : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                    {adminWarehouseId && adminBins.length === 0 && (
                                                        <p style={{ marginTop: '10px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                                                            No bins configured for this warehouse. Product will be received without bin assignment.
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Action Button */}
                                            <button
                                                onClick={async () => {
                                                    if (activeTab === 'scan-send' && !selectedWarehouse) {
                                                        setMessage({ type: 'error', text: 'Please select a destination warehouse' });
                                                        return;
                                                    }
                                                    if (activeTab === 'scan-receive' && !adminWarehouseId) {
                                                        setMessage({ type: 'error', text: 'No warehouse assigned to your account. Contact administrator.' });
                                                        return;
                                                    }
                                                    setLoading(true);
                                                    try {
                                                        if (activeTab === 'scan-send') {
                                                            // Validate stock (at least 1 available)
                                                            if (scannedProduct.quantity < 1) {
                                                                setMessage({ type: 'error', text: `Cannot send - no stock available (0 remaining).` });
                                                                setLoading(false);
                                                                return;
                                                            }
                                                            // Send: each scan sends exactly 1 item
                                                            await movementsAPI.ship(
                                                                [scannedProduct.id],
                                                                scannedProduct.warehouse_id,
                                                                selectedWarehouse,
                                                                `Shipped 1 via barcode scan`,
                                                                1  // Always send 1 per scan
                                                            );
                                                            const destWarehouse = warehouses.find(w => String(w.id) === selectedWarehouse);
                                                            setMessage({
                                                                type: 'success',
                                                                text: `✅ 1 unit shipped to ${destWarehouse?.name || 'destination'}! (${scannedProduct.quantity - 1} remaining)`
                                                            });
                                                        } else {
                                                            // RECEIVE MODE: Handle expected vs unexpected
                                                            const myWarehouse = warehouses.find(w => String(w.id) === String(adminWarehouseId));

                                                            if (pendingMovement) {
                                                                // EXPECTED: Complete the movement
                                                                await movementsAPI.receive({
                                                                    movementId: pendingMovement.id,
                                                                    binNumber: selectedBin || null,
                                                                    warehouseId: adminWarehouseId
                                                                });
                                                                setMessage({
                                                                    type: 'success',
                                                                    text: `✅ Received ${receiveQuantity} unit(s) from ${pendingMovement.from_warehouse_name}${selectedBin ? ` (Bin: ${selectedBin})` : ''}!`
                                                                });
                                                                setPendingMovement(null);
                                                            } else if (showUnexpectedConfirm) {
                                                                // UNEXPECTED: Add to inventory anyway (admin confirmed)
                                                                await movementsAPI.addUnexpected({
                                                                    partNumber: scannedProduct.part_number,
                                                                    warehouseId: adminWarehouseId,
                                                                    binNumber: selectedBin || null,
                                                                    quantity: receiveQuantity
                                                                });
                                                                setMessage({
                                                                    type: 'success',
                                                                    text: `✅ Added ${receiveQuantity} unexpected unit(s) to ${myWarehouse?.name || 'your warehouse'}${selectedBin ? ` (Bin: ${selectedBin})` : ''}!`
                                                                });
                                                                setShowUnexpectedConfirm(false);
                                                            }
                                                            setSelectedBin('');
                                                            setReceiveQuantity(1);
                                                            fetchMovements(); // Refresh movements list
                                                        }
                                                        // Refresh product data
                                                        setScannedProduct(null);
                                                    } catch (err) {
                                                        setMessage({ type: 'error', text: `Failed to ${transferAction} product` });
                                                    }
                                                    setLoading(false);
                                                }}
                                                disabled={loading || (activeTab === 'scan-send' && !selectedWarehouse) || (activeTab === 'scan-receive' && !adminWarehouseId)}
                                                style={{
                                                    width: '100%',
                                                    padding: '15px',
                                                    backgroundColor: activeTab === 'scan-send' ? '#ff9800' : (showUnexpectedConfirm ? '#f44336' : '#4caf50'),
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: loading ? 'not-allowed' : 'pointer',
                                                    opacity: loading || (activeTab === 'scan-send' && !selectedWarehouse) || (activeTab === 'scan-receive' && !adminWarehouseId) ? 0.6 : 1,
                                                    fontWeight: 'bold',
                                                    fontSize: '16px'
                                                }}
                                            >
                                                {loading ? 'Processing...' : (
                                                    activeTab === 'scan-send' ? '📤 SEND TO WAREHOUSE' : (
                                                        showUnexpectedConfirm ? '⚠️ CONFIRM & ADD UNEXPECTED' : '📥 RECEIVE EXPECTED SHIPMENT'
                                                    )
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : notFoundBarcode ? (
                                    /* Product Not Found - Show Add Options */
                                    <div style={{
                                        padding: '20px',
                                        background: '#fff3e0',
                                        border: '1px solid #ffb74d',
                                        borderRadius: '8px'
                                    }}>
                                        <h4 style={{ color: '#e65100', marginBottom: '15px' }}>
                                            ⚠️ Product Not Found
                                        </h4>
                                        <p style={{ marginBottom: '10px', color: '#333' }}>
                                            <strong>Scanned Barcode:</strong>
                                            <span style={{ fontFamily: 'monospace', marginLeft: '10px', padding: '4px 8px', background: '#fff', borderRadius: '4px' }}>
                                                {notFoundBarcode}
                                            </span>
                                        </p>
                                        <p style={{ color: '#666', marginBottom: '20px' }}>
                                            This product is not in the inventory. Choose an action:
                                        </p>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <a
                                                href={`/admin/products/add?part_number=${encodeURIComponent(notFoundBarcode)}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '12px 20px',
                                                    backgroundColor: '#4caf50',
                                                    color: 'white',
                                                    textDecoration: 'none',
                                                    borderRadius: '8px',
                                                    fontWeight: 'bold'
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
                                                    backgroundColor: '#e0e0e0',
                                                    color: '#333',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✖️ Cancel / Scan Another
                                            </button>
                                        </div>

                                        <div style={{ marginTop: '20px', padding: '15px', background: 'white', borderRadius: '6px', fontSize: '14px', color: '#666' }}>
                                            <strong style={{ color: '#1976d2' }}>💡 Tip:</strong> If this is an existing product that should be in inventory,
                                            check if the part number or barcode is entered correctly in the product details.
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ color: '#666' }}>Scan a barcode to see product details</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* MOVEMENTS TAB */}
                {activeTab === 'movements' && (
                    <div className="movements-tab">
                        <h3>In-Transit Shipments ({movements.length})</h3>

                        {movements.length === 0 ? (
                            <p style={{ color: '#666', padding: '20px' }}>No shipments in transit</p>
                        ) : (
                            <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', minWidth: '800px' }}>
                                    <thead>
                                        <tr style={{ background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>Product</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>Part#</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>From</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>To</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>Status</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>Shipped</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>Duration</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>Dispatcher</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #B8860B', color: '#B8860B' }}>Receiver</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.map(m => {
                                            // Calculate transit duration
                                            const shippedDate = m.shipped_at ? new Date(m.shipped_at) : new Date(m.created_at);
                                            const now = new Date();
                                            const endDate = m.status === 'completed' && m.received_at ? new Date(m.received_at) : now;
                                            const diffMs = endDate - shippedDate;
                                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                            const durationText = diffDays > 0 ? `${diffDays}d ${diffHours}h` : `${diffHours}h`;

                                            return (
                                                <tr key={m.id} style={{ borderBottom: '1px solid rgba(184, 134, 11, 0.3)', background: '#1a1a1a' }}>
                                                    <td style={{ padding: '12px', color: '#F5F0E1' }}>{m.product_name}</td>
                                                    <td style={{ padding: '12px', fontFamily: 'monospace', color: '#B8860B' }}>{m.part_number || m.barcode}</td>
                                                    <td style={{ padding: '12px', color: '#F5F0E1' }}>{m.from_warehouse_name}</td>
                                                    <td style={{ padding: '12px', color: '#F5F0E1' }}>{m.to_warehouse_name}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            background: m.status === 'in_transit' ? 'rgba(184, 134, 11, 0.3)' : 'rgba(76, 175, 80, 0.3)',
                                                            color: m.status === 'in_transit' ? '#B8860B' : '#4caf50',
                                                            border: `1px solid ${m.status === 'in_transit' ? '#B8860B' : '#4caf50'}`
                                                        }}>
                                                            {m.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', color: '#888', fontSize: '12px' }}>
                                                        {shippedDate.toLocaleString(undefined, {
                                                            dateStyle: 'short',
                                                            timeStyle: 'short',
                                                            timeZoneName: 'short'
                                                        })}
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '12px' }}>
                                                        <span style={{
                                                            color: m.status === 'in_transit' ? (diffDays > 3 ? '#f44336' : '#B8860B') : '#4caf50',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {durationText}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', color: '#4caf50', fontSize: '12px' }}>
                                                        {m.created_by_name || '-'}
                                                    </td>
                                                    <td style={{ padding: '12px', color: '#4caf50', fontSize: '12px' }}>
                                                        {m.received_by_name || (m.status === 'completed' ? 'Unknown' : '-')}
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

                {/* WAREHOUSE INVENTORY TAB - Shows products in current warehouse binwise */}
                {activeTab === 'warehouse-inventory' && (
                    <div className="warehouse-inventory-tab">
                        <div style={{ marginBottom: '20px', padding: '20px', background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)', borderRadius: '12px', border: '1px solid #B8860B' }}>
                            <strong style={{ color: '#B8860B', fontFamily: "'Oswald', sans-serif", fontSize: '18px' }}>📦 Your Warehouse:</strong>
                            <span style={{ marginLeft: '10px', color: '#F5F0E1', fontSize: '18px' }}>{warehouses.find(w => String(w.id) === String(adminWarehouseId))?.name || 'Not assigned'}</span>
                        </div>

                        {/* Warehouse selector only for Superadmin */}
                        {user?.role === 'superadmin' && (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ marginRight: '10px', color: '#F5F0E1' }}>View Other Warehouse:</label>
                                <select
                                    value={selectedWarehouse || adminWarehouseId || ''}
                                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #B8860B', backgroundColor: '#1a1a1a', color: '#F5F0E1' }}
                                >
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Bin/Product View Toggle */}
                        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ color: '#B8860B', fontWeight: 'bold' }}>View:</span>
                            <button
                                onClick={() => {
                                    setInventoryViewMode('bin');
                                    if (adminWarehouseId) fetchBinInventory(adminWarehouseId, binInventorySearch);
                                }}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '6px',
                                    border: inventoryViewMode === 'bin' ? '2px solid #B8860B' : '1px solid #555',
                                    background: inventoryViewMode === 'bin' ? 'linear-gradient(135deg, #B8860B, #8B6914)' : '#1a1a1a',
                                    color: inventoryViewMode === 'bin' ? '#1a1a1a' : '#888',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontFamily: "'Oswald', sans-serif"
                                }}
                            >
                                📦 By Bin
                            </button>
                            <button
                                onClick={() => {
                                    setInventoryViewMode('product');
                                    if (adminWarehouseId) fetchProductInventory(adminWarehouseId, binInventorySearch);
                                }}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '6px',
                                    border: inventoryViewMode === 'product' ? '2px solid #B8860B' : '1px solid #555',
                                    background: inventoryViewMode === 'product' ? 'linear-gradient(135deg, #B8860B, #8B6914)' : '#1a1a1a',
                                    color: inventoryViewMode === 'product' ? '#1a1a1a' : '#888',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontFamily: "'Oswald', sans-serif"
                                }}
                            >
                                🔧 By Product
                            </button>
                        </div>

                        {/* Note about bin creation */}
                        <div style={{ marginBottom: '15px', padding: '12px', background: 'rgba(184, 134, 11, 0.1)', borderRadius: '8px', border: '1px dashed #B8860B' }}>
                            <span style={{ color: '#888', fontSize: '12px' }}>💡 To create or manage bins, go to the </span>
                            <button
                                onClick={() => setActiveTab('bin-management')}
                                style={{ background: 'none', border: 'none', color: '#B8860B', cursor: 'pointer', textDecoration: 'underline', fontSize: '12px' }}
                            >
                                Bin Management
                            </button>
                            <span style={{ color: '#888', fontSize: '12px' }}> tab</span>
                        </div>

                        {/* BIN VIEW MODE */}
                        {inventoryViewMode === 'bin' && (
                            <>
                                {/* Bins Grid - Clickable to view products */}
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
                                                padding: '20px',
                                                background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
                                                border: '2px solid #B8860B',
                                                borderRadius: '12px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s, box-shadow 0.2s'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(184, 134, 11, 0.4)'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                                        >
                                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#B8860B', fontFamily: "'Oswald', sans-serif" }}>
                                                {bin.bin_number}
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#4caf50', marginTop: '8px', fontWeight: 'bold' }}>
                                                {bin.product_count || 0} items
                                            </div>
                                            {bin.description && (
                                                <div style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>
                                                    {bin.description}
                                                </div>
                                            )}
                                            <div style={{ fontSize: '10px', color: '#555', marginTop: '8px' }}>
                                                Click to view products
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Bin Inventory Table - Gold/Mustard Theme */}
                                <div style={{ marginTop: '30px', padding: '25px', background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)', borderRadius: '12px', border: '1px solid #B8860B' }}>
                                    <h4 style={{ marginBottom: '20px', color: '#B8860B', fontFamily: "'Oswald', sans-serif", fontSize: '18px' }}>📋 Products by Bin</h4>

                                    {/* Live Search */}
                                    <div style={{ marginBottom: '15px' }}>
                                        <input
                                            type="text"
                                            placeholder="🔍 Search by part number, name, or bin (live search)..."
                                            value={binInventorySearch}
                                            onChange={(e) => {
                                                setBinInventorySearch(e.target.value);
                                                // Live search - trigger on every change
                                                if (adminWarehouseId) {
                                                    fetchBinInventory(adminWarehouseId, e.target.value);
                                                }
                                            }}
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
                                    </div>

                                    {/* Loading state while auto-fetching */}
                                    {binInventory.length === 0 && !binInventoryLoading && adminWarehouseId && (
                                        <div style={{ textAlign: 'center', padding: '30px', color: '#B8860B' }}>
                                            Loading inventory...
                                        </div>
                                    )}

                                    {/* Gross Total Summary */}
                                    {binInventory.length > 0 && (
                                        <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(184, 134, 11, 0.15)', borderRadius: '8px', border: '1px solid #B8860B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                            <div style={{ color: '#F5F0E1' }}>
                                                <span style={{ fontSize: '14px' }}>Total Bins:</span>
                                                <span style={{ marginLeft: '10px', fontWeight: 'bold', color: '#B8860B', fontSize: '18px' }}>{binInventory.length}</span>
                                            </div>
                                            <div style={{ color: '#F5F0E1' }}>
                                                <span style={{ fontSize: '14px' }}>Gross Total Items:</span>
                                                <span style={{ marginLeft: '10px', fontWeight: 'bold', color: '#4caf50', fontSize: '20px' }}>
                                                    {binInventory.reduce((sum, item) => sum + (parseInt(item.total_quantity) || 0), 0)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Table */}
                                    {binInventoryLoading ? (
                                        <p style={{ textAlign: 'center', padding: '30px', color: '#B8860B' }}>Loading inventory...</p>
                                    ) : binInventory.length > 0 ? (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(184, 134, 11, 0.3)' }}>
                                                        <th style={{ padding: '14px', textAlign: 'left', color: '#B8860B', fontFamily: "'Oswald', sans-serif", borderBottom: '2px solid #B8860B' }}>Bin</th>
                                                        <th style={{ padding: '14px', textAlign: 'left', color: '#B8860B', fontFamily: "'Oswald', sans-serif", borderBottom: '2px solid #B8860B' }}>Part Numbers</th>
                                                        <th style={{ padding: '14px', textAlign: 'right', color: '#B8860B', fontFamily: "'Oswald', sans-serif", borderBottom: '2px solid #B8860B' }}>Total Items</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {binInventory.map((item, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(184, 134, 11, 0.3)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.2)' }}>
                                                            <td style={{ padding: '14px', fontWeight: 'bold', color: '#B8860B' }}>{item.bin_number || 'No Bin'}</td>
                                                            <td style={{ padding: '14px', maxWidth: '400px', wordBreak: 'break-word', color: '#F5F0E1' }}>{item.part_numbers}</td>
                                                            <td style={{ padding: '14px', textAlign: 'right', fontWeight: 'bold', color: '#4caf50', fontSize: '16px' }}>{item.total_quantity}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : null}
                                </div>
                            </>
                        )}

                        {/* PRODUCT VIEW MODE */}
                        {inventoryViewMode === 'product' && (
                            <div style={{ padding: '25px', background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)', borderRadius: '12px', border: '1px solid #B8860B' }}>
                                <h4 style={{ marginBottom: '20px', color: '#B8860B', fontFamily: "'Oswald', sans-serif", fontSize: '18px' }}>🔧 Products in Warehouse</h4>

                                {/* Live Search for Products */}
                                <div style={{ marginBottom: '15px' }}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Search products..."
                                        value={binInventorySearch}
                                        onChange={(e) => {
                                            setBinInventorySearch(e.target.value);
                                            if (adminWarehouseId) fetchProductInventory(adminWarehouseId, e.target.value);
                                        }}
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
                                </div>

                                {/* Product Summary */}
                                {productInventory.length > 0 && (
                                    <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(184, 134, 11, 0.15)', borderRadius: '8px', border: '1px solid #B8860B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                        <div style={{ color: '#F5F0E1' }}>
                                            <span style={{ fontSize: '14px' }}>Total Products:</span>
                                            <span style={{ marginLeft: '10px', fontWeight: 'bold', color: '#B8860B', fontSize: '18px' }}>{productInventory.length}</span>
                                        </div>
                                        <div style={{ color: '#F5F0E1' }}>
                                            <span style={{ fontSize: '14px' }}>Total Stock:</span>
                                            <span style={{ marginLeft: '10px', fontWeight: 'bold', color: '#4caf50', fontSize: '20px' }}>
                                                {productInventory.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Products Table */}
                                {productInventoryLoading ? (
                                    <p style={{ textAlign: 'center', padding: '30px', color: '#B8860B' }}>Loading products...</p>
                                ) : productInventory.length > 0 ? (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(184, 134, 11, 0.3)' }}>
                                                    <th style={{ padding: '14px', textAlign: 'left', color: '#B8860B', borderBottom: '2px solid #B8860B' }}>Part Number</th>
                                                    <th style={{ padding: '14px', textAlign: 'left', color: '#B8860B', borderBottom: '2px solid #B8860B' }}>Name</th>
                                                    <th style={{ padding: '14px', textAlign: 'left', color: '#B8860B', borderBottom: '2px solid #B8860B' }}>Bin</th>
                                                    <th style={{ padding: '14px', textAlign: 'right', color: '#B8860B', borderBottom: '2px solid #B8860B' }}>Qty</th>
                                                    <th style={{ padding: '14px', textAlign: 'right', color: '#B8860B', borderBottom: '2px solid #B8860B' }}>Price</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {productInventory.map((p, idx) => (
                                                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(184, 134, 11, 0.3)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.2)' }}>
                                                        <td style={{ padding: '14px', fontWeight: 'bold', color: '#B8860B' }}>{p.part_number || '-'}</td>
                                                        <td style={{ padding: '14px', color: '#F5F0E1' }}>{p.name}</td>
                                                        <td style={{ padding: '14px', color: '#888' }}>{p.bin_number || 'No Bin'}</td>
                                                        <td style={{ padding: '14px', textAlign: 'right', fontWeight: 'bold', color: '#4caf50', fontSize: '16px' }}>{p.quantity}</td>
                                                        <td style={{ padding: '14px', textAlign: 'right', color: '#F5F0E1' }}>${parseFloat(p.price || 0).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p style={{ textAlign: 'center', padding: '30px', color: '#888' }}>No products. Click "By Product" to load.</p>
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
                            <p style={{ color: '#888', fontSize: '12px', marginBottom: '15px' }}>Click on a bin to view its contents</p>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                gap: '12px'
                            }}>
                                {bins.map(bin => (
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
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '80vh',
                            overflow: 'auto'
                        }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ color: '#B8860B', fontFamily: "'Oswald', sans-serif", margin: 0 }}>
                                    📦 Bin {selectedBinOverlay.bin_number}
                                </h3>
                                <button
                                    onClick={() => setSelectedBinOverlay(null)}
                                    style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer' }}
                                >×</button>
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
                                                <div>
                                                    <div style={{ fontWeight: 'bold', color: '#F5F0E1' }}>{p.name || p.part_number}</div>
                                                    <div style={{ fontSize: '12px', color: '#B8860B' }}>{p.part_number}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#4caf50', fontSize: '18px' }}>{p.quantity}</div>
                                                    <div style={{ fontSize: '10px', color: '#888' }}>in stock</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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

                                    {/* Display Coordinates */}
                                    {(w.latitude && w.longitude) ? (
                                        <div style={{ marginTop: '10px', padding: '8px', background: '#e3f2fd', borderRadius: '4px' }}>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#1565c0' }}>
                                                🌐 Lat: {parseFloat(w.latitude).toFixed(4)}, Lng: {parseFloat(w.longitude).toFixed(4)}
                                            </p>
                                            <a
                                                href={`https://www.google.com/maps?q=${w.latitude},${w.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ fontSize: '11px', color: '#1976d2' }}
                                            >
                                                🗺️ Open in Google Maps
                                            </a>
                                        </div>
                                    ) : (
                                        <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                                            📍 No GPS coordinates set
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
