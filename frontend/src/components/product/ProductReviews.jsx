// Product Reviews Component
// Displays and manages product reviews and ratings

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  voteReviewHelpfulness,
  formatReviewDate,
  getRelativeTime
} from '../../api/reviews';
import StarRating, { RatingDisplay, RatingInput, RatingDistribution } from '../ui/StarRating';
import LoadingSpinner from '../ui/LoadingSpinner';
import ConfirmDialog from '../ui/ConfirmDialog';
import useConfirm from '../../hooks/useConfirm';

const ProductReviews = ({ productId, productName }) => {
  const [reviews, setReviews] = useState([]);
  const [statistics, setStatistics] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  
  const { user, isAuthenticated } = useAuth();
  const { success, error: showError } = useToast();
  const { isOpen, confirm, handleClose, handleConfirm, dialogProps } = useConfirm();

  // Load reviews on component mount and when filters change
  useEffect(() => {
    loadReviews();
  }, [productId, sortBy, currentPage]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getProductReviews(productId, {
        page: currentPage,
        limit: 10,
        sort: sortBy
      });
      
      setReviews(data.reviews || []);
      setStatistics(data.statistics || {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {}
      });
      setPagination(data.pagination || {});
      
    } catch (err) {
      setError(err.message);
      showError('Failed to load reviews: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReview = async (reviewData) => {
    try {
      const newReview = await createReview({
        productId,
        ...reviewData
      });
      
      success('Review submitted successfully!');
      setShowReviewForm(false);
      loadReviews(); // Reload to get updated data
      
    } catch (err) {
      showError('Failed to submit review: ' + err.message);
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

  const handleHelpfulVote = async (reviewId, isHelpful) => {
    if (!isAuthenticated) {
      showError('Please log in to vote on reviews');
      return;
    }
    
    try {
      await voteReviewHelpfulness(reviewId, isHelpful);
      success('Vote recorded successfully');
      loadReviews(); // Reload to get updated helpful counts
    } catch (err) {
      showError('Failed to record vote: ' + err.message);
    }
  };

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'highest_rating', label: 'Highest Rating' },
    { value: 'lowest_rating', label: 'Lowest Rating' },
    { value: 'most_helpful', label: 'Most Helpful' }
  ];

  if (loading && reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner size="lg" text="Loading reviews..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reviews Header */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Customer Reviews</h3>
        
        {/* Rating Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overall Rating */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="text-4xl font-bold text-gray-900">
                {statistics.averageRating.toFixed(1)}
              </div>
              <div>
                <RatingDisplay 
                  rating={statistics.averageRating} 
                  reviewCount={statistics.totalReviews}
                  size="lg"
                />
              </div>
            </div>
            
            {isAuthenticated && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Write a Review
              </button>
            )}
          </div>
          
          {/* Rating Distribution */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Rating Breakdown</h4>
            <RatingDistribution 
              distribution={statistics.ratingDistribution}
              totalReviews={statistics.totalReviews}
            />
          </div>
        </div>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <ReviewForm
          productName={productName}
          onSubmit={handleCreateReview}
          onCancel={() => setShowReviewForm(false)}
        />
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {/* Sort Controls */}
        {reviews.length > 0 && (
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold text-gray-900">
              {statistics.totalReviews} Review{statistics.totalReviews !== 1 ? 's' : ''}
            </h4>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reviews */}
        {error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={loadReviews}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No reviews yet</div>
            <p className="text-gray-400 mb-6">Be the first to review this product!</p>
            {isAuthenticated && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Write the First Review
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map(review => (
              <ReviewItem
                key={review.id}
                review={review}
                currentUser={user}
                onDelete={handleDeleteReview}
                onHelpfulVote={handleHelpfulVote}
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
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 border rounded-lg ${
                  currentPage === page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
              disabled={currentPage === pagination.totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

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

// Individual Review Item Component
const ReviewItem = ({ review, currentUser, onDelete, onHelpfulVote }) => {
  const isOwnReview = currentUser && currentUser.id === review.user.id;

  return (
    <div className="border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Review Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <StarRating rating={review.rating} size="sm" />
            <span className="font-semibold text-gray-900">{review.user.name}</span>
            {review.isVerifiedPurchase && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                Verified Purchase
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {getRelativeTime(review.createdAt)}
          </div>
        </div>
        
        {isOwnReview && (
          <button
            onClick={() => onDelete(review.id)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Delete
          </button>
        )}
      </div>

      {/* Review Content */}
      <div className="space-y-3">
        {review.title && (
          <h4 className="font-semibold text-gray-900">{review.title}</h4>
        )}
        {review.text && (
          <p className="text-gray-700 leading-relaxed">{review.text}</p>
        )}
      </div>

      {/* Review Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onHelpfulVote(review.id, true)}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7m5 3v10M9 7H6a2 2 0 00-2 2v8a2 2 0 002 2h8.5" />
            </svg>
            <span>Helpful ({review.helpfulCount})</span>
          </button>
          
          <button
            onClick={() => onHelpfulVote(review.id, false)}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17m-5-3v-10M15 17h4a2 2 0 002-2V7a2 2 0 00-2-2H6.5" />
            </svg>
            <span>Not Helpful ({review.notHelpfulCount || 0})</span>
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          {formatReviewDate(review.createdAt)}
        </div>
      </div>
    </div>
  );
};

// Review Form Component
const ReviewForm = ({ productName, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    text: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
      newErrors.rating = 'Please select a rating';
    }
    
    if (formData.title && formData.title.length > 255) {
      newErrors.title = 'Title must be 255 characters or less';
    }
    
    if (formData.text && formData.text.length > 5000) {
      newErrors.text = 'Review must be 5000 characters or less';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Write a Review</h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900">{productName}</h4>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating Input */}
            <RatingInput
              value={formData.rating}
              onChange={(rating) => setFormData(prev => ({ ...prev, rating }))}
              required
              error={errors.rating}
              label="Overall Rating"
            />

            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Title (Optional)
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Summarize your review"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={255}
              />
              {errors.title && (
                <p className="text-sm text-red-600 mt-1">{errors.title}</p>
              )}
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review (Optional)
              </label>
              <textarea
                value={formData.text}
                onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Share your experience with this product"
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={5000}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.text && (
                  <p className="text-sm text-red-600">{errors.text}</p>
                )}
                <p className="text-sm text-gray-500 ml-auto">
                  {formData.text.length}/5000 characters
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 pt-6">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductReviews;
