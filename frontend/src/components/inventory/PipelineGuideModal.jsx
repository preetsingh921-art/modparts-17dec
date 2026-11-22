import React from 'react';

/**
 * PipelineGuideModal
 * Comprehensive visual explainer for the 7-stage inventory movement pipeline,
 * detailing what each icon/check mark represents, triggers, and document associations.
 */
export default function PipelineGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const PIPELINE_STAGES = [
    {
      step: 1,
      icon: '📋',
      key: 'pending',
      title: 'Created / Drafted',
      badgeColor: 'bg-slate-700 text-slate-200 border-slate-600',
      timing: 'Auto on Creation (created_at)',
      description: 'Transfer order requested or drafted in system. Stock allocation is reserved at the originating facility.',
      actionNeeded: 'Warehouse picker is notified to pull items from the designated storage bin.',
      doc: 'Draft Transfer Request'
    },
    {
      step: 2,
      icon: '🔍',
      key: 'picked',
      title: 'Physically Picked',
      badgeColor: 'bg-blue-900/60 text-blue-300 border-blue-700',
      timing: 'Operator Pick Click (picked_at)',
      description: 'Items have been physically retrieved from the origin bin/shelf by the warehouse picker.',
      actionNeeded: 'Move goods to the packaging and staging dispatch area.',
      doc: 'Pick List'
    },
    {
      step: 3,
      icon: '📦',
      key: 'packed',
      title: 'Packed & Labeled',
      badgeColor: 'bg-indigo-900/60 text-indigo-300 border-indigo-700',
      timing: 'Packer Finish (packed_at)',
      description: 'Items are securely boxed, weighed, and external shipping labels applied. Ready for courier handover.',
      actionNeeded: 'Attach Dispatch Packing Slip to exterior box.',
      doc: 'Dispatch Slip / BOL'
    },
    {
      step: 4,
      icon: '🛃',
      key: 'customs_review',
      title: 'Customs Clearance',
      badgeColor: 'bg-purple-900/60 text-purple-300 border-purple-700',
      timing: 'Customs Export (customs_cleared_at)',
      description: 'Required for cross-border shipments (e.g. Canada 🇨🇦 ➡️ India 🇮🇳). Export declarations and HS tariff codes are verified.',
      actionNeeded: 'Commercial invoice and airway bill stamped by customs authority.',
      doc: 'Commercial Customs Invoice'
    },
    {
      step: 5,
      icon: '✈️',
      key: 'in_transit',
      title: 'In Transit',
      badgeColor: 'bg-amber-900/60 text-amber-300 border-amber-700',
      timing: 'Carrier Pickup (shipped_at)',
      description: 'Handed over to carrier (e.g. DHL, FedEx). Units are formally decremented from the origin warehouse inventory balance.',
      actionNeeded: 'Carrier tracking number assigned and monitored during shipping duration.',
      doc: 'Bill of Lading (BOL)'
    },
    {
      step: 6,
      icon: '📥',
      key: 'arrived',
      title: 'Arrived at Dock',
      badgeColor: 'bg-teal-900/60 text-teal-300 border-teal-700',
      timing: 'Dock Delivery (received_at)',
      description: 'Physical packages delivered to the destination receiving dock. Box intact; pending internal barcode verification.',
      actionNeeded: 'Receiving staff scans parcels in "Scan & Receive" mode.',
      doc: 'Delivery Receipt'
    },
    {
      step: 7,
      icon: '✅',
      key: 'completed',
      title: 'Completed & Binned',
      badgeColor: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
      timing: 'Bin Scan & Stock In (scanned_at)',
      description: 'Items verified by barcode scanner and assigned to a destination bin. Inventory units are officially credited to the receiving warehouse.',
      actionNeeded: 'Official Goods Received Note (GRN) generated and filed for accounting audit.',
      doc: 'Goods Received Note (GRN)'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-[#1e1e1e] border border-[#B8860B]/60 rounded-xl max-w-4xl w-full p-6 text-[#F5F0E1] shadow-2xl relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#333] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 bg-midnight-800 rounded-lg border border-[#B8860B]/40">🚚</span>
            <div>
              <h2 className="text-xl font-bold tracking-wide uppercase text-[#F5F0E1]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                Movement Pipeline & Status Guide
              </h2>
              <p className="text-xs text-[#A8A090]">
                Lifecycle of inventory shipments from initial dispatch order to final bin stocking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Legend Explainer */}
        <div className="bg-[#242424] border border-[#3a3a3a] rounded-lg p-3 mb-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <span className="font-semibold text-gray-300">Indicator Meanings:</span>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">✓</span>
            <span className="text-gray-300"><strong>Green Checkmark:</strong> Completed stage</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white border border-blue-400 flex items-center justify-center font-bold text-[10px]">✈️</span>
            <span className="text-gray-300"><strong>Highlighted Icon:</strong> Current active status</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#444] text-gray-400 flex items-center justify-center text-[10px]">⚪</span>
            <span className="text-gray-300"><strong>Gray Circle:</strong> Pending future stage</span>
          </div>
        </div>

        {/* Stages Timeline List */}
        <div className="overflow-y-auto space-y-3 pr-1 flex-1">
          {PIPELINE_STAGES.map((stage) => (
            <div 
              key={stage.key}
              className="bg-[#262626] border border-[#383838] hover:border-[#B8860B]/50 rounded-lg p-3 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1c1c1c] border border-[#555] flex items-center justify-center text-lg flex-shrink-0 shadow-inner">
                  {stage.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-[#B8860B] font-bold">Step {stage.step}:</span>
                    <h3 className="font-bold text-sm text-[#F5F0E1]">{stage.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${stage.badgeColor}`}>
                      status: {stage.key}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1">{stage.description}</p>
                  <p className="text-[11px] text-amber-300/80 mt-1 font-mono">
                    👉 <strong>Action:</strong> {stage.actionNeeded}
                  </p>
                </div>
              </div>

              <div className="md:text-right flex-shrink-0 border-t md:border-t-0 border-[#333] pt-2 md:pt-0">
                <div className="text-[10px] text-gray-400">Timestamp Logged</div>
                <div className="text-xs font-mono text-emerald-400 font-semibold">{stage.timing}</div>
                <div className="text-[10px] text-amber-400 mt-1">📄 {stage.doc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[#333] flex justify-between items-center text-xs text-gray-400">
          <span>💡 Operators can advance stages via action buttons or using <strong>Scan & Receive</strong>.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded font-medium transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
