import React, { useState, useEffect } from 'react';
import { movementsAPI } from '../../api/inventory';

/**
 * ItemMovementAuditModal
 * Displays a complete chronological audit trail and movement history for an inventory item,
 * including inter-warehouse transfers, manual count adjustments, sales deductions, and bin shifts.
 */
export default function ItemMovementAuditModal({
  isOpen,
  onClose,
  product = null,
  onOpenSlip = null
}) {
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && product) {
      fetchHistory();
    }
  }, [isOpen, product]);

  const fetchHistory = async () => {
    if (!product) return;
    setLoading(true);
    setError(null);
    try {
      const res = await movementsAPI.getProductHistory({
        productId: product.id,
        partNumber: product.part_number || product.barcode,
        barcode: product.barcode
      });
      setMovements(res.movements || []);
    } catch (err) {
      console.error('Error fetching product movement history:', err);
      setError(err.message || 'Failed to load movement audit trail');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  // Filter movements by type if selected
  const filteredMovements = movements.filter(m => {
    if (filterType === 'all') return true;
    if (filterType === 'transfer') return m.movement_type === 'transfer';
    if (filterType === 'adjustment') return m.movement_type === 'adjustment';
    if (filterType === 'sale') return m.movement_type === 'sale';
    return true;
  });

  // Calculate current stock summary
  const warehouseBreakdown = Array.isArray(product.warehouse_stock) ? product.warehouse_stock : [];
  const totalStock = product.total_stock !== undefined ? product.total_stock : product.quantity;

  const getMovementBadge = (type) => {
    switch (type) {
      case 'transfer':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-900/60 text-blue-300 border border-blue-700/60">🚚 Transfer</span>;
      case 'adjustment':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-900/60 text-amber-300 border border-amber-700/60">⚙️ Manual Adjustment</span>;
      case 'sale':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-900/60 text-purple-300 border border-purple-700/60">🛒 Customer Sale</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">📦 Movement</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 text-slate-100 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700 overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-amber-400 font-mono tracking-tight">
                {product.part_number || product.barcode || 'PART SKU'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                Audit Trail
              </span>
            </div>
            <h3 className="text-base font-semibold text-slate-200 mt-1">
              {product.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
              <span>Barcode: <strong className="font-mono text-slate-300">{product.barcode || product.part_number || '-'}</strong></span>
              <span>•</span>
              <span>Total Available Units: <strong className="text-emerald-400 font-bold">{totalStock}</strong></span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Location Stock Breakdown Summary Banner */}
        <div className="px-5 py-3 bg-slate-800/80 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Physical Locations:</span>
            {warehouseBreakdown.length > 0 ? (
              warehouseBreakdown.map((wh, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 font-medium text-slate-200 flex items-center gap-1.5"
                >
                  <span>{wh.country === 'IND' ? '🇮🇳' : wh.country === 'CAN' ? '🇨🇦' : '🏢'}</span>
                  <span>{wh.warehouse_name || 'Warehouse'}:</span>
                  <strong className={wh.quantity > 0 ? 'text-amber-400' : 'text-slate-500'}>{wh.quantity} units</strong>
                  {wh.bin_number && <span className="text-[10px] text-slate-400 font-mono">({wh.bin_number})</span>}
                </span>
              ))
            ) : (
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-slate-400">
                {product.warehouse_name ? `📍 ${product.warehouse_name}: ${product.quantity} units` : 'Unassigned Floor Intake (No active warehouse assigned)'}
              </span>
            )}
          </div>

          {/* Quick Filter Controls */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded font-medium transition ${filterType === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All ({movements.length})
            </button>
            <button
              onClick={() => setFilterType('transfer')}
              className={`px-2.5 py-1 rounded font-medium transition ${filterType === 'transfer' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Transfers
            </button>
            <button
              onClick={() => setFilterType('adjustment')}
              className={`px-2.5 py-1 rounded font-medium transition ${filterType === 'adjustment' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Adjustments
            </button>
            <button
              onClick={() => setFilterType('sale')}
              className={`px-2.5 py-1 rounded font-medium transition ${filterType === 'sale' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Sales
            </button>
          </div>
        </div>

        {/* Modal Body / History List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
              <p>Loading movement audit records...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-sm text-center">
              {error}
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <span className="text-3xl block mb-2">📋</span>
              <p className="font-semibold text-slate-300">No movement or stock change logs found</p>
              <p className="text-xs text-slate-500 mt-1">This product has not undergone recorded warehouse transfers or manual adjustments yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                <thead className="bg-slate-950 text-slate-300 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Movement Route / Location</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Handled By</th>
                    <th className="py-3 px-3">Details & Notes</th>
                    {onOpenSlip && <th className="py-3 px-3 text-center">Slip</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {filteredMovements.map(m => {
                    const fromFlag = m.from_warehouse_country === 'IND' ? '🇮🇳' : m.from_warehouse_country === 'CAN' ? '🇨🇦' : '';
                    const toFlag = m.to_warehouse_country === 'IND' ? '🇮🇳' : m.to_warehouse_country === 'CAN' ? '🇨🇦' : '';
                    const dateFormatted = new Date(m.created_at || m.shipped_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <tr key={m.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                          {dateFormatted}
                        </td>
                        <td className="py-3 px-3">
                          {getMovementBadge(m.movement_type)}
                        </td>
                        <td className="py-3 px-3 text-slate-200">
                          {m.from_warehouse_name || m.to_warehouse_name ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{fromFlag} {m.from_warehouse_name || 'Origin'}</span>
                              <span className="text-amber-500 font-bold">→</span>
                              <span>{toFlag} {m.to_warehouse_name || 'Destination'}</span>
                              {m.to_bin && <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">Bin: {m.to_bin}</span>}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Local Facility</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-sm text-amber-400">
                          {m.quantity || 1}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : m.status === 'in_transit'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {m.created_by_name || m.received_by_name || 'System / Admin'}
                        </td>
                        <td className="py-3 px-3 text-slate-300 max-w-[240px] truncate" title={m.notes}>
                          {m.notes || '-'}
                          {m.tracking_number && (
                            <div className="text-[10px] font-mono text-slate-400">Track: {m.tracking_number}</div>
                          )}
                        </td>
                        {onOpenSlip && (
                          <td className="py-3 px-3 text-center">
                            {m.movement_type === 'transfer' ? (
                              <button
                                type="button"
                                onClick={() => onOpenSlip(m)}
                                className="px-2 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
                                title="View Movement Packing Slip"
                              >
                                📄 Slip
                              </button>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredMovements.length} audit event(s)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
