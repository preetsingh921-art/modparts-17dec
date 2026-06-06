import { useState, useEffect } from 'react';
import api from '../../api/config';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const DEFAULT_POSITIONS = {
  categories: { x: 50, y: 50 },
  products: { x: 340, y: 50 },
  warehouses: { x: 630, y: 50 },
  bins: { x: 920, y: 50 },
  users: { x: 50, y: 350 },
  orders: { x: 340, y: 350 },
  order_items: { x: 630, y: 350 },
  inventory_movements: { x: 920, y: 350 },
  product_reviews: { x: 50, y: 650 },
  review_helpfulness: { x: 340, y: 650 },
  cart_items: { x: 630, y: 650 },
  wishlist: { x: 920, y: 650 },
  wishlist_items: { x: 920, y: 830 },
  query_logs: { x: 50, y: 830 }
};

const DatabaseSchema = () => {
  const [schemaData, setSchemaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('erd'); // default to visual 'erd' tab
  const [draggingTable, setDraggingTable] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Coordinate positions state with local storage persistence
  const [tablePositions, setTablePositions] = useState(() => {
    const saved = localStorage.getItem('modparts_erd_positions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure all default keys exist
        const positions = { ...DEFAULT_POSITIONS, ...parsed };
        return positions;
      } catch (e) {
        console.error('Failed to parse saved ERD positions:', e);
      }
    }
    return DEFAULT_POSITIONS;
  });

  // Save table coordinates whenever they change
  useEffect(() => {
    localStorage.setItem('modparts_erd_positions', JSON.stringify(tablePositions));
  }, [tablePositions]);

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/schema');
        if (response.data?.success) {
          setSchemaData(response.data.data);
        } else {
          setError(response.data?.message || 'Failed to fetch schema details.');
        }
      } catch (err) {
        console.error('Error fetching schema:', err);
        setError(err.response?.data?.message || 'Failed to load database schema from server.');
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, []);

  const handleResetPositions = () => {
    if (window.confirm('Are you sure you want to reset the visual layout to default?')) {
      setTablePositions(DEFAULT_POSITIONS);
    }
  };

  const handleExportPDF = () => {
    if (!schemaData) return;
    setExporting(true);

    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString();

      // Title Page
      doc.setFontSize(22);
      doc.setTextColor(139, 35, 50); // Crimson brand color
      doc.text("Sardaarji Auto Parts", 14, 30);
      doc.setFontSize(16);
      doc.setTextColor(51, 51, 51);
      doc.text("Live Database Schema Specification", 14, 40);
      
      doc.setFontSize(10);
      doc.setTextColor(102, 102, 102);
      doc.text(`Generated on: ${timestamp}`, 14, 50);
      doc.text(`Database: Neon PostgreSQL (Serverless)`, 14, 56);
      doc.text(`Total Tables: ${Object.keys(schemaData.tables).length}`, 14, 62);
      doc.text(`Total Relationships: ${schemaData.relations.length}`, 14, 68);

      // Draw a divider line
      doc.setDrawColor(139, 35, 50);
      doc.setLineWidth(1);
      doc.line(14, 75, 196, 75);

      // Summary Table / Overview
      doc.setFontSize(14);
      doc.setTextColor(139, 35, 50);
      doc.text("Database Overview & Record Counts", 14, 88);

      const overviewHeaders = [["Table Name", "Records Count", "Columns Count", "Primary Key"]];
      const overviewBody = Object.entries(schemaData.tables).map(([tableName, cols]) => {
        const pkCol = cols.find(c => c.isPrimaryKey)?.column || 'None';
        const count = schemaData.rowCounts[tableName] !== undefined ? schemaData.rowCounts[tableName] : '—';
        return [tableName, count.toString(), cols.length.toString(), pkCol];
      });

      autoTable(doc, {
        head: overviewHeaders,
        body: overviewBody,
        startY: 94,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [139, 35, 50] }
      });

      // Data Dictionary (Details of each table)
      let currentY = doc.lastAutoTable.finalY + 15;

      Object.entries(schemaData.tables).forEach(([tableName, cols]) => {
        // Add new page if space is low
        if (currentY > 220) {
          doc.addPage();
          currentY = 25;
        }

        doc.setFontSize(14);
        doc.setTextColor(139, 35, 50);
        doc.text(`Table: ${tableName}`, 14, currentY);
        
        doc.setFontSize(9);
        doc.setTextColor(102, 102, 102);
        const rowCount = schemaData.rowCounts[tableName] !== undefined ? schemaData.rowCounts[tableName] : 0;
        doc.text(`Active Records: ${rowCount} rows | Total Columns: ${cols.length}`, 14, currentY + 5);

        const tableHeaders = [["Column Name", "Data Type", "Null?", "Default Value", "Key"]];
        const tableBody = cols.map(col => {
          let keyText = '';
          if (col.isPrimaryKey) keyText = '🔑 PK';
          
          // Check if it is a foreign key
          const isFk = schemaData.relations.find(r => r.table === tableName && r.column === col.column);
          if (isFk) {
            keyText = keyText ? `${keyText}, 🔗 FK (${isFk.foreignTable})` : `🔗 FK (${isFk.foreignTable})`;
          }

          return [
            col.column,
            col.type,
            col.nullable ? 'Yes' : 'No',
            col.default === null ? 'NULL' : col.default,
            keyText || '—'
          ];
        });

        autoTable(doc, {
          head: tableHeaders,
          body: tableBody,
          startY: currentY + 9,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: [51, 51, 51] }
        });

        currentY = doc.lastAutoTable.finalY + 15;
      });

      // Save PDF
      doc.save(`Sardaarji_Auto_Parts_Schema_${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      doc.close && doc.close();
      setExporting(false);
    }
  };

  const handleExportDiagramPDF = () => {
    if (!schemaData) return;
    setExporting(true);

    // Minor timeout to ensure standard React drawing ticks complete
    setTimeout(() => {
      const element = document.getElementById('erd-diagram-container');
      if (!element) {
        setExporting(false);
        return;
      }

      html2canvas(element, {
        backgroundColor: '#0d0d0d',
        scale: 2, // high res vector rendering
        useCORS: true,
        logging: false
      }).then(canvas => {
        try {
          const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
          });

          const imgData = canvas.toDataURL('image/png', 1.0);
          const imgWidth = 277; // fits page with 10mm margins
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // PDF Header info
          doc.setFontSize(14);
          doc.setTextColor(139, 35, 50); // Crimson brand accent
          doc.text("Sardaarji Auto Parts - Database Entity Relationship Diagram", 10, 10);
          
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`Generated on: ${new Date().toLocaleString()} | Serverless Neon PostgreSQL Database`, 10, 14);

          // Add image
          doc.addImage(imgData, 'PNG', 10, 18, imgWidth, Math.min(imgHeight, 180));
          
          doc.save(`Sardaarji_Auto_Parts_ER_Diagram_${Date.now()}.pdf`);
        } catch (err) {
          console.error('ERD PDF export failed:', err);
        } finally {
          setExporting(false);
        }
      }).catch(err => {
        console.error('html2canvas screenshot failed:', err);
        setExporting(false);
      });
    }, 100);
  };

  // Helper to find related tables
  const getRelatedTables = (tableName) => {
    if (!schemaData) return [];
    const related = new Set();
    
    schemaData.relations.forEach(rel => {
      if (rel.table === tableName) {
        related.add(rel.foreignTable);
      }
      if (rel.foreignTable === tableName) {
        related.add(rel.table);
      }
    });

    return Array.from(related);
  };

  // Drag-and-drop mouse handlers
  const handleMouseDown = (tableName, e) => {
    if (e.button !== 0) return; // Left click only
    
    // Disable default text-selection cursor during dragging
    e.preventDefault();
    
    // Find current container boundaries to calculate precise relative offsets
    const rect = e.currentTarget.closest('#erd-diagram-container').getBoundingClientRect();
    const currentPos = tablePositions[tableName] || { x: 50, y: 50 };

    setDraggingTable(tableName);
    setDragOffset({
      x: e.clientX - rect.left - currentPos.x,
      y: e.clientY - rect.top - currentPos.y
    });
  };

  const handleMouseMove = (e) => {
    if (!draggingTable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Compute new positions relative to the canvas boundary
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;

    // Constraints to prevent tables from flying off the visual board boundaries
    const boundX = Math.max(10, Math.min(1300, newX));
    const boundY = Math.max(10, Math.min(1000, newY));

    setTablePositions(prev => ({
      ...prev,
      [draggingTable]: { x: boundX, y: boundY }
    }));
  };

  const handleMouseUp = () => {
    setDraggingTable(null);
  };

  // Computes start/end connector line coordinates for foreign keys
  const getRelationPoints = (rel) => {
    const sourceTable = rel.table;
    const sourceCol = rel.column;
    const targetTable = rel.foreignTable;
    const targetCol = rel.foreignColumn;

    const posA = tablePositions[sourceTable] || { x: 50, y: 50 };
    const posB = tablePositions[targetTable] || { x: 50, y: 50 };

    const colsA = schemaData.tables[sourceTable] || [];
    const colsB = schemaData.tables[targetTable] || [];

    const indexA = colsA.findIndex(c => c.column === sourceCol);
    const indexB = colsB.findIndex(c => c.column === targetCol);

    const headerHeight = 36;
    const rowHeight = 20;
    const width = 220;

    const y1 = posA.y + headerHeight + (indexA >= 0 ? indexA : 0) * rowHeight + rowHeight / 2;
    const y2 = posB.y + headerHeight + (indexB >= 0 ? indexB : 0) * rowHeight + rowHeight / 2;

    let x1, x2;
    // Determine closest horizontal edges to prevent overlapping cross-table wires
    if (posA.x + width / 2 < posB.x + width / 2) {
      x1 = posA.x + width;
      x2 = posB.x;
    } else {
      x1 = posA.x;
      x2 = posB.x + width;
    }

    return { x1, y1, x2, y2 };
  };

  // Generates curved connecting paths for relationships
  const drawBezierCurve = (x1, y1, x2, y2) => {
    const dx = Math.abs(x2 - x1) * 0.45;
    const cx1 = x1 + (x2 > x1 ? dx : -dx);
    const cy1 = y1;
    const cx2 = x2 - (x2 > x1 ? dx : -dx);
    const cy2 = y2;
    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8B2332]"></div>
        <p className="text-gray-400 mt-4 font-mono text-sm">Querying active PostgreSQL schema catalogs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1e1e1e] border border-red-500/30 rounded-xl p-6 text-center">
        <h3 className="text-red-500 font-bold text-lg mb-2">Failed to Load Schema</h3>
        <p className="text-[#A8A090] mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#8B2332] text-[#F5F0E1] rounded hover:bg-[#6d1a27] transition-colors"
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  const tables = Object.entries(schemaData?.tables || {});
  const filteredTables = tables.filter(([name]) => 
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const relatedOfSelected = selectedTable ? getRelatedTables(selectedTable) : [];

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-6 min-h-screen text-[#F5F0E1]">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-wider text-[#F5F0E1] flex items-center gap-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
            📊 Database Schema Specification
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Real-time table configurations, column data dictionaries, and ER mappings fetched dynamically from the Neon connection.
          </p>
        </div>
        
        {/* Navigation Tabs bar */}
        <div className="flex bg-[#1a1a1a] p-1 rounded-lg border border-[#333] shrink-0">
          <button
            onClick={() => setActiveTab('erd')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase transition-all ${
              activeTab === 'erd' ? 'bg-[#8B2332] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            🖼️ Visual ERD
          </button>
          <button
            onClick={() => setActiveTab('dictionary')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase transition-all ${
              activeTab === 'dictionary' ? 'bg-[#8B2332] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            📋 Data Dictionary
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-xl text-center">
          <div className="text-gray-400 text-xs uppercase tracking-widest">Database Server</div>
          <div className="text-[#B8860B] text-lg font-bold font-mono mt-1">Neon / Postgres</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-xl text-center">
          <div className="text-gray-400 text-xs uppercase tracking-widest">Active Tables</div>
          <div className="text-[#F5F0E1] text-2xl font-bold font-mono mt-1">{tables.length}</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-xl text-center">
          <div className="text-gray-400 text-xs uppercase tracking-widest">DB Relations</div>
          <div className="text-[#4caf50] text-2xl font-bold font-mono mt-1">{schemaData?.relations.length}</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-xl text-center">
          <div className="text-gray-400 text-xs uppercase tracking-widest">Total Rows</div>
          <div className="text-[#8B2332] text-2xl font-bold font-mono mt-1">
            {Object.values(schemaData?.rowCounts || {}).reduce((a, b) => a + b, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* TAB CONTENT: VISUAL ERD DIAGRAM */}
      {activeTab === 'erd' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1a1a1a] border border-[#222] p-4 rounded-xl">
            <div className="text-sm">
              <span className="text-[#B8860B] font-bold">✨ Interactive ERD Workspace</span>
              <p className="text-xs text-gray-400 mt-1">
                Drag table headers to rearrange them. Click cards to highlight table relations. Your custom layout automatically persists.
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={handleResetPositions}
                className="flex-1 sm:flex-initial px-4 py-2 border border-[#444] text-xs font-bold text-gray-300 rounded-lg hover:bg-[#2a2a2a] transition-all uppercase tracking-wider"
              >
                🔄 Reset Layout
              </button>
              <button
                onClick={handleExportDiagramPDF}
                disabled={exporting}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-[#8B2332] to-[#B8860B] hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg shadow-lg transition-all text-xs uppercase tracking-wider"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {exporting ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Export Diagram PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Draggable SVG Container */}
          <div className="overflow-auto border border-[#2a2a2a] rounded-xl bg-[#0d0d0d] min-h-[600px] max-h-[85vh] relative select-none shadow-inner">
            
            {/* Visual Legend overlay */}
            <div className="absolute top-4 right-4 z-20 bg-black/75 backdrop-blur-md px-3 py-2.5 rounded-lg border border-[#333] text-[10px] text-gray-400 font-mono flex flex-col gap-1.5 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#B8860B]"></span> Primary Key (🔑 PK)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#4caf50]"></span> Foreign Key (🔗 FK)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#333] border border-gray-500"></span> Draggable Header
              </div>
            </div>

            <div 
              id="erd-diagram-container"
              className="relative bg-[#0d0d0d]"
              style={{ width: '1550px', height: '1050px' }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* SVG Link lines between PK and FK */}
              <svg className="absolute inset-0 pointer-events-none w-full h-full z-0">
                <defs>
                  <marker
                    id="arrow-default"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4caf50" fillOpacity="0.4" />
                  </marker>
                  <marker
                    id="arrow-highlight"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#B8860B" fillOpacity="1" />
                  </marker>
                </defs>

                {schemaData.relations.map((rel, idx) => {
                  const { x1, y1, x2, y2 } = getRelationPoints(rel);
                  
                  const isHighlighted = selectedTable === rel.table || selectedTable === rel.foreignTable;
                  const hasSelection = selectedTable !== null;
                  
                  let strokeColor = '#4caf50';
                  let strokeOpacity = 0.4;
                  let strokeWidth = 1.5;
                  let markerId = 'arrow-default';

                  if (hasSelection) {
                    if (isHighlighted) {
                      strokeColor = '#B8860B'; // Highlight active paths in gold
                      strokeOpacity = 1.0;
                      strokeWidth = 2.5;
                      markerId = 'arrow-highlight';
                    } else {
                      strokeOpacity = 0.04; // Hide inactive paths
                    }
                  }

                  return (
                    <path
                      key={idx}
                      d={drawBezierCurve(x1, y1, x2, y2)}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeOpacity={strokeOpacity}
                      markerEnd={`url(#${markerId})`}
                      className="transition-all duration-200"
                    />
                  );
                })}
              </svg>

              {/* Table Node Cards */}
              {Object.entries(schemaData.tables).map(([tableName, cols]) => {
                const pos = tablePositions[tableName] || { x: 50, y: 50 };
                const isSelected = selectedTable === tableName;
                const isRelated = selectedTable ? getRelatedTables(selectedTable).includes(tableName) : false;
                const hasSelection = selectedTable !== null;

                let opacityStyle = 'opacity-100 scale-100 border-[#333]';
                if (hasSelection) {
                  if (isSelected) {
                    opacityStyle = 'border-[#B8860B] ring-2 ring-[#B8860B]/30 scale-[1.01] shadow-xl z-20';
                  } else if (isRelated) {
                    opacityStyle = 'border-[#4caf50] opacity-90 scale-100 shadow-md z-10';
                  } else {
                    opacityStyle = 'opacity-15 scale-95 border-[#222] grayscale pointer-events-none';
                  }
                }

                const count = schemaData.rowCounts[tableName] !== undefined ? schemaData.rowCounts[tableName] : 0;

                return (
                  <div
                    key={tableName}
                    style={{
                      position: 'absolute',
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      width: '220px',
                      userSelect: 'none'
                    }}
                    className={`bg-[#181818] rounded-xl overflow-hidden border shadow-lg cursor-pointer transition-all duration-150 ${opacityStyle}`}
                    onClick={() => setSelectedTable(isSelected ? null : tableName)}
                  >
                    {/* Header (reorderable handle) */}
                    <div
                      onMouseDown={(e) => handleMouseDown(tableName, e)}
                      className={`px-3 py-2 flex justify-between items-center select-none ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#B8860B]/30 to-[#B8860B]/5 border-b border-[#B8860B]/30 cursor-grab active:cursor-grabbing'
                          : isRelated
                            ? 'bg-gradient-to-r from-[#4caf50]/30 to-[#4caf50]/5 border-b border-[#4caf50]/30 cursor-grab active:cursor-grabbing'
                            : 'bg-[#222] border-b border-[#333] cursor-grab active:cursor-grabbing'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <h4 className="font-bold text-[12px] tracking-wide text-white truncate">{tableName}</h4>
                        <span className="text-[9px] text-gray-400 font-mono">{count} row{count !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-[9px] bg-black/40 text-gray-400 font-mono px-1.5 py-0.5 rounded shrink-0">
                        {cols.length} cols
                      </span>
                    </div>

                    {/* Table Columns List */}
                    <div className="p-2 text-[10px] font-mono flex flex-col gap-1 max-h-[220px] overflow-y-auto bg-[#141414]">
                      {cols.map((col) => {
                        const isFkRelation = schemaData.relations.find(
                          r => r.table === tableName && r.column === col.column
                        );

                        return (
                          <div key={col.column} className="flex justify-between items-center py-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {col.isPrimaryKey ? (
                                <span className="text-[#B8860B] shrink-0" title="Primary Key">🔑</span>
                              ) : isFkRelation ? (
                                <span className="text-[#4caf50] shrink-0" title={`Foreign Key referencing ${isFkRelation.foreignTable}`}>🔗</span>
                              ) : (
                                <span className="text-gray-700 shrink-0">•</span>
                              )}
                              <span className={`font-semibold truncate ${
                                col.isPrimaryKey ? 'text-[#B8860B]' : isFkRelation ? 'text-[#4caf50]' : 'text-gray-300'
                              }`}>
                                {col.column}
                              </span>
                            </div>
                            <span className="text-gray-500 text-[9px] font-mono shrink-0 pl-1">
                              {col.type.replace('character varying', 'varchar').replace('timestamp with time zone', 'tz')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DATA DICTIONARY TAB */}
      {activeTab === 'dictionary' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1a1a1a] border border-[#222] p-4 rounded-xl">
            <div className="text-sm">
              <span className="text-[#8B2332] font-bold">📋 Data Dictionary Catalog</span>
              <p className="text-xs text-gray-400 mt-1">
                Detailed metadata specifications of data types, constraints, default values, and column keys.
              </p>
            </div>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-[#8B2332] to-[#B8860B] hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg shadow-lg transition-all text-xs uppercase tracking-wider"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white"></div>
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export Data Dictionary
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <input
              type="text"
              placeholder="🔍 Filter tables by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:max-w-xs bg-[#1a1a1a] text-white border border-[#333] rounded-lg px-4 py-2 focus:outline-none focus:border-[#8B2332] text-sm"
            />
            <p className="text-xs text-gray-500 font-mono italic">
              💡 Click a table card to highlight relationships.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTables.map(([tableName, cols]) => {
              const isSelected = selectedTable === tableName;
              const isRelated = relatedOfSelected.includes(tableName);
              const hasSelection = selectedTable !== null;
              
              let opacityStyle = 'opacity-100 scale-100 border-[#333]';
              if (hasSelection) {
                if (isSelected) {
                  opacityStyle = 'border-[#B8860B] ring-2 ring-[#B8860B]/30 scale-[1.02] shadow-xl z-10';
                } else if (isRelated) {
                  opacityStyle = 'border-[#4caf50] opacity-90 scale-100 shadow-md';
                } else {
                  opacityStyle = 'opacity-20 scale-95 border-[#222] grayscale';
                }
              }

              const count = schemaData.rowCounts[tableName] !== undefined ? schemaData.rowCounts[tableName] : 0;

              return (
                <div
                  key={tableName}
                  onClick={() => setSelectedTable(isSelected ? null : tableName)}
                  className={`bg-[#181818] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border ${opacityStyle}`}
                >
                  <div className={`px-4 py-3 flex justify-between items-center ${
                    isSelected 
                      ? 'bg-gradient-to-r from-[#B8860B]/20 to-[#B8860B]/5 border-b border-[#B8860B]/30' 
                      : isRelated
                        ? 'bg-gradient-to-r from-[#4caf50]/20 to-[#4caf50]/5 border-b border-[#4caf50]/30'
                        : 'bg-[#222] border-b border-[#333]'
                  }`}>
                    <div>
                      <h3 className="font-bold text-sm tracking-wide text-white">{tableName}</h3>
                      <span className="text-[10px] text-gray-400 font-mono">{count} row{count !== 1 ? 's' : ''}</span>
                    </div>
                    {getRelatedTables(tableName).length > 0 && (
                      <span className="text-[10px] bg-[#333] text-gray-300 font-mono px-2 py-0.5 rounded-full">
                        {getRelatedTables(tableName).length} rel
                      </span>
                    )}
                  </div>

                  <div className="p-3 text-[11px] font-mono flex flex-col gap-1.5 max-h-[260px] overflow-y-auto bg-[#141414]">
                    {cols.map((col) => {
                      const isFkRelation = schemaData.relations.find(
                        r => r.table === tableName && r.column === col.column
                      );

                      return (
                        <div key={col.column} className="flex justify-between items-center py-0.5 group">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {col.isPrimaryKey ? (
                              <span className="text-[#B8860B] shrink-0" title="Primary Key">🔑</span>
                            ) : isFkRelation ? (
                              <span className="text-[#4caf50] shrink-0" title={`Foreign Key referencing ${isFkRelation.foreignTable}.${isFkRelation.foreignColumn}`}>🔗</span>
                            ) : (
                              <span className="text-gray-600 shrink-0">•</span>
                            )}
                            <span className={`font-semibold truncate ${col.isPrimaryKey ? 'text-[#B8860B]' : isFkRelation ? 'text-[#4caf50]' : 'text-gray-300'}`}>
                              {col.column}
                            </span>
                          </div>
                          <span className="text-gray-500 text-[10px] font-mono shrink-0 pl-2">
                            {col.type.replace('character varying', 'varchar').replace('timestamp with time zone', 'timestamptz').replace('timestamp without time zone', 'timestamp')}
                            {col.nullable ? '?' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {isSelected && (
                    <div className="bg-[#B8860B]/10 px-4 py-2 border-t border-[#B8860B]/20 text-[10px] text-[#B8860B] font-mono text-center">
                      Showing relationships for this table
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseSchema;
