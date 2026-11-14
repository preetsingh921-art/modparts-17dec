import React, { useState } from 'react';

/**
 * MovementReceiptModal
 * Generates an official, printable Dispatch Packing Slip or Goods Receipt Note (GRN)
 * for inventory transfers between warehouses.
 */
export default function MovementReceiptModal({
  isOpen,
  onClose,
  initialType = 'dispatch', // 'dispatch' or 'grn'
  data = null
}) {
  const [docType, setDocType] = useState(initialType);

  // Sync state if initialType changes when opened
  React.useEffect(() => {
    if (initialType) {
      setDocType(initialType);
    }
  }, [initialType, isOpen]);

  if (!isOpen || !data) return null;

  const isDispatch = docType === 'dispatch';
  const docRef = isDispatch
    ? `TRF-2026-${String(data.id || data.movement_id || '9401').padStart(4, '0')}`
    : `GRN-2026-${String(data.id || data.movement_id || '8102').padStart(4, '0')}`;

  const dateFormatted = data.created_at
    ? new Date(data.created_at).toLocaleString()
    : new Date().toLocaleString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm print:p-0 print:bg-white print:static">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #movement-print-sheet, #movement-print-sheet * {
            visibility: visible !important;
          }
          #movement-print-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: #0f172a !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Wrapper */}
      <div className="bg-white text-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-300 overflow-hidden max-h-[92vh] flex flex-col print:max-h-none print:w-full print:border-none print:shadow-none">
        
        {/* Modal Action Header (Excluded in print) */}
        <div className="no-print p-4 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-800">
              {isDispatch ? '📄 Transfer Dispatch Packing Slip' : '📥 Goods Receipt Note (GRN)'}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {docRef}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Document Mode */}
            <button
              type="button"
              onClick={() => setDocType(isDispatch ? 'grn' : 'dispatch')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition shadow-sm"
              title="Switch between Dispatch Slip and GRN Note"
            >
              Switch to {isDispatch ? 'Goods Receipt (GRN)' : 'Dispatch Slip'}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5 shadow"
            >
              <span>🖨️</span>
              <span>Print / Save PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div id="movement-print-sheet" className="p-8 overflow-y-auto space-y-6 text-slate-900 bg-white">
          
          {/* Header */}
          <div className={`flex justify-between items-start border-b-2 pb-5 ${isDispatch ? 'border-amber-600' : 'border-emerald-600'}`}>
            <div>
              <div className="text-2xl font-black tracking-tight text-slate-950 uppercase flex items-center gap-2">
                <span>SARDAARJI AUTO PARTS</span>
              </div>
              <div className="text-xs text-slate-600 font-medium">
                Official OEM Yamaha Vintage Parts Logistics & Distribution Network
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                GST / Business ID: IN-PB-2849182 • Worldwide Dispatch
              </div>
            </div>

            <div className="text-right">
              <div className={`text-xs uppercase tracking-wider font-extrabold ${isDispatch ? 'text-amber-700' : 'text-emerald-700'}`}>
                {isDispatch ? 'TRANSFER DISPATCH MANIFEST' : 'GOODS RECEIPT NOTE (GRN)'}
              </div>
              <div className="text-xl font-mono font-black text-slate-900 mt-0.5">
                {docRef}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-medium">
                {dateFormatted}
              </div>
            </div>
          </div>

          {/* Route & Warehouse Overview Card */}
          <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                {isDispatch ? 'DISPATCHING ORIGIN WAREHOUSE' : 'SOURCE WAREHOUSE'}
              </span>
              <div className="font-bold text-sm text-slate-900 mt-0.5">
                {data.from_warehouse_name || 'Origin Warehouse'}
              </div>
              <div className="text-slate-600 mt-0.5">
                {data.from_warehouse_country === 'IND' ? '🇮🇳 Amritsar Hub, Punjab, India' :
                 data.from_warehouse_country === 'CAN' ? '🇨🇦 Toronto Central Terminal, ON, Canada' :
                 'Branch Terminal'}
              </div>
              <div className="text-slate-500 mt-1.5">
                Dispatcher: <strong className="text-slate-800">{data.created_by_name || 'Admin Officer'}</strong>
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                {isDispatch ? 'DESTINATION WAREHOUSE BRANCH' : 'RECEIVING WAREHOUSE STATION'}
              </span>
              <div className="font-bold text-sm text-slate-900 mt-0.5">
                {data.to_warehouse_name || 'Destination Warehouse'}
              </div>
              <div className="text-slate-600 mt-0.5">
                {data.to_warehouse_country === 'CAN' ? '🇨🇦 Toronto Central Terminal, ON, Canada' :
                 data.to_warehouse_country === 'IND' ? '🇮🇳 Amritsar Hub, Punjab, India' :
                 'Target Branch'}
              </div>
              <div className="text-slate-500 mt-1.5">
                Receiver: <strong className="text-slate-800">{data.received_by_name || (isDispatch ? 'Awaiting Arrival' : 'Verified by Admin')}</strong>
              </div>
            </div>
          </div>

          {/* Logistics Tracking Bar */}
          <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-500 font-semibold text-[11px]">Movement Status: </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  data.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {data.status || (isDispatch ? 'in_transit' : 'completed')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-[11px]">Carrier / Tracking: </span>
                <span className="font-mono font-bold text-slate-800">
                  {data.tracking_number || 'TRF-COURIER-EXPRESS'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-semibold text-[11px]">Movement Notes: </span>
              <span className="text-slate-700 italic">
                {data.notes || (isDispatch ? 'Inter-warehouse stock rebalancing' : 'Inbound inspection verified')}
              </span>
            </div>
          </div>

          {/* Itemized Manifest / Receipt Table */}
          <div>
            <div className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
              {isDispatch ? 'Dispatched Shipment Line Items' : 'Received & Verified Goods'}
            </div>
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Part Number / SKU</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3">Rack / Bin</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                <tr>
                  <td className="py-3 px-3 font-mono">1</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-950">
                    {data.part_number || data.barcode || 'Yamaha OEM Part'}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">
                      {data.product_name || 'Genuine Yamaha Component'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Barcode: {data.barcode || data.part_number || '-'}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                    {isDispatch ? (data.from_bin_number || data.from_bin || 'Floor Staging') : (data.to_bin || 'Warehouse Stock')}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-sm text-slate-950">
                    {data.quantity || 1}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                    {data.condition_status || 'New / OEM'}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan="4" className="py-2.5 px-3 text-right text-slate-600 uppercase tracking-wider text-[11px]">
                    Total Consolidated Quantity:
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-sm text-slate-900 font-black">
                    {data.quantity || 1} Unit(s)
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Scannable Barcode & Authorized Sign-off Box */}
          <div className="pt-6 border-t border-slate-200 flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">
                SCANNABLE DOCUMENT IDENTIFIER
              </div>
              <div className="px-4 py-2 bg-slate-50 rounded border border-slate-300 font-mono tracking-widest text-base font-bold text-slate-900 inline-block shadow-sm">
                *{docRef}*
              </div>
              <div className="text-[10px] text-slate-400">
                Scan with handheld scanner at dock for instant intake reconciliation
              </div>
            </div>

            <div className="flex gap-8 text-center text-xs">
              <div className="border-t border-slate-400 pt-2 w-36">
                <span className="text-slate-500 text-[10px] font-semibold">
                  {isDispatch ? 'Inspected & Dispatched By' : 'Verified & Inspected By'}
                </span>
                <div className="font-bold text-slate-900 mt-1">
                  {data.created_by_name || 'Admin Signature'}
                </div>
              </div>
              <div className="border-t border-slate-400 pt-2 w-36">
                <span className="text-slate-500 text-[10px] font-semibold">
                  {isDispatch ? 'Carrier / Transport Sign' : 'Destination Warehouse Manager'}
                </span>
                <div className="font-bold text-slate-900 mt-1">
                  {data.received_by_name || (isDispatch ? 'Courier Acknowledged' : 'Dock Supervisor')}
                </div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 pt-3">
            This document serves as an official proof of movement between Sardaarji Auto Parts facilities. Keep with shipment package for border and warehouse intake audits.
          </div>

        </div>
      </div>
    </div>
  );
}
