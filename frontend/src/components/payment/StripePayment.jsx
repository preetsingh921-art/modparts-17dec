import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useToast } from '../../context/ToastContext';

// Load Stripe (replace with your publishable key)
const stripePromise = loadStripe('pk_test_your_stripe_publishable_key_here');

const CheckoutForm = ({ amount, onSuccess, onError, customerInfo }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Create payment intent on your backend
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: amount * 100, // Stripe uses cents
          currency: 'usd',
          customer_info: customerInfo
        })
      });

      const { client_secret } = await response.json();

      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: `${customerInfo.firstName} ${customerInfo.lastName}`,
            email: customerInfo.email,
            address: {
              line1: customerInfo.address,
              city: customerInfo.city,
              state: customerInfo.state,
              postal_code: customerInfo.zipCode
            }
          }
        }
      });

      if (error) {
        showError(error.message);
        onError(error);
      } else if (paymentIntent.status === 'succeeded') {
        success('Payment successful!');
        onSuccess(paymentIntent);
      }
    } catch (err) {
      showError('Payment failed. Please try again.');
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-[#242424] border border-[#3d3d3d] rounded-lg">
        <label className="block text-sm font-medium text-[#D4CFC0] mb-2">
          Card Details
        </label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#F5F0E1',
                '::placeholder': {
                  color: '#888888',
                },
              },
            },
          }}
        />
      </div>
      
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-[#8B2332] hover:bg-[#a32a3b] text-[#F5F0E1] py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
};

const StripePayment = ({ amount, onSuccess, onError, customerInfo }) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm 
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
        customerInfo={customerInfo}
      />
    </Elements>
  );
};

export default StripePayment;
