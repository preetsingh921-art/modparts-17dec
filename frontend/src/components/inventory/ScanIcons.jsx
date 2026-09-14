import React from 'react';

/**
 * Scan & Send (Outbound / Dispatch) Icon
 * Represents goods being scanned and dispatched out to another warehouse or destination.
 */
export const ScanSendIcon = ({ className = "w-5 h-5", color = "currentColor", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Barcode Lines at Top/Backdrop */}
    <path d="M4 4v3" strokeWidth="2" />
    <path d="M7 4v2" strokeWidth="1.5" />
    <path d="M10 4v3" strokeWidth="2" />
    <path d="M13 4v2" strokeWidth="1.5" />
    <path d="M16 4v3" strokeWidth="2" />
    <path d="M19 4v3" strokeWidth="2" />
    {/* Outbound Dispatch Arrow exiting the tray */}
    <path d="M12 11V3m0 0l-3.5 3.5M12 3l3.5 3.5" stroke="currentColor" strokeWidth="2.2" />
    {/* Sturdy Warehouse Shipping Box / Tray */}
    <path d="M4 11v8a2 2 0 002 2h12a2 2 0 002-2v-8" strokeWidth="1.8" />
    <path d="M8 15h8" strokeWidth="1.8" />
  </svg>
);

/**
 * Scan & Receive (Inbound / Reception) Icon
 * Represents incoming shipments being scanned and stocked into warehouse bins.
 */
export const ScanReceiveIcon = ({ className = "w-5 h-5", color = "currentColor", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Barcode Lines at Top */}
    <path d="M4 4v3" strokeWidth="2" />
    <path d="M7 4v2" strokeWidth="1.5" />
    <path d="M10 4v3" strokeWidth="2" />
    <path d="M13 4v2" strokeWidth="1.5" />
    <path d="M16 4v3" strokeWidth="2" />
    <path d="M19 4v3" strokeWidth="2" />
    {/* Inbound Receiving Arrow entering into tray */}
    <path d="M12 3v9m0 0l-3.5-3.5M12 12l3.5-3.5" stroke="currentColor" strokeWidth="2.2" />
    {/* Receiving Warehouse Bin / Tray */}
    <path d="M4 11v8a2 2 0 002 2h12a2 2 0 002-2v-8" strokeWidth="1.8" />
    <path d="M9 16h6" strokeWidth="1.8" />
  </svg>
);

/**
 * Barcode Gun / USB Hardware Scanner Icon
 */
export const BarcodeGunIcon = ({ className = "w-5 h-5", color = "currentColor", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Gun Body & Laser Head */}
    <path d="M3 7a2 2 0 012-2h10a3 3 0 013 3v2a2 2 0 01-2 2h-2.5l-1.5 7.5a1.5 1.5 0 01-1.5 1.5H8a1.5 1.5 0 01-1.5-1.5L8 12H5a2 2 0 01-2-2V7z" />
    {/* Trigger */}
    <path d="M10 12v3" strokeWidth="2" />
    {/* Laser Beam Projection */}
    <path d="M19 8h3" strokeWidth="2" strokeDasharray="1 1" />
    <path d="M18 6l3-1" strokeWidth="1.5" />
    <path d="M18 10l3 1" strokeWidth="1.5" />
  </svg>
);

/**
 * Camera Viewfinder / Mobile Scanner Icon
 */
export const CameraViewfinderIcon = ({ className = "w-5 h-5", color = "currentColor", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Viewfinder Corners */}
    <path d="M4 8V5a1 1 0 011-1h3" strokeWidth="2.2" />
    <path d="M16 4h3a1 1 0 011 1v3" strokeWidth="2.2" />
    <path d="M20 16v3a1 1 0 01-1 1h-3" strokeWidth="2.2" />
    <path d="M8 20H5a1 1 0 01-1-1v-3" strokeWidth="2.2" />
    {/* Center Red Laser Line */}
    <path d="M6 12h12" stroke="#ef4444" strokeWidth="2" />
    {/* Barcode Bars behind laser */}
    <path d="M8 9v2M8 13v2" strokeWidth="1.8" />
    <path d="M11 8v3M11 13v3" strokeWidth="1.8" />
    <path d="M14 9v2M14 13v2" strokeWidth="1.8" />
    <path d="M16 8v3M16 13v3" strokeWidth="1.8" />
  </svg>
);

/**
 * Quick Scan Dual Action Icon (Send + Receive)
 */
export const QuickScanIcon = ({ className = "w-5 h-5", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...props}
  >
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.8" />
    {/* Outbound Arrow (amber) */}
    <path d="M8 14l3-3m0 0V7m0 4H7" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {/* Inbound Arrow (emerald) */}
    <path d="M16 10l-3 3m0 0v4m0-4h4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default {
  ScanSendIcon,
  ScanReceiveIcon,
  BarcodeGunIcon,
  CameraViewfinderIcon,
  QuickScanIcon
};
