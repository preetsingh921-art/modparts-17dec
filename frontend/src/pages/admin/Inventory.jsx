import { useState, useEffect } from 'react';
import { barcodeAPI, warehouseAPI, binAPI, movementsAPI } from '../../api/inventory';
import BarcodeScanner from '../../components/inventory/BarcodeScanner';
import BarcodeGenerator from '../../components/inventory/BarcodeGenerator';

/**
 * Inventory Management Page
 * Main admin page for barcode scanning, warehouse management, and inventory tracking
 */
const Inventory = () => {
    const [activeTab, setActiveTab] = useState('scan');
    const [warehouses, setWarehouses] = useState([]);
    const [bins, setBins] = useState([]);
    const [movements, setMovements] = useState([]);
    const [scannedProduct, setScannedProduct] = useState(null);
    const [notFoundBarcode, setNotFoundBarcode] = useState(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
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
        status: 'active'
    });

    // Fetch initial data
    useEffect(() => {
        fetchWarehouses();
        fetchMovements();
    }, []);

    useEffect(() => {
        if (selectedWarehouse) {
            fetchBins(selectedWarehouse);
        }
    }, [selectedWarehouse]);

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
            const data = await movementsAPI.getAll({ status: 'in_transit' });
            setMovements(data.movements || []);
        } catch (error) {
            console.error('Error fetching movements:', error);
        }
    };

    const handleScan = async (barcode, product = null) => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        setNotFoundBarcode(null); // Reset not found state

        try {
            // If product is already provided by scanner, use it directly
            if (product) {
                setScannedProduct(product);
                setMessage({ type: 'success', text: `Found: ${product.name}` });
            } else {
                // Fallback: search for product by barcode/part_number
                const { products } = await import('../../api/products').then(m => m.getProducts({ search: barcode, limit: 1 }));
                const foundProduct = products?.find(p => p.part_number === barcode || p.barcode === barcode) || products?.[0];

                if (foundProduct) {
                    setScannedProduct(foundProduct);
                    setMessage({ type: 'success', text: `Found: ${foundProduct.name}` });
                } else {
                    // Track the not-found barcode for "Add to Inventory" flow
                    setNotFoundBarcode(barcode);
                    setScannedProduct(null);
                    setMessage({ type: 'warning', text: `Product not found for barcode: ${barcode}` });
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
        if (!selectedWarehouse || !newBin.bin_number) return;

        setLoading(true);
        try {
            const result = await binAPI.create({
                warehouse_id: selectedWarehouse,
                ...newBin
            });

            setMessage({ type: 'success', text: 'Bin created successfully' });
            setNewBin({ bin_number: '', description: '', capacity: 100 });
            fetchBins(selectedWarehouse);
        } catch (error) {
            setMessage({ type: 'error', text: 'Error creating bin' });
        }
        setLoading(false);
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
            status: warehouse.status || 'active'
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
        { id: 'scan', label: '📱 Scan & Receive', icon: '📱' },
        { id: 'movements', label: '📦 Movements', icon: '📦' },
        { id: 'bins', label: '🗃️ Bins', icon: '🗃️' },
        { id: 'warehouses', label: '🏭 Warehouses', icon: '🏭' },
    ];

    return (
        <div className="inventory-page" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '20px' }}>📦 Inventory Management</h1>

            {/* Message Display */}
            {message.text && (
                <div style={{
                    padding: '10px 20px',
                    marginBottom: '20px',
                    borderRadius: '4px',
                    backgroundColor: message.type === 'success' ? '#e8f5e9' : message.type === 'warning' ? '#fff3e0' : '#ffebee',
                    color: message.type === 'success' ? '#2e7d32' : message.type === 'warning' ? '#e65100' : '#c62828',
                    border: `1px solid ${message.type === 'success' ? '#4caf50' : message.type === 'warning' ? '#ffb74d' : '#ef5350'}`
                }}>
                    {message.text}
                </div>
            )}

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
                {/* SCAN & RECEIVE TAB */}
                {activeTab === 'scan' && (
                    <div className="scan-receive-tab">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }} className="md:grid-cols-2">
                            {/* Scanner Section */}
                            <div style={{
                                padding: '20px',
                                background: '#f5f5f5',
                                borderRadius: '8px'
                            }}>
                                <h3 style={{ marginBottom: '15px' }}>Scan Barcode</h3>
                                <BarcodeScanner onScan={handleScan} autoStart={false} />
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
                                            <p><strong>Current Location:</strong> {scannedProduct.warehouse_name || 'Not assigned'}</p>
                                            <p><strong>Bin:</strong> {scannedProduct.bin_number || 'Not assigned'}</p>
                                        </div>

                                        {/* Receive / Assign Bin */}
                                        <div style={{ marginTop: '15px' }}>
                                            <h4>Assign to Bin:</h4>
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                                                {bins.map(bin => (
                                                    <button
                                                        key={bin.id}
                                                        onClick={() => handleReceive(bin.bin_number)}
                                                        style={{
                                                            padding: '10px 15px',
                                                            border: '1px solid #1976d2',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            background: 'white'
                                                        }}
                                                    >
                                                        {bin.bin_number}
                                                    </button>
                                                ))}
                                            </div>
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
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', minWidth: '600px' }}>
                                    <thead>
                                        <tr style={{ background: '#f5f5f5' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Product</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Barcode</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>From</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>To</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Status</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Shipped</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.map(m => (
                                            <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '12px' }}>{m.product_name}</td>
                                                <td style={{ padding: '12px', fontFamily: 'monospace' }}>{m.barcode}</td>
                                                <td style={{ padding: '12px' }}>{m.from_warehouse_name}</td>
                                                <td style={{ padding: '12px' }}>{m.to_warehouse_name}</td>
                                                <td style={{ padding: '12px' }}>
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        background: m.status === 'in_transit' ? '#fff3e0' : '#e8f5e9',
                                                        color: m.status === 'in_transit' ? '#e65100' : '#2e7d32'
                                                    }}>
                                                        {m.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px' }}>{new Date(m.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* BINS TAB */}
                {activeTab === 'bins' && (
                    <div className="bins-tab">
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ marginRight: '10px' }}>Warehouse:</label>
                            <select
                                value={selectedWarehouse}
                                onChange={(e) => setSelectedWarehouse(e.target.value)}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: '#333' }}
                            >
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Create Bin Form - Responsive */}
                        <form onSubmit={handleCreateBin} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            marginBottom: '20px',
                            padding: '15px',
                            background: '#f5f5f5',
                            borderRadius: '4px'
                        }} className="md:flex-row">
                            <input
                                type="text"
                                placeholder="Bin # (e.g., A-01)"
                                value={newBin.bin_number}
                                onChange={(e) => setNewBin({ ...newBin, bin_number: e.target.value })}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: '#333' }}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Description"
                                value={newBin.description}
                                onChange={(e) => setNewBin({ ...newBin, description: e.target.value })}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1, backgroundColor: 'white', color: '#333' }}
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#4caf50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                + Add Bin
                            </button>
                        </form>

                        {/* Bins Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: '15px'
                        }}>
                            {bins.map(bin => (
                                <div
                                    key={bin.id}
                                    style={{
                                        padding: '15px',
                                        background: 'white',
                                        border: '2px solid #1976d2',
                                        borderRadius: '8px',
                                        textAlign: 'center'
                                    }}
                                >
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                                        {bin.bin_number}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                        {bin.product_count || 0} items
                                    </div>
                                    {bin.description && (
                                        <div style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                                            {bin.description}
                                        </div>
                                    )}
                                </div>
                            ))}
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
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Notes</label>
                                                <textarea
                                                    value={warehouseForm.notes}
                                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, notes: e.target.value })}
                                                    rows={3}
                                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', resize: 'vertical', backgroundColor: 'white', color: '#333' }}
                                                />
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
