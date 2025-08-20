import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

const UserFormModal = ({ isOpen, onClose, onSave, user }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    role: 'customer'
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (isOpen) {
      if (user) {
        // Edit mode - pre-fill form with user data
        setFormData({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          password: '', // Don't pre-fill password
          confirm_password: '',
          phone: user.phone || '',
          address: user.address || '',
          city: user.city || '',
          state: user.state || '',
          zip_code: user.zip_code || '',
          role: user.role || 'customer'
        });
      } else {
        // Add mode - reset form
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          confirm_password: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          role: 'customer'
        });
      }
      setErrors({});
    }
  }, [isOpen, user]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    
    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation for new users
    if (!user) {
      if (!formData.password) newErrors.password = 'Password is required';
      if (formData.password && formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (!formData.confirm_password) newErrors.confirm_password = 'Please confirm your password';
      if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match';
      }
    } else if (formData.password) {
      // Password validation for existing users (only if they're changing it)
      if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (!formData.confirm_password) newErrors.confirm_password = 'Please confirm your password';
      if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data for API
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        role: formData.role
      };
      
      // Only include password if it's provided
      if (formData.password) {
        userData.password = formData.password;
      }
      
      await onSave(userData);
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Edit User' : 'Add New User'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${errors.first_name ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.first_name && (
              <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${errors.last_name ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.last_name && (
              <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {!user && '*'}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
              placeholder={user ? 'Leave blank to keep current' : ''}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password {!user && '*'}
            </label>
            <input
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${errors.confirm_password ? 'border-red-500' : 'border-gray-300'}`}
              placeholder={user ? 'Leave blank to keep current' : ''}
            />
            {errors.confirm_password && (
              <p className="text-red-500 text-xs mt-1">{errors.confirm_password}</p>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="3"
            className="w-full p-2 border border-gray-300 rounded"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code
            </label>
            <input
              type="text"
              name="zip_code"
              value={formData.zip_code}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save User'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserFormModal;
