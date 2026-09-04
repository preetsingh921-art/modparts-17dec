import { useEffect, useState } from 'react';

/**
 * A reusable confirm dialog component
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {Function} props.onClose - Function to call when the dialog is closed
 * @param {Function} props.onConfirm - Function to call when the user confirms
 * @param {string} props.title - The dialog title
 * @param {string} props.message - The dialog message
 * @param {string} props.confirmText - The text for the confirm button
 * @param {string} props.cancelText - The text for the cancel button
 * @param {string} props.confirmButtonClass - Additional classes for the confirm button
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Handle animation when opening/closing
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);
  
  // Handle confirm action
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };
  
  // If dialog is not open, don't render anything
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      ></div>
      
      {/* Dialog */}
      <div className="flex items-center justify-center min-h-screen px-4 py-6 text-center sm:p-0">
        <div 
          className={`inline-block align-bottom bg-[#242424] border border-[#3d3d3d] rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="bg-[#242424] px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-950/80 border border-red-800 sm:mx-0 sm:h-10 sm:w-10">
                <svg className="h-6 w-6 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-bold text-[#F5F0E1]">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-[#D4CFC0]">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#1e1e1e] border-t border-[#333] px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-semibold text-white focus:outline-none sm:ml-3 sm:w-auto sm:text-sm transition-colors ${confirmButtonClass}`}
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-[#444] shadow-sm px-4 py-2 bg-[#2d2d2d] text-base font-medium text-[#D4CFC0] hover:bg-[#383838] hover:text-[#F5F0E1] focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
              onClick={onClose}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
