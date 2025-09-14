import { useState } from 'react';

const Pagination = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onItemsPerPageChange
}) => {
  const [jumpToPage, setJumpToPage] = useState('');
  // If itemsPerPage is set to -1, it means "All"
  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalItems / itemsPerPage);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; // Show at most 5 page numbers

    if (totalPages <= maxPagesToShow) {
      // If we have 5 or fewer pages, show all of them
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);

      // Calculate start and end of page numbers to show
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're at the beginning
      if (currentPage <= 2) {
        end = Math.min(totalPages - 1, 4);
      }

      // Adjust if we're at the end
      if (currentPage >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }

      // Add ellipsis after first page if needed
      if (start > 2) {
        pageNumbers.push('...');
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pageNumbers.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleJumpToPage = (e) => {
    e.preventDefault();
    const page = parseInt(jumpToPage, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
      setJumpToPage('');
    }
  };

  const handleItemsPerPageChange = (e) => {
    // Handle "All" option (value -1) or numeric values
    const newItemsPerPage = e.target.value === 'all' ? -1 : parseInt(e.target.value, 10);
    onItemsPerPageChange(newItemsPerPage);
    // Reset to first page when changing items per page
    onPageChange(1);
  };

  if (totalPages <= 1) {
    return null; // Don't show pagination if there's only one page
  }

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mt-6 space-y-4 md:space-y-0">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">Show</span>
        <select
          className="border rounded p-1 text-sm"
          value={itemsPerPage === -1 ? 'all' : itemsPerPage}
          onChange={handleItemsPerPageChange}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value="all">All</option>
        </select>
        <span className="text-sm text-gray-600">per page</span>
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded border ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-slate-700 text-emerald-400 hover:bg-slate-600'
          }`}
        >
          Previous
        </button>

        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            className={`px-3 py-1 rounded border ${
              page === currentPage
                ? 'bg-emerald-600 text-white'
                : page === '...'
                ? 'bg-slate-600 text-slate-400 cursor-default'
                : 'bg-slate-700 text-emerald-400 hover:bg-slate-600'
            }`}
            disabled={page === '...'}
          >
            {page}
          </button>
        ))}

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded border ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-blue-600 hover:bg-blue-50'
          }`}
        >
          Next
        </button>
      </div>

      <div className="flex items-center space-x-2">
        <form onSubmit={handleJumpToPage} className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Go to</span>
          <input
            type="text"
            value={jumpToPage}
            onChange={(e) => setJumpToPage(e.target.value)}
            className="border rounded p-1 w-12 text-center text-sm"
            aria-label="Jump to page"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
          >
            Go
          </button>
        </form>
      </div>
    </div>
  );
};

export default Pagination;
