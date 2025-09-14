import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchMyOrders } from '../api/myOrders';
import { updateUserProfile, getUserProfile } from '../api/auth';
import LoadingSpinner, { InlineLoader } from '../components/ui/LoadingSpinner';

const Profile = () => {
  const { user, isAuthenticated, updateUserData } = useAuth();
  const { success, error: showError } = useToast();

  const [orders, setOrders] = useState([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [sameAsBilling, setSameAsBilling] = useState(true);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    shipping_address: '',
    shipping_city: '',
    shipping_state: '',
    shipping_zip_code: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip_code: '',
    preferred_address: 'shipping',
    preferred_payment_method: 'credit_card'
  });

  // Fetch user profile data from server
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isAuthenticated()) {
        setProfileLoading(false);
        return;
      }

      try {
        setProfileLoading(true);
        console.log('🔍 Profile: Fetching user profile data...');

        const profileData = await getUserProfile();
        console.log('✅ Profile: Fetched profile data:', profileData);

        // Extract the actual user data from the response
        const userData = profileData.data || profileData;

        // Update form data with fetched profile
        setFormData({
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          city: userData.city || '',
          state: userData.state || '',
          zip_code: userData.zip_code || '',
          shipping_address: userData.shipping_address || '',
          shipping_city: userData.shipping_city || '',
          shipping_state: userData.shipping_state || '',
          shipping_zip_code: userData.shipping_zip_code || '',
          billing_address: userData.billing_address || '',
          billing_city: userData.billing_city || '',
          billing_state: userData.billing_state || '',
          billing_zip_code: userData.billing_zip_code || '',
          preferred_address: userData.preferred_address || 'shipping',
          preferred_payment_method: userData.preferred_payment_method || 'credit_card'
        });

        // Update checkbox states based on loaded data
        setSameAsShipping(!userData.shipping_address);
        setSameAsBilling(!userData.billing_address);

        console.log('✅ Profile: Form data updated with profile data');
      } catch (err) {
        console.error('❌ Profile: Error fetching profile:', err);
        showError('Failed to load profile data');

        // Fall back to using data from context if API call fails
        if (user) {
          console.log('🔄 Profile: Falling back to user context data');
          setFormData({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            phone: user.phone || '',
            address: user.address || '',
            city: user.city || '',
            state: user.state || '',
            zip_code: user.zip_code || '',
            shipping_address: user.shipping_address || '',
            shipping_city: user.shipping_city || '',
            shipping_state: user.shipping_state || '',
            shipping_zip_code: user.shipping_zip_code || '',
            billing_address: user.billing_address || '',
            billing_city: user.billing_city || '',
            billing_state: user.billing_state || '',
            billing_zip_code: user.billing_zip_code || '',
            preferred_address: user.preferred_address || 'shipping',
            preferred_payment_method: user.preferred_payment_method || 'credit_card'
          });

          // Update checkbox states for fallback data
          setSameAsShipping(!user.shipping_address);
          setSameAsBilling(!user.billing_address);
        }
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [isAuthenticated, showError]); // Removed 'user' dependency to prevent infinite loops

  // Fetch recent orders
  useEffect(() => {
    const loadOrders = async () => {
      if (!isAuthenticated()) {
        setOrdersLoading(false);
        return;
      }

      setOrdersLoading(true);
      try {
        console.log('🔍 Profile: Fetching recent orders...');
        const data = await fetchMyOrders();
        // Sort by date (newest first) and take only the 5 most recent
        const sortedOrders = data.sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        ).slice(0, 5);

        setOrders(sortedOrders);
        console.log('✅ Profile: Recent orders loaded:', sortedOrders.length);
      } catch (err) {
        console.error('❌ Profile: Error loading orders:', err);
        setError('Failed to load recent orders');
      } finally {
        setOrdersLoading(false);
      }
    };

    loadOrders();
  }, [isAuthenticated]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await updateUserProfile(formData);
      console.log('Profile update response:', response);

      // Update user data in context
      updateUserData(formData);

      // Fetch fresh profile data from server
      const freshProfileResponse = await getUserProfile();
      const freshProfileData = freshProfileResponse.data || freshProfileResponse;
      console.log('Fresh profile data after update:', freshProfileData);

      // Update user data in context with fresh data from server
      updateUserData(freshProfileData);

      // Update form data with fresh data to reflect saved changes
      setFormData({
        first_name: freshProfileData.first_name || '',
        last_name: freshProfileData.last_name || '',
        email: freshProfileData.email || '',
        phone: freshProfileData.phone || '',
        address: freshProfileData.address || '',
        city: freshProfileData.city || '',
        state: freshProfileData.state || '',
        zip_code: freshProfileData.zip_code || '',
        shipping_address: freshProfileData.shipping_address || '',
        shipping_city: freshProfileData.shipping_city || '',
        shipping_state: freshProfileData.shipping_state || '',
        shipping_zip_code: freshProfileData.shipping_zip_code || '',
        billing_address: freshProfileData.billing_address || '',
        billing_city: freshProfileData.billing_city || '',
        billing_state: freshProfileData.billing_state || '',
        billing_zip_code: freshProfileData.billing_zip_code || '',
        preferred_address: freshProfileData.preferred_address || 'shipping',
        preferred_payment_method: freshProfileData.preferred_payment_method || 'credit_card'
      });

      // Update checkbox states based on saved data
      setSameAsShipping(!freshProfileData.shipping_address);
      setSameAsBilling(!freshProfileData.billing_address);

      success('Profile updated successfully');
      setEditMode(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      showError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Format date to show date and time
  const formatDate = (dateString) => {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    return new Date(dateString).toLocaleString(undefined, options);
  };

  // Function to get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-emerald-600 text-emerald-100';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAuthenticated()) {
    return (
      <div className="text-center py-12">
        <p className="text-xl mb-4">Please log in to view your profile</p>
        <Link to="/login" className="text-blue-600 hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Profile Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Personal Information</h2>
              {!editMode && !profileLoading && (
                <button
                  onClick={() => setEditMode(true)}
                  className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {profileLoading ? (
              <div className="text-center py-8">
                <LoadingSpinner size="lg" text="Loading profile..." variant="gear" />
              </div>
            ) : editMode ? (
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
                      readOnly
                      title="Name cannot be changed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Name cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
                      readOnly
                      title="Name cannot be changed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Name cannot be changed</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
                    readOnly
                    title="Email cannot be changed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <h3 className="text-lg font-semibold mb-2 mt-6">Primary Address</h3>

                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">ZIP Code</label>
                    <input
                      type="text"
                      name="zip_code"
                      value={formData.zip_code}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-2 mt-6">Shipping Address</h3>

                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="same-as-primary-shipping"
                      checked={sameAsShipping}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setSameAsShipping(isChecked);

                        if (isChecked) {
                          // Use primary address for shipping
                          setFormData(prev => ({
                            ...prev,
                            shipping_address: '',
                            shipping_city: '',
                            shipping_state: '',
                            shipping_zip_code: ''
                          }));
                        } else {
                          // Initialize with primary address
                          setFormData(prev => ({
                            ...prev,
                            shipping_address: prev.address || '',
                            shipping_city: prev.city || '',
                            shipping_state: prev.state || '',
                            shipping_zip_code: prev.zip_code || ''
                          }));
                        }
                      }}
                      className="mr-2"
                    />
                    <label htmlFor="same-as-primary-shipping" className="text-gray-700">
                      Same as primary address
                    </label>
                  </div>

                  {sameAsShipping ? (
                    <p className="text-sm text-gray-600 italic">Using primary address for shipping</p>
                  ) : (
                    <>
                      <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Address</label>
                        <input
                          type="text"
                          name="shipping_address"
                          value={formData.shipping_address}
                          onChange={handleChange}
                          className="w-full p-2 border rounded"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-gray-700 mb-2">City</label>
                          <input
                            type="text"
                            name="shipping_city"
                            value={formData.shipping_city}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 mb-2">State</label>
                          <input
                            type="text"
                            name="shipping_state"
                            value={formData.shipping_state}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 mb-2">ZIP Code</label>
                          <input
                            type="text"
                            name="shipping_zip_code"
                            value={formData.shipping_zip_code}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <h3 className="text-lg font-semibold mb-2 mt-6">Billing Address</h3>

                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="same-as-primary-billing"
                      checked={sameAsBilling}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setSameAsBilling(isChecked);

                        if (isChecked) {
                          // Use primary address for billing
                          setFormData(prev => ({
                            ...prev,
                            billing_address: '',
                            billing_city: '',
                            billing_state: '',
                            billing_zip_code: ''
                          }));
                        } else {
                          // Initialize with primary address
                          setFormData(prev => ({
                            ...prev,
                            billing_address: prev.address || '',
                            billing_city: prev.city || '',
                            billing_state: prev.state || '',
                            billing_zip_code: prev.zip_code || ''
                          }));
                        }
                      }}
                      className="mr-2"
                    />
                    <label htmlFor="same-as-primary-billing" className="text-gray-700">
                      Same as primary address
                    </label>
                  </div>

                  {sameAsBilling ? (
                    <p className="text-sm text-gray-600 italic">Using primary address for billing</p>
                  ) : (
                    <>
                      <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Address</label>
                        <input
                          type="text"
                          name="billing_address"
                          value={formData.billing_address}
                          onChange={handleChange}
                          className="w-full p-2 border rounded"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-gray-700 mb-2">City</label>
                          <input
                            type="text"
                            name="billing_city"
                            value={formData.billing_city}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 mb-2">State</label>
                          <input
                            type="text"
                            name="billing_state"
                            value={formData.billing_state}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 mb-2">ZIP Code</label>
                          <input
                            type="text"
                            name="billing_zip_code"
                            value={formData.billing_zip_code}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <h3 className="text-lg font-semibold mb-2 mt-6">Address Preferences</h3>

                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Preferred Address for Checkout</label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="shipping"
                        name="preferred_address"
                        value="shipping"
                        checked={formData.preferred_address === 'shipping'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <label htmlFor="shipping">Shipping Address</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="billing"
                        name="preferred_address"
                        value="billing"
                        checked={formData.preferred_address === 'billing'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <label htmlFor="billing">Billing Address</label>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-2 mt-6">Payment Preferences</h3>

                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Preferred Payment Method</label>
                  <select
                    name="preferred_payment_method"
                    value={formData.preferred_payment_method}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="credit_card">Credit Card</option>
                    <option value="paypal">PayPal</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded mr-2 hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center"
                    disabled={saving}
                  >
                    {saving ? (
                      <InlineLoader text="Saving..." variant="gear" size="sm" />
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600">Name</h3>
                    <p>{user.first_name} {user.last_name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600">Email</h3>
                    <p>{user.email}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600">Phone</h3>
                    <p>{user.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600">Member Since</h3>
                    <p>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-2 mt-6">Primary Address</h3>
                <p>{user.address || 'No address provided'}</p>
                {user.city && user.state && (
                  <p>{user.city}, {user.state} {user.zip_code}</p>
                )}

                <h3 className="text-lg font-semibold mb-2 mt-6">Shipping Address</h3>
                {user.shipping_address ? (
                  <>
                    <p>{user.shipping_address}</p>
                    {user.shipping_city && user.shipping_state && (
                      <p>{user.shipping_city}, {user.shipping_state} {user.shipping_zip_code}</p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-600 italic">Using primary address for shipping</p>
                )}

                <h3 className="text-lg font-semibold mb-2 mt-6">Billing Address</h3>
                {user.billing_address ? (
                  <>
                    <p>{user.billing_address}</p>
                    {user.billing_city && user.billing_state && (
                      <p>{user.billing_city}, {user.billing_state} {user.billing_zip_code}</p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-600 italic">Using primary address for billing</p>
                )}

                <h3 className="text-lg font-semibold mb-2 mt-6">Address Preferences</h3>
                <p>Preferred Address for Checkout: {formData.preferred_address === 'billing' ? 'Billing Address' : 'Shipping Address'}</p>

                <h3 className="text-lg font-semibold mb-2 mt-6">Payment Preferences</h3>
                <p>Preferred Payment Method: {formData.preferred_payment_method ?
                  formData.preferred_payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) :
                  'Not set'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recent Orders</h2>
              <Link to="/orders" className="text-blue-600 hover:underline text-sm">
                View All
              </Link>
            </div>

            {ordersLoading ? (
              <div className="text-center py-4">
                <LoadingSpinner size="md" text="Loading orders..." variant="gear" />
              </div>
            ) : error ? (
              <div className="text-center py-4 text-red-600">{error}</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-4 text-gray-600">No orders found</div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">Order #{order.id}</p>
                        <p className="text-sm text-gray-600">{formatDate(order.created_at)}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    <p className="font-medium">${parseFloat(order.total_amount).toFixed(2)}</p>
                    <div className="mt-2">
                      <Link to={`/order/${order.id}`} className="text-blue-600 hover:underline text-sm">
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
