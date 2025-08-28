import { useState, useEffect } from 'react';

const PasswordStrengthIndicator = ({ password, userInfo = {} }) => {
  const [strength, setStrength] = useState('none');
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [requirements, setRequirements] = useState([]);

  // Password requirements
  const PASSWORD_REQUIREMENTS = [
    { id: 'length', text: 'At least 8 characters long', regex: /.{8,}/ },
    { id: 'uppercase', text: 'At least one uppercase letter (A-Z)', regex: /[A-Z]/ },
    { id: 'lowercase', text: 'At least one lowercase letter (a-z)', regex: /[a-z]/ },
    { id: 'number', text: 'At least one number (0-9)', regex: /[0-9]/ },
    { id: 'special', text: 'At least one special character (!@#$%^&*)', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/ }
  ];

  // Common weak passwords
  const COMMON_PASSWORDS = [
    'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
    'password1', 'admin', 'letmein', 'welcome', 'monkey', '1234567890'
  ];

  useEffect(() => {
    if (!password) {
      setStrength('none');
      setErrors([]);
      setWarnings([]);
      setRequirements([]);
      return;
    }

    validatePassword(password);
  }, [password, userInfo]);

  const validatePassword = (pwd) => {
    const newErrors = [];
    const newWarnings = [];
    const metRequirements = [];

    // Check each requirement
    PASSWORD_REQUIREMENTS.forEach(req => {
      const isMet = req.regex.test(pwd);
      metRequirements.push({
        ...req,
        met: isMet
      });
      
      if (!isMet) {
        newErrors.push(req.text);
      }
    });

    // Check for common passwords
    if (COMMON_PASSWORDS.includes(pwd.toLowerCase())) {
      newErrors.push('This password is too common. Please choose a more unique password');
    }

    // Check for simple patterns
    if (/^(.)\1+$/.test(pwd)) {
      newErrors.push('Password cannot be all the same character');
    }

    if (/^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(pwd)) {
      newErrors.push('Password cannot contain simple sequences');
    }

    if (/^(qwerty|asdfgh|zxcvbn|qwertyui|asdfghjk|zxcvbnm)/i.test(pwd)) {
      newErrors.push('Password cannot be based on keyboard patterns');
    }

    // Check personal information
    if (userInfo) {
      const personalData = [
        userInfo.firstName,
        userInfo.lastName,
        userInfo.email?.split('@')[0],
        userInfo.phone
      ].filter(Boolean);

      for (const data of personalData) {
        if (data && pwd.toLowerCase().includes(data.toLowerCase())) {
          newErrors.push('Password cannot contain your personal information');
          break;
        }
      }
    }

    // Calculate strength
    const strengthScore = calculateStrength(pwd);
    
    // Add warnings
    if (strengthScore === 'weak') {
      newWarnings.push('Consider using a longer password with more variety');
    } else if (strengthScore === 'medium') {
      newWarnings.push('Good password! Consider adding more special characters for extra security');
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    setRequirements(metRequirements);
    setStrength(strengthScore);
  };

  const calculateStrength = (pwd) => {
    let score = 0;
    
    // Length scoring
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (pwd.length >= 16) score += 1;
    
    // Character variety scoring
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score += 1;
    
    // Complexity scoring
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?].*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score += 1;
    if (!/(.)\1{2,}/.test(pwd)) score += 1;
    if (pwd.length >= 20) score += 1;
    
    if (score <= 3) return 'weak';
    if (score <= 5) return 'medium';
    if (score <= 7) return 'strong';
    return 'very-strong';
  };

  const getStrengthColor = () => {
    switch (strength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-blue-500';
      case 'very-strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getStrengthWidth = () => {
    switch (strength) {
      case 'weak': return 'w-1/4';
      case 'medium': return 'w-2/4';
      case 'strong': return 'w-3/4';
      case 'very-strong': return 'w-full';
      default: return 'w-0';
    }
  };

  if (!password) return null;

  return (
    <div className="mt-3 space-y-3">
      {/* Strength Bar */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">Password Strength</span>
          <span className={`text-sm font-medium capitalize ${
            strength === 'weak' ? 'text-red-600' :
            strength === 'medium' ? 'text-yellow-600' :
            strength === 'strong' ? 'text-blue-600' :
            strength === 'very-strong' ? 'text-green-600' :
            'text-gray-500'
          }`}>
            {strength === 'very-strong' ? 'Very Strong' : strength}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()} ${getStrengthWidth()}`}></div>
        </div>
      </div>

      {/* Requirements Checklist */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Password Requirements</h4>
        <div className="space-y-1">
          {requirements.map((req) => (
            <div key={req.id} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                req.met ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {req.met && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${req.met ? 'text-green-700' : 'text-gray-600'}`}>
                {req.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <h4 className="text-sm font-medium text-red-800 mb-1">Password Issues</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start space-x-1">
                <span className="text-red-500 mt-0.5">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && errors.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <h4 className="text-sm font-medium text-yellow-800 mb-1">Suggestions</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="flex items-start space-x-1">
                <span className="text-yellow-500 mt-0.5">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {strength === 'very-strong' && errors.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-green-800">Excellent! Your password is very strong.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;
