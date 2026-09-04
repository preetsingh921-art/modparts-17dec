import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import Papa from 'papaparse';

// Sample CSV data for the template
const sampleCsvData = [
  ['name', 'price', 'category_id', 'quantity', 'description', 'condition_status', 'part_number', 'barcode', 'warehouse_id', 'bin_number', 'ref_no'],
  ['Universal Piston Kit', '149.99', 'Engine Parts', '10', 'High-quality universal piston kit.', 'New', 'PK-001', '123456789', '1', 'A-01'],
  ['Front Brake Caliper', '89.95', 'Brakes', '5', 'Refurbished front brake caliper.', 'Refurbished', 'BC-102', '', '1', 'B-05'],
  ['Electrical Wiring Harness', '75.50', 'Electrical', '8', 'Complete wiring harness.', 'New', 'WH-200', '', '2', 'C-10'],
  ['Carburetor Rebuild Kit', '45.00', 'Engine Parts', '15', 'Complete rebuild kit.', 'New', 'CRK-55', '', '1', 'A-02'],
  ['Headlight Assembly', '65.75', 'Bodywork', '3', 'Chrome headlight assembly.', 'Used', 'HL-88', '', '2', 'D-03']
];

// Field aliases for smart auto-mapping
const fieldAliases = {
  name: ['name', 'title', 'product', 'item'],
  price: ['price', 'cost', 'amount', 'msrp', 'rate'],
  category_id: ['category', 'type', 'group', 'class', 'department'],
  quantity: ['quantity', 'qty', 'stock', 'inventory', 'count', 'amount'],
  description: ['description', 'desc', 'details', 'info', 'text'],
  condition_status: ['condition', 'status', 'state'],
  part_number: ['part', 'mpn', 'sku', 'number', 'pn'],
  barcode: ['barcode', 'upc', 'ean', 'isbn', 'code'],
  warehouse_id: ['warehouse', 'location', 'site'],
  bin_number: ['bin', 'shelf', 'aisle', 'position'],
  ref_no: ['ref', 'reference', 'refno', 'ref_no', 'refnum']
};

const getFieldMatchScore = (header, targetField) => {
  const normHeader = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const normTarget = targetField.replace(/_/g, '');
  if (normHeader === normTarget) return 100;
  
  const aliases = fieldAliases[targetField] || [];
  for (const alias of aliases) {
    if (normHeader === alias) return 90;
    if (normHeader.includes(alias) || alias.includes(normHeader)) return 70;
  }
  return 0;
};

/**
 * Generate and download a CSV file with sample product data
 */
const downloadSampleCsv = () => {
  // Convert the array data to CSV format
  let csvContent = '';

  sampleCsvData.forEach(row => {
    // Properly format each field (add quotes around fields with commas)
    const formattedRow = row.map(field => {
      // If the field contains commas, quotes, or newlines, wrap it in quotes
      if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
        // Escape any quotes by doubling them
        const escapedField = field.replace(/"/g, '""');
        return `"${escapedField}"`;
      }
      return field;
    });

    // Join the fields with commas and add a newline
    csvContent += formattedRow.join(',') + '\n';
  });

  // Create a Blob with the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create a URL for the Blob
  const url = URL.createObjectURL(blob);

  // Create a temporary link element
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'sample-products.csv');
  link.style.display = 'none';

  // Add the link to the document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Release the URL object
  URL.revokeObjectURL(url);
};

/**
 * Modal component for importing products from CSV files
 *
 * @param {Object} props Component props
 * @param {boolean} props.isOpen Whether the modal is open
 * @param {Function} props.onClose Function to close the modal
 * @param {Function} props.onImport Function to handle the import
 * @param {Array} props.categories Available categories for mapping
 */
