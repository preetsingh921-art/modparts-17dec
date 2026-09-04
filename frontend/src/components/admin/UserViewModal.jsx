import Modal from '../ui/Modal';

const UserViewModal = ({ isOpen, onClose, user }) => {
  if (!user) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Information"
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-midnight-800/80 border border-midnight-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-midnight-400 mb-1">First Name</label>
              <p className="text-sm text-midnight-100 font-medium">{user.first_name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-midnight-400 mb-1">Last Name</label>
              <p className="text-sm text-midnight-100 font-medium">{user.last_name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-midnight-400 mb-1">Email</label>
              <p className="text-sm text-midnight-100 font-medium break-all">{user.email || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-midnight-400 mb-1">Phone</label>
              <p className="text-sm text-midnight-100 font-medium">{user.phone || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-midnight-400 mb-1">Role</label>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                user.role === 'admin' ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300' : 'bg-slate-800 border border-slate-600 text-slate-300'
              }`}>
                {user.role || 'customer'}
              </span>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-midnight-400 mb-1">Account Created</label>
              <p className="text-sm text-midnight-100 font-medium">{formatDate(user.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-midnight-800/80 border border-midnight-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Address Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-midnight-400 mb-1">Street Address</label>
              <p className="text-sm text-midnight-100 font-medium">{user.address || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-midnight-400 mb-1">City</label>
              <p className="text-sm text-midnight-100 font-medium">{user.city || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-midnight-400 mb-1">State</label>
              <p className="text-sm text-midnight-100 font-medium">{user.state || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-midnight-400 mb-1">ZIP Code</label>
              <p className="text-sm text-midnight-100 font-medium">{user.zip_code || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="bg-midnight-800/80 border border-midnight-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Account Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-midnight-400 mb-1">User ID</label>
              <p className="text-sm text-midnight-100 font-mono">{user.id}</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-midnight-400 mb-1">Status</label>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                user.status === 'active' || !user.status ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300' :
                user.status === 'blocked' ? 'bg-red-950/80 border border-red-700 text-red-300' :
                'bg-amber-950/80 border border-amber-700 text-amber-300'
              }`}>
                {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-midnight-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-midnight-700 border border-midnight-600 rounded text-midnight-100 hover:bg-midnight-600 transition-colors font-medium text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UserViewModal;
