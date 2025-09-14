import { useState } from 'react';
import { useToast } from '../../context/ToastContext';

const CheckPayment = ({ amount, onSuccess, customerInfo }) => {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success } = useToast();

  const orderNumber = `YRD-${Date.now()}`;
  
  const mailingAddress = {
    company: "Yamaha RD Parts",
    address: "123 Motorcycle Lane",
    city: "Bike City",
    state: "BC",
    zipCode: "12345",
    country: "USA"
  };

  const handleConfirmOrder = async () => {
    setLoading(true);
    
    setTimeout(() => {
      success('Order confirmed! Please mail your check to complete the purchase.');
      onSuccess({
        payment_method: 'check',
        payment_status: 'pending_payment',
        amount: amount,
        currency: 'USD',
        order_number: orderNumber,
        transaction_id: `CHECK_${orderNumber}`
      });
      setLoading(false);
    }, 1000);
  };

  const copyAddress = () => {
    const fullAddress = `${mailingAddress.company}\n${mailingAddress.address}\n${mailingAddress.city}, ${mailingAddress.state} ${mailingAddress.zipCode}\n${mailingAddress.country}`;
    navigator.clipboard.writeText(fullAddress);
    success('Address copied to clipboard!');
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-emerald-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Check / Money Order</h3>
            <p className="text-slate-300">Mail us a check or money order</p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-semibold mb-3">Payment Details</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Order Number:</span>
            <span className="font-bold">{orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount to Pay:</span>
            <span className="font-bold text-lg">${amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Make Check Payable To:</span>
            <span className="font-medium">{mailingAddress.company}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-semibold">Mailing Address</h4>
          <button 
            onClick={copyAddress}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            📋 Copy Address
          </button>
        </div>
        <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
          <p className="font-medium">{mailingAddress.company}</p>
          <p>{mailingAddress.address}</p>
          <p>{mailingAddress.city}, {mailingAddress.state} {mailingAddress.zipCode}</p>
          <p>{mailingAddress.country}</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">Check Writing Instructions:</h4>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Write check for exactly <strong>${amount.toFixed(2)}</strong></li>
          <li>Make payable to: <strong>{mailingAddress.company}</strong></li>
          <li>Write order number <strong>{orderNumber}</strong> in memo line</li>
          <li>Include your name and order details in the envelope</li>
          <li>Mail to the address above</li>
        </ol>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-800 mb-2">Important Notes:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Processing begins when check is received and clears</li>
          <li>• Allow 7-10 business days for check processing</li>
          <li>• Returned checks incur a $25 fee</li>
          <li>• Money orders are processed faster than personal checks</li>
          <li>• Keep a copy of your check for records</li>
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-800 mb-2">What to Include in Envelope:</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>✓ Check or money order for ${amount.toFixed(2)}</li>
          <li>✓ Order number: {orderNumber}</li>
          <li>✓ Your name: {customerInfo.firstName} {customerInfo.lastName}</li>
          <li>✓ Your email: {customerInfo.email}</li>
          <li>✓ Shipping address (if different from check address)</li>
        </ul>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="check-terms"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="h-4 w-4 text-emerald-400"
        />
        <label htmlFor="check-terms" className="text-sm text-gray-700">
          I will mail a check/money order for ${amount.toFixed(2)} to the address above
        </label>
      </div>

      <button
        onClick={handleConfirmOrder}
        disabled={!confirmed || loading}
        className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </div>
        ) : (
          'Confirm Order - I Will Mail Payment'
        )}
      </button>
    </div>
  );
};

export default CheckPayment;
