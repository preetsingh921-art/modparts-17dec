import { useAuth } from '../../context/AuthContext';

/**
 * Wraps admin pages that should only be fully accessible to superadmins.
 * Regular admins see a blurred version of the page with an overlay message.
 */
const SuperAdminGuard = ({ children }) => {
  const { isSuperAdmin } = useAuth();

  if (isSuperAdmin()) {
    return children;
  }

  // Regular admin sees the page blurred with an overlay
  return (
    <div className="relative min-h-[60vh]">
      {/* Blurred page content behind the overlay */}
      <div
        className="pointer-events-none select-none"
        style={{ filter: 'blur(6px)', opacity: 0.3 }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Overlay blocking access */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="bg-[#1a1a1a] border-2 border-[#B8860B]/40 rounded-2xl shadow-2xl shadow-black/60 px-10 py-8 max-w-md w-full mx-4 text-center">
          {/* Lock icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-[#B8860B]/10 border border-[#B8860B]/30 flex items-center justify-center mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#B8860B]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>

          <h2
            className="text-xl font-bold text-[#F5F0E1] uppercase tracking-wider mb-2"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Super Admin Access Required
          </h2>

          <p className="text-[#A8A090] text-sm leading-relaxed mb-6">
            This page is restricted to <span className="text-[#B8860B] font-semibold">Super Admin</span> users only. 
            Contact your Super Admin to request elevated access.
          </p>

          <div className="flex items-center justify-center gap-2 text-xs text-[#555] border-t border-[#333] pt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            You are currently logged in as <span className="text-[#A8A090] font-medium">Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminGuard;
