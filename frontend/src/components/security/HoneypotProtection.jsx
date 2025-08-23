import { useState, useRef, forwardRef, useImperativeHandle } from 'react';

/**
 * Simple but effective honeypot + timing-based bot protection
 * - Invisible field that bots fill but humans don't see
 * - Timing analysis (too fast = bot)
 * - No external dependencies or complex setup
 */
const HoneypotProtection = forwardRef(({ 
  onVerify, 
  className = '' 
}, ref) => {
  const [honeypotValue, setHoneypotValue] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const startTime = useRef(Date.now());

  // Expose verification method to parent
  useImperativeHandle(ref, () => ({
    verify: () => {
      const timeTaken = Date.now() - startTime.current;
      const isBot = honeypotValue !== '' || timeTaken < 2000; // Less than 2 seconds = likely bot
      
      if (!isBot) {
        setIsVerified(true);
        if (onVerify) {
          onVerify(true);
        }
        return true;
      } else {
        console.log('🤖 Bot detected:', { honeypotFilled: honeypotValue !== '', tooFast: timeTaken < 2000 });
        if (onVerify) {
          onVerify(false);
        }
        return false;
      }
    },
    reset: () => {
      setHoneypotValue('');
      setIsVerified(false);
      startTime.current = Date.now();
    },
    isVerified: () => isVerified
  }));

  return (
    <div className={`honeypot-protection ${className}`}>
      {/* Invisible honeypot field - bots will fill this, humans won't see it */}
      <input
        type="text"
        name="website"
        value={honeypotValue}
        onChange={(e) => setHoneypotValue(e.target.value)}
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          tabIndex: -1
        }}
        tabIndex="-1"
        autoComplete="off"
      />
      
      {/* Visual indicator for users */}
      <div className="flex items-center text-sm text-green-600">
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Protected by advanced security</span>
      </div>
    </div>
  );
});

HoneypotProtection.displayName = 'HoneypotProtection';

export default HoneypotProtection;
