import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createOrder } from '../api/orders';
import { getUserProfile } from '../api/auth';
import CashOnDelivery from '../components/payment/CashOnDelivery';
import { emailService } from '../services/emailService';
import BankTransfer from '../components/payment/BankTransfer';
import CheckPayment from '../components/payment/CheckPayment';

const Checkout = () => {
  const { cart, total, clearCart } = useCart();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    zipCode: user?.zip_code || '',
    phone: user?.phone || '',
    paymentMethod: 'cash_on_delivery'
  });

  const [step, setStep] = useState(1); // 1: Shipping Info, 2: Payment Method, 3: Payment Details
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Payment methods available
  const paymentMethods = [
    {
      id: 'cash_on_delivery',
      name: 'Cash on Delivery',
      description: 'Pay when your order is delivered',
      icon: '💵',
      popular: true
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Transfer money directly to our bank',
      icon: '🏦',
      popular: false
    },
    {
      id: 'check',
      name: 'Check / Money Order',
      description: 'Mail us a check or money order',
      icon: '📝',
      popular: false
    }
  ];

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const profileResponse = await getUserProfile();
        const profileData = profileResponse.data || profileResponse;

        console.log('🔍 Checkout: Profile data for pre-population:', profileData);

        setFormData(prevData => ({
          ...prevData,
          firstName: profileData.first_name || user.first_name || '',
          lastName: profileData.last_name || user.last_name || '',
          email: profileData.email || user.email || '',
          address: profileData.address || user.address || '',
          city: profileData.city || user.city || '',
          state: profileData.state || user.state || '',
          zipCode: profileData.zip_code || user.zip_code || '',
          phone: profileData.phone || user.phone || ''
        }));

        console.log('✅ Checkout: Form data updated with profile data');
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    setStep(2); // Move to payment method selection
  };

  const handlePaymentMethodSelect = (method) => {
    setFormData(prev => ({ ...prev, paymentMethod: method }));
    setStep(3); // Move to payment details
  };

  const handlePaymentSuccess = async (paymentData) => {
    setLoading(true);
    try {
      // Prepare order data
      const orderItems = cart.map(item => ({
        product_id: item.product_id || item.id,
        quantity: item.quantity,
        price: item.price
      }));

      const shippingAddress = `${formData.firstName} ${formData.lastName}, ${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}, Phone: ${formData.phone}`;

      const orderData = {
        items: orderItems,
        total_amount: total,
        shipping_address: shippingAddress,
        payment_method: paymentData.payment_method,
        payment_status: paymentData.payment_status,
        transaction_id: paymentData.transaction_id,
        reference_number: paymentData.reference_number || null,
        order_number: paymentData.order_number || null,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode,
        phone: formData.phone
      };

      // Create order
      const response = await createOrder(orderData);

      if (!response || !response.order_id) {
        throw new Error('Invalid response from server');
      }

      // Send order confirmation email (non-blocking)
      try {
        console.log('📧 Sending order confirmation email for order:', response.order_id);
        await emailService.sendOrderConfirmation(response.order);
        console.log('✅ Order confirmation email sent successfully');
      } catch (emailError) {
        console.error('❌ Failed to send order confirmation email:', emailError);
        // Don't block order completion for email failures
      }

      // Clear cart and redirect
      await clearCart();
      success('Order placed successfully! Check your email for confirmation.');
      navigate(`/order-confirmation/${response.order_id}`);
    } catch (err) {
      console.error('Error creating order:', err);
      showError('Order creation failed. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-[#1a1a1a] min-h-screen">
      <h1
        className="text-3xl font-bold mb-6 text-[#F5F0E1] uppercase tracking-wide"
        style={{ fontFamily: "'Oswald', sans-serif" }}
      >
        Checkout
      </h1>

      {/* Progress Indicator */}
      <div className="flex items-center mb-8">
        <div className={`flex items-center ${step >= 1 ? 'text-[#B8860B]' : 'text-gray-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-[#8B2332] text-white' : 'bg-gray-600'}`}>
            1
          </div>
          <span className="ml-2">Shipping</span>
        </div>
        <div className={`w-16 h-1 mx-4 ${step >= 2 ? 'bg-[#8B2332]' : 'bg-gray-600'}`}></div>
        <div className={`flex items-center ${step >= 2 ? 'text-[#B8860B]' : 'text-gray-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-[#8B2332] text-white' : 'bg-gray-600'}`}>
            2
          </div>
          <span className="ml-2">Payment Method</span>
        </div>
        <div className={`w-16 h-1 mx-4 ${step >= 3 ? 'bg-[#8B2332]' : 'bg-gray-600'}`}></div>
        <div className={`flex items-center ${step >= 3 ? 'text-[#B8860B]' : 'text-gray-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-[#8B2332] text-white' : 'bg-gray-600'}`}>
            3
          </div>
          <span className="ml-2">Payment</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3">
          {step === 1 && (
            // Shipping Information Step
            <form onSubmit={handleShippingSubmit}>
              <div className="bg-[#242424] border border-[#333] rounded-lg p-6 mb-6">
                <h2
                  className="text-xl font-bold mb-4 text-[#F5F0E1]"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  Shipping Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="form-label-vintage">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="form-input-vintage"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label-vintage">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="form-input-vintage"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label-vintage">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input-vintage"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label-vintage">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="form-input-vintage"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="form-label-vintage">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="form-input-vintage"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label-vintage">State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="form-input-vintage"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label-vintage">Zip Code</label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      className="form-input-vintage"
                      required
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="form-label-vintage">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-input-vintage"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-vintage-red w-full"
                >
                  Continue to Payment Method
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            // Payment Method Selection
            <div className="bg-[#242424] border border-[#333] rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                <button
                  onClick={() => setStep(1)}
                  className="text-[#B8860B] hover:text-[#d4a50d] mr-4"
                >
                  ← Back to Shipping
                </button>
                <h2
                  className="text-xl font-bold text-[#F5F0E1]"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  Choose Payment Method
                </h2>
              </div>

              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    onClick={() => handlePaymentMethodSelect(method.id)}
                    className="border border-[#444] rounded-lg p-4 cursor-pointer hover:border-[#8B2332] hover:bg-[#333] transition-colors relative"
                  >
                    {method.popular && (
                      <span className="absolute top-2 right-2 bg-[#8B2332] text-white text-xs px-2 py-1 rounded">
                        Popular
                      </span>
                    )}
                    <div className="flex items-center">
                      <span className="text-2xl mr-4">{method.icon}</span>
                      <div>
                        <h3 className="font-semibold text-[#F5F0E1]">{method.name}</h3>
                        <p className="text-[#A8A090] text-sm">{method.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            // Payment Details
            <div className="bg-[#242424] border border-[#333] rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                <button
                  onClick={() => setStep(2)}
                  className="text-[#B8860B] hover:text-[#d4a50d] mr-4"
                >
                  ← Back to Payment Method
                </button>
                <h2
                  className="text-xl font-bold text-[#F5F0E1]"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  Payment Details
                </h2>
              </div>

              {formData.paymentMethod === 'cash_on_delivery' && (
                <CashOnDelivery
                  amount={total}
                  onSuccess={handlePaymentSuccess}
                  customerInfo={formData}
                />
              )}

              {formData.paymentMethod === 'bank_transfer' && (
                <BankTransfer
                  amount={total}
                  onSuccess={handlePaymentSuccess}
                  customerInfo={formData}
                />
              )}

              {formData.paymentMethod === 'check' && (
                <CheckPayment
                  amount={total}
                  onSuccess={handlePaymentSuccess}
                  customerInfo={formData}
                />
              )}
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:w-1/3">
          <div className="bg-[#242424] border border-[#333] rounded-lg p-6 sticky top-4">
            <h2
              className="text-xl font-bold mb-4 text-[#F5F0E1]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Order Summary
            </h2>

            <div className="mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between py-2 border-b border-[#444]">
                  <div>
                    <p className="font-semibold text-[#F5F0E1]">{item.name}</p>
                    <p className="text-sm text-[#A8A090]">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-[#D4CFC0]">
                    ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-[#444] pt-4 mb-4">
              <div className="flex justify-between mb-2 text-[#D4CFC0]">
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2 text-[#A8A090]">
                <span>Shipping</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between mb-2 text-[#A8A090]">
                <span>Tax</span>
                <span>$0.00</span>
              </div>
            </div>

            <div className="flex justify-between font-bold text-lg border-t border-[#444] pt-4 text-[#F5F0E1]">
              <span>Total</span>
              <span className="text-[#8B2332]">${total.toFixed(2)}</span>
            </div>

            {step >= 2 && (
              <div className="mt-4 p-3 bg-[#333] rounded">
                <p className="text-sm text-[#A8A090]">Payment Method:</p>
                <p className="font-semibold text-[#F5F0E1]">
                  {paymentMethods.find(m => m.id === formData.paymentMethod)?.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
