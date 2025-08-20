// Admin Reviews Management Page
// Allows admins to moderate and manage product reviews

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllReviews, moderateReview, deleteReview } from '../../api/reviews';
import { useToast } from '../../context/ToastContext';
import StarRating from '../../components/ui/StarRating';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import useConfirm from '../../hooks/useConfirm';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  
  const { success, error: showError } = useToast();
  const { isOpen, confirm, handleClose, handleConfirm, dialogProps } = useConfirm();

  useEffect(() => {
    loadReviews();
  }, [filter, currentPage]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getAllReviews({
        page: currentPage,
        limit: 20,
        status: filter
      });
      
      setReviews(data.reviews || []);
      setPagination(data.pagination || {});
      
    } catch (err) {
      setError(err.message);
      showError('Failed to load reviews: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModerateReview = async (reviewId, isApproved) => {
    try {
      await moderateReview(reviewId, isApproved);
      success(`Review ${isApproved ? 'approved' : 'rejected'} successfully`);
      loadReviews();
    } catch (err) {
      showError('Failed to moderate review: ' + err.message);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await confirm({
        title: 'Delete Review',
        message: 'Are you sure you want to delete this review? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmButtonClass: 'bg-red-600 hover:bg-red-700'
      });

      // If user confirms, proceed with deletion
      try {
        await deleteReview(reviewId);
        success('Review deleted successfully');
        loadReviews();
      } catch (err) {
        showError('Failed to delete review: ' + err.message);
      }
    } catch {
      // User cancelled the dialog
      console.log('Review deletion cancelled');
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Reviews' },
    { value: 'pending', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' }
  ];

  if (loading && reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner size="xl" text="Loading reviews..." variant="gear" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Review Management</h1>
          <p className="text-gray-400 mt-1">Moderate and manage customer reviews</p>
        </div>
        
        <Link
          to="/admin"
          className="flex items-center bg-midnight-700 text-midnight-50 px-4 py-2 rounded hover:bg-midnight-600 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <label className="text-white font-medium">Filter by status:</label>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-midnight-800 border border-midnight-600 text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            {filterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="text-gray-400 text-sm ml-auto">
            {pagination.total || 0} total reviews
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {error ? (
        <div className="text-center py-8">
          <div className="bg-red-900 border border-red-700 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-red-100 font-semibold mb-2">Error Loading Reviews</h3>
            <p className="text-red-200 mb-4">{error}</p>
            <button
              onClick={loadReviews}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-8">
            <h3 className="text-white font-semibold mb-2">No Reviews Found</h3>
            <p className="text-gray-400">
              {filter === 'pending' 
                ? 'No reviews are pending approval' 
                : filter === 'approved'
                ? 'No approved reviews found'
                : 'No reviews have been submitted yet'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              onApprove={(id) => handleModerateReview(id, true)}
              onReject={(id) => handleModerateReview(id, false)}
              onDelete={handleDeleteReview}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2 mt-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-midnight-800 border border-midnight-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-midnight-700"
          >
            Previous
          </button>
          
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            const page = i + 1;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 border rounded ${
                  currentPage === page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-midnight-800 border-midnight-600 text-white hover:bg-midnight-700'
                }`}
              >
                {page}
              </button>
            );
          })}
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
            disabled={currentPage === pagination.totalPages}
            className="px-4 py-2 bg-midnight-800 border border-midnight-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-midnight-700"
          >
            Next
          </button>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={dialogProps.title}
        message={dialogProps.message}
        confirmText={dialogProps.confirmText}
        cancelText={dialogProps.cancelText}
        confirmButtonClass={dialogProps.confirmButtonClass}
      />
    </div>
  );
};

// Individual Review Card Component
const ReviewCard = ({ review, onApprove, onReject, onDelete }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
      {/* Review Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-white font-semibold">
              {review.users?.first_name} {review.users?.last_name}
            </span>
            <span className="text-gray-400 text-sm">({review.users?.email})</span>
            {review.is_verified_purchase && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                Verified Purchase
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-gray-400 text-sm">
              Product: <span className="text-white">{review.products?.name}</span>
            </span>
            <span className="text-gray-400 text-sm">
              {formatDate(review.created_at)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            review.is_approved 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {review.is_approved ? 'Approved' : 'Pending'}
          </span>
        </div>
      </div>

      {/* Review Content */}
      <div className="space-y-3 mb-4">
        {review.review_title && (
          <h4 className="font-semibold text-white">{review.review_title}</h4>
        )}
        {review.review_text && (
          <p className="text-gray-300 leading-relaxed">{review.review_text}</p>
        )}
      </div>

      {/* Review Stats */}
      <div className="flex items-center space-x-4 mb-4 text-sm text-gray-400">
        <span>Helpful votes: {review.helpful_count}</span>
        {review.updated_at !== review.created_at && (
          <span>Updated: {formatDate(review.updated_at)}</span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4 border-t border-midnight-700">
        {!review.is_approved && (
          <button
            onClick={() => onApprove(review.id)}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approve
          </button>
        )}
        
        {review.is_approved && (
          <button
            onClick={() => onReject(review.id)}
            className="flex items-center bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </button>
        )}
        
        <button
          onClick={() => onDelete(review.id)}
          className="flex items-center bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
};

export default AdminReviews;
