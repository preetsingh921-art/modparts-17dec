import { useState } from 'react';
import { useToast } from '../../context/ToastContext';

const CashOnDelivery = ({ amount, onSuccess, customerInfo }) => {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success } = useToast();

  const handleConfirmOrder = async () => {
    setLoading(true);
    
    // Simulate processing time
    setTimeout(() => {
      setConfirmed(true);
      success('Order confirmed! You will pay cash on delivery.');
      onSuccess({
        payment_method: 'cash_on_delivery',
        payment_status: 'pending',
        amount: amount,
        currency: 'USD',
        transaction_id: `COD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-emerald-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-emerald-300">Cash on Delivery</h3>
            <p className="text-emerald-200/90 text-sm">Pay when your order is delivered to your doorstep</p>
          </div>
        </div>
      </div>

      <div className="bg-[#242424] border border-[#3d3d3d] rounded-lg p-4 text-[#F5F0E1]">
        <h4 className="font-semibold mb-3 text-[#F5F0E1]">Order Summary</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-[#A8A090]">Total Amount:</span>
            <span className="font-bold text-lg text-[#F5F0E1]">${amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-[#A8A090]">
            <span>Payment Method:</span>
            <span className="text-[#D4CFC0]">Cash on Delivery</span>
          </div>
          <div className="flex justify-between text-sm text-[#A8A090]">
            <span>Delivery Address:</span>
            <span className="text-right max-w-xs text-[#D4CFC0]">
              {customerInfo.firstName} {customerInfo.lastName}<br/>
              {customerInfo.address}<br/>
              {customerInfo.city}, {customerInfo.state} {customerInfo.zipCode}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg p-4">
        <h4 className="font-semibold text-amber-300 mb-2">Important Notes:</h4>
        <ul className="text-sm text-amber-200/90 space-y-1">
          <li>• Please keep the exact amount ready</li>
          <li>• Our delivery person will collect payment</li>
          <li>• You can inspect the product before payment</li>
          <li>• Delivery usually takes 2-5 business days</li>
        </ul>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="cod-terms"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="h-4 w-4 text-emerald-500 rounded border-[#444] bg-[#1a1a1a] focus:ring-emerald-500"
        />
        <label htmlFor="cod-terms" className="text-sm text-[#D4CFC0]">
          I agree to pay ${amount.toFixed(2)} in cash upon delivery
        </label>
      </div>

      <button
        onClick={handleConfirmOrder}
        disabled={!confirmed || loading}
        className="w-full bg-[#8B2332] hover:bg-[#a32a3b] text-[#F5F0E1] py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          'Confirm Order - Cash on Delivery'
        )}
      </button>
    </div>
  );
};

export default CashOnDelivery;
