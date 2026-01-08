import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import Papa from 'papaparse';

// Sample CSV data for the template
const sampleCsvData = [
  ['name', 'price', 'category_id', 'quantity', 'description', 'condition_status', 'part_number', 'barcode', 'warehouse_id', 'bin_number'],
  ['Universal Piston Kit', '149.99', 'Engine Parts', '10', 'High-quality universal piston kit.', 'New', 'PK-001', '123456789', '1', 'A-01'],
  ['Front Brake Caliper', '89.95', 'Brakes', '5', 'Refurbished front brake caliper.', 'Refurbished', 'BC-102', '', '1', 'B-05'],
  ['Electrical Wiring Harness', '75.50', 'Electrical', '8', 'Complete wiring harness.', 'New', 'WH-200', '', '2', 'C-10'],
  ['Carburetor Rebuild Kit', '45.00', 'Engine Parts', '15', 'Complete rebuild kit.', 'New', 'CRK-55', '', '1', 'A-02'],
  ['Headlight Assembly', '65.75', 'Bodywork', '3', 'Chrome headlight assembly.', 'Used', 'HL-88', '', '2', 'D-03']
];

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
  const [previewData, setPreviewData] = useState([]);
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
      setPreviewData([]);
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

        // Create initial mappings (auto-map fields with matching names)
        const initialMappings = {};
        headers.forEach(header => {
          const normalizedHeader = header.toLowerCase().trim().replace(/\s+/g, '_');
          if (requiredFields.includes(normalizedHeader)) {
            initialMappings[normalizedHeader] = header;
          }
        });
        setMappings(initialMappings);

        // Set parsed data and preview (first 5 rows)
        setParsedData(results.data);
        setPreviewData(results.data.slice(0, 5));
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-800 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Import Products from CSV</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Upload CSV */}
          {step === 1 && (
            <div>
              <p className="mb-4 text-gray-700">
                Upload a CSV file containing product data. The file should have columns for product name, price, category, and quantity.
              </p>

              <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md">
                <p className="text-sm">
                  <strong>Tip:</strong> You can <button
                    onClick={downloadSampleCsv}
                    className="text-blue-600 underline hover:text-blue-800 bg-transparent border-none p-0 cursor-pointer font-normal"
                    type="button"
                  >
                    download a sample CSV file
                  </button> to see the expected format.
                </p>

                <div className="mt-2 pt-2 border-t border-blue-100">
                  <p className="text-sm font-semibold">Available Categories:</p>
                  <div className="mt-1 text-xs grid grid-cols-2 md:grid-cols-3 gap-1">
                    {categories.map(category => (
                      <div key={category.id} className="flex items-center">
                        <span className="font-medium">{category.id}:</span> {category.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">Drag and drop a CSV file here, or click to select a file</p>
                {fileName && <p className="mt-2 text-blue-600">{fileName}</p>}
              </div>
            </div>
          )}

          {/* Step 2: Preview Data */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Preview Data</h3>
              <p className="mb-4 text-gray-700">
                Review the first 5 rows of your CSV file and map the columns to product fields.
              </p>

              {previewData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {headers.map((header, index) => (
                          <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {header}
                            <select
                              className="block w-full mt-1 text-sm border-gray-300 rounded-md"
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
                            </select>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {headers.map((header, colIndex) => (
                            <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {row[header]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>

          <div>
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 mr-2"
              >
                Back
              </button>
            )}

            {step === 1 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Select File'}
              </button>
            )}

            {step === 2 && (
              <button
                onClick={processData}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
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