const CSVImportModal = ({ isOpen, onClose, onImport, categories }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Mapping
  const [mappings, setMappings] = useState({});
  const [requiredFields] = useState(['name', 'price', 'category_id', 'quantity']);
  const fileInputRef = useRef(null);
  const { error: showError, success } = useToast();

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setFileName('');
      setParsedData([]);
      setHeaders([]);
      setCurrentPage(1);
      setIsLoading(false);
      setError('');
      setStep(1);
      setMappings({});
    }
  }, [isOpen]);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a valid CSV file');
        setFile(null);
        setFileName('');
        return;
      }

      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
      parseCSV(selectedFile);
    }
  };

  // Parse CSV file
  const parseCSV = (file) => {
    setIsLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setError('The CSV file is empty');
          setIsLoading(false);
          return;
        }

        // Get headers from the first row
        const headers = Object.keys(results.data[0]);
        setHeaders(headers);

        // Create initial mappings (smart auto-map via aliases and similarity)
        const initialMappings = {};
        const availableFields = ['name', 'price', 'category_id', 'quantity', 'description', 'condition_status', 'part_number', 'barcode', 'warehouse_id', 'bin_number', 'ref_no'];
        
        availableFields.forEach(field => {
          let bestMatch = null;
          let bestScore = 0;
          
          headers.forEach(header => {
            const score = getFieldMatchScore(header, field);
            if (score > bestScore && score >= 70) {
              bestScore = score;
              bestMatch = header;
            }
          });
          
          if (bestMatch) {
            initialMappings[field] = bestMatch;
          }
        });
        setMappings(initialMappings);

        // Set parsed data for preview
        setParsedData(results.data);
        setCurrentPage(1);
        setIsLoading(false);
        setStep(2);
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`);
        setIsLoading(false);
      }
    });
  };

  // Handle mapping changes
  const handleMappingChange = (field, value) => {
    setMappings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validate mappings
  const validateMappings = () => {
    const missingFields = requiredFields.filter(field => !mappings[field]);
    if (missingFields.length > 0) {
      setError(`Missing required field mappings: ${missingFields.join(', ')}`);
      return false;
    }
    return true;
  };

  // Process data with mappings
  const processData = () => {
    if (!validateMappings()) return;

    try {
      const processedData = parsedData.map((row, index) => {
        const processedRow = {};

        // Map fields according to mappings
        Object.entries(mappings).forEach(([targetField, sourceField]) => {
          let value = row[sourceField];

          // Convert price to number
          if (targetField === 'price') {
            value = parseFloat(value.replace(/[^0-9.-]+/g, ''));
            if (isNaN(value)) {
              throw new Error(`Invalid price in row ${index + 1}: ${row[sourceField]}`);
            }
          }

          // Convert quantity to number
          if (targetField === 'quantity') {
            value = parseInt(value, 10);
            if (isNaN(value)) {
              throw new Error(`Invalid quantity in row ${index + 1}: ${row[sourceField]}`);
            }
          }

          // Validate category_id
          if (targetField === 'category_id') {
            // If the value is a category name, find the corresponding ID
            let category = null;

            // First try to find by exact ID match
            if (!isNaN(parseInt(value))) {
              category = categories.find(c => String(c.id) === String(value));
            }

            // If not found by ID, try to find by name
            if (!category) {
              category = categories.find(c => c.name.toLowerCase() === String(value).toLowerCase());
            }

            // If still not found, show available categories in the error
            if (!category) {
              const availableCategories = categories.map(c => `${c.id}: ${c.name}`).join(', ');
              throw new Error(`Invalid category in row ${index + 1}: "${value}". Available categories are: ${availableCategories}`);
            }

            value = category.id;
            console.log(`Mapped category "${value}" to ID: ${category.id} (${category.name})`);
          }

          processedRow[targetField] = value;
        });

        // Add default values for missing non-required fields
        processedRow.description = processedRow.description || '';
        processedRow.image_url = ''; // No image for imported products
        processedRow.condition_status = processedRow.condition_status || 'New';

        // Pass validation for inventory fields
        processedRow.part_number = processedRow.part_number || '';
        processedRow.barcode = processedRow.barcode || '';
        processedRow.warehouse_id = processedRow.warehouse_id || '';
        processedRow.bin_number = processedRow.bin_number || '';
        processedRow.ref_no = processedRow.ref_no || '';

        return processedRow;
      });

      onImport(processedData);
      success(`Successfully processed ${processedData.length} products for import`);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setFileName(droppedFile.name);
        setError('');
        parseCSV(droppedFile);
      } else {
        setError('Please drop a valid CSV file');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-midnight-900 border border-midnight-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col text-white animate-fadeIn">
        {/* Header */}
        <div className="bg-midnight-950 text-white px-6 py-4 flex justify-between items-center border-b border-midnight-700">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>📄</span> Import Products from CSV
          </h2>
          <button
            onClick={onClose}
            className="text-midnight-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-midnight-900">
          {/* Step 1: Upload CSV */}
          {step === 1 && (
            <div>
              <p className="mb-4 text-midnight-200">
                Upload a CSV file containing product data. The file should have columns for product name, price, category, and quantity.
              </p>

              <div className="mb-4 p-4 bg-midnight-800 border border-midnight-700 text-midnight-200 rounded-lg">
                <p className="text-sm">
                  <strong className="text-amber-300">Tip:</strong> You can{' '}
                  <button
                    onClick={downloadSampleCsv}
                    className="text-amber-400 underline hover:text-amber-300 bg-transparent border-none p-0 cursor-pointer font-medium"
                    type="button"
                  >
                    download a sample CSV file
                  </button>{' '}
                  to see the expected format.
                </p>

                <div className="mt-3 pt-3 border-t border-midnight-700">
                  <p className="text-sm font-semibold text-white">Available Categories:</p>
                  <div className="mt-1 text-xs grid grid-cols-2 md:grid-cols-3 gap-1.5 text-midnight-300">
                    {categories.map(category => (
                      <div key={category.id} className="flex items-center">
                        <span className="font-medium text-amber-400 mr-1">{category.id}:</span> {category.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="border-2 border-dashed border-midnight-600 bg-midnight-950/40 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-midnight-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-midnight-300">Drag and drop a CSV file here, or click to select a file</p>
                {fileName && <p className="mt-2 text-amber-400 font-medium">{fileName}</p>}
              </div>
            </div>
          )}

          {/* Step 2: Preview Data */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-white">Preview Data</h3>
              <p className="mb-4 text-midnight-300 text-sm">
                Review your CSV file and map the columns to product fields. Showing page {currentPage} of {Math.ceil(parsedData.length / itemsPerPage)}.
              </p>

              {parsedData.length > 0 && (
                <div className="overflow-x-auto border border-midnight-700 rounded-lg">
                  <table className="min-w-full divide-y divide-midnight-700">
                    <thead className="bg-midnight-800">
                      <tr>
                        {headers.map((header, index) => (
                          <th key={index} className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                            {header}
                            <select
                              className="block w-full mt-1.5 text-xs bg-midnight-900 border border-midnight-600 rounded text-white p-1.5 focus:ring-amber-500 focus:border-amber-500 outline-none"
                              value={Object.entries(mappings).find(([_, v]) => v === header)?.[0] || ''}
                              onChange={(e) => {
                                const prevMapping = Object.entries(mappings).find(([_, v]) => v === header);
                                if (prevMapping) {
                                  const newMappings = { ...mappings };
                                  delete newMappings[prevMapping[0]];
                                  if (e.target.value) {
                                    newMappings[e.target.value] = header;
                                  }
                                  setMappings(newMappings);
                                } else if (e.target.value) {
                                  setMappings({ ...mappings, [e.target.value]: header });
                                }
                              }}
                            >
                              <option value="">-- Map to field --</option>
                              <option value="name">Product Name</option>
                              <option value="price">Price</option>
                              <option value="category_id">Category</option>
                              <option value="quantity">Quantity</option>
                              <option value="description">Description</option>
                              <option value="condition_status">Condition</option>
                              <option value="part_number">Part Number</option>
                              <option value="barcode">Barcode</option>
                              <option value="warehouse_id">Warehouse ID</option>
                              <option value="bin_number">Bin Number</option>
                              <option value="ref_no">Ref No</option>
                            </select>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-midnight-900 divide-y divide-midnight-700/60">
                      {parsedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-midnight-800/50 transition-colors">
                          {headers.map((header, colIndex) => (
                            <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-midnight-200">
                              {row[header]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination Controls */}
                  {parsedData.length > itemsPerPage && (
                    <div className="flex items-center justify-between px-4 py-3 bg-midnight-950 border-t border-midnight-700 sm:px-6">
                      <div className="flex justify-between flex-1 sm:hidden">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-midnight-200 bg-midnight-800 border border-midnight-600 rounded-md hover:bg-midnight-700 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(Math.ceil(parsedData.length / itemsPerPage), currentPage + 1))}
                          disabled={currentPage === Math.ceil(parsedData.length / itemsPerPage)}
                          className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-midnight-200 bg-midnight-800 border border-midnight-600 rounded-md hover:bg-midnight-700 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-midnight-300">
                            Showing <span className="font-medium text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium text-white">{Math.min(currentPage * itemsPerPage, parsedData.length)}</span> of{' '}
                            <span className="font-medium text-white">{parsedData.length}</span> results
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-midnight-600 bg-midnight-800 text-sm font-medium text-midnight-300 hover:bg-midnight-700 hover:text-white disabled:opacity-50"
                            >
                              <span className="sr-only">Previous</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <span className="relative inline-flex items-center px-4 py-2 border border-midnight-600 bg-midnight-900 text-sm font-medium text-midnight-200">
                              Page {currentPage} of {Math.ceil(parsedData.length / itemsPerPage)}
                            </span>
                            <button
                              onClick={() => setCurrentPage(Math.min(Math.ceil(parsedData.length / itemsPerPage), currentPage + 1))}
                              disabled={currentPage === Math.ceil(parsedData.length / itemsPerPage)}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-midnight-600 bg-midnight-800 text-sm font-medium text-midnight-300 hover:bg-midnight-700 hover:text-white disabled:opacity-50"
                            >
                              <span className="sr-only">Next</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-950/60 border border-red-800/80 text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-midnight-950 border-t border-midnight-700 px-6 py-4 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-midnight-300 hover:text-white border border-midnight-700 hover:bg-midnight-800 rounded-lg transition-colors font-medium text-sm"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-midnight-300 hover:text-white border border-midnight-700 hover:bg-midnight-800 rounded-lg transition-colors font-medium text-sm"
              >
                Back
              </button>
            )}

            {step === 1 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2 bg-[#8B2332] hover:bg-[#a32a3b] text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Select File'}
              </button>
            )}

            {step === 2 && (
              <button
                onClick={processData}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50"
                disabled={isLoading || Object.keys(mappings).length === 0}
              >
                Import Products
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal;
