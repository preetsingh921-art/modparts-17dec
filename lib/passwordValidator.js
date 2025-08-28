/**
 * Password validation utility with strong security requirements
 */

// Password strength requirements
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbidCommonPasswords: true,
  forbidPersonalInfo: true
};

// Common weak passwords to reject
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
  'password1', 'admin', 'letmein', 'welcome', 'monkey', '1234567890',
  'dragon', 'master', 'hello', 'freedom', 'whatever', 'qazwsx',
  'trustno1', 'jordan', 'hunter', 'buster', 'soccer', 'harley',
  'batman', 'andrew', 'tigger', 'sunshine', 'iloveyou', '2000',
  'charlie', 'robert', 'thomas', 'hockey', 'ranger', 'daniel',
  'starwars', 'klaster', '112233', 'george', 'asshole', 'computer',
  'michelle', 'jessica', 'pepper', '1111', 'zxcvbn', '555555',
  '11111111', '131313', 'freedom', '777777', 'pass', 'maggie',
  '159753', 'aaaaaa', 'ginger', 'princess', 'joshua', 'cheese',
  'amanda', 'summer', 'love', 'ashley', '6969', 'nicole',
  'chelsea', 'biteme', 'matthew', 'access', 'yankees', '987654321',
  'dallas', 'austin', 'thunder', 'taylor', 'matrix', 'william',
  'corvette', 'hello', 'martin', 'heather', 'secret', 'fucker',
  'merlin', 'diamond', '1234567', 'gfhjkm', 'hammer', 'silver',
  '222222', '88888888', 'anthony', 'justin', 'test', 'bailey',
  'q1w2e3r4t5', 'patrick', 'internet', 'scooter', 'orange',
  '11111', 'golfer', 'cookie', 'richard', 'samantha', 'bigdog',
  'guitar', 'jackson', 'whatever', 'mickey', 'chicken', 'sparky',
  'snoopy', 'maverick', 'phoenix', 'camaro', 'sexy', 'peanut',
  'morgan', 'welcome', 'falcon', 'cowboy', 'ferrari', 'samsung',
  'andrea', 'smokey', 'steelers', 'joseph', 'mercedes', 'dakota',
  'arsenal', 'eagles', 'melissa', 'boomer', 'booboo', 'spider',
  'nascar', 'monster', 'tigers', 'yellow', 'xxxxxx', '123123123',
  'gateway', 'marina', 'diablo', 'bulldog', 'qwer1234', 'compaq',
  'purple', 'hardcore', 'banana', 'junior', 'hannah', '123654',
  'porsche', 'lakers', 'iceman', 'money', 'cowboys', '987654',
  'london', 'tennis', '999999', 'ncc1701', 'coffee', 'scooby',
  '0000', 'miller', 'boston', 'q1w2e3r4', 'fuckoff', 'brandon',
  'yamaha', 'chester', 'mother', 'forever', 'johnny', 'edward',
  '333333', 'oliver', 'redsox', 'player', 'nikita', 'knight',
  'fender', 'barney', 'midnight', 'please', 'brandy', 'chicago',
  'badboy', 'iwantu', 'slayer', 'rangers', 'charles', 'angel',
  'flower', 'bigdaddy', 'rabbit', 'wizard', 'bigdick', 'jasper',
  'enter', 'rachel', 'chris', 'steven', 'winner', 'adidas',
  'victoria', 'natasha', '1q2w3e4r', 'jasmine', 'winter', 'prince',
  'panties', 'marine', 'ghbdtn', 'fishing', 'cocacola', 'casper',
  'james', '232323', 'raiders', '888888', 'marlboro', 'gandalf',
  'asdfgh', 'crystal', '87654321', '12344321', 'sexsex', 'golden',
  'blowme', 'bigtits', '8675309', 'panther', 'lauren', 'angela',
  'bitch', 'spanky', 'thx1138', 'angels', 'madison', 'winston',
  'shannon', 'mike', 'toyota', 'blowjob', 'jordan23', 'canada',
  'sophie', 'Password', 'apples', 'dick', 'tiger', 'razz',
  '123abc', 'pokemon', 'qazxsw', '55555', 'qwaszx', 'muffin',
  'johnson', 'murphy', 'cooper', 'jonathan', 'liverpoo', 'david',
  'danielle', '159357', 'jackie', '1990', '123456a', '789456',
  'turtle', 'horny', 'abcd1234', 'scorpion', 'qazwsxedc', 'fuck',
  'mark', 'reddog', 'frank', 'qwe123', 'popcorn', 'patricia',
  'aaaaaaaa', '1969', 'teresa', 'mozart', 'buddha', 'anderson',
  'paul', 'melanie', 'abcdefg', 'security', 'lucky', 'lizard',
  'denise', '3333', 'a12345', '123789', 'rusty', 'stargate',
  'simpsons', 'scarface', 'eagle', '123456789a', 'thumper',
  'olivia', 'naruto', '1234554321', 'general', 'cherokee',
  'a123456', 'vincent', 'Usuckballz1', 'spooky', 'qweasd',
  'cumshot', 'free', 'frankie', 'douglas', 'death', '1980',
  'loveme', 'sidney', 'mistress', 'red', 'srinivas', 'wood',
  'sports', 'penis', '112112', 'q1w2e3', 'blue', 'uk', '1974',
  'fuckyou', 'helpme', 'laddie', 'giants', 'david1', 'eagle1',
  'shit', 'microsoft', '6666', 'pookie', 'bears', 'smith',
  'gregory', 'bullshit', '1975', 'mickey', 'turkey', 'jennifer',
  'brad', 'wolves', 'barney', 'speedy', 'jason', 'bigcock',
  'fucked', 'abcdef', 'honda', 'wisdom', 'caroline', 'martha',
  'mouse', 'nokia', 'moose', 'teresa', 'keith', 'entropy',
  'jane', 'qweqwe', '123qwe', 'zaq12wsx', 'qw12er', 'qwer',
  'qwerty123', 'qwerty1', 'qwerty12', 'qwerty1234', 'admin123',
  'administrator', 'root', 'toor', 'pass123', 'temp', 'guest',
  'demo', 'test123', 'user', 'super', 'oracle', 'postgres',
  'mysql', 'apache', 'tomcat', 'jenkins', 'docker', 'kubernetes'
];

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {Object} userInfo - User information to check against (optional)
 * @returns {Object} - Validation result with isValid and errors
 */
function validatePassword(password, userInfo = {}) {
  const errors = [];
  const warnings = [];
  
  // Check if password exists
  if (!password) {
    return {
      isValid: false,
      errors: ['Password is required'],
      warnings: [],
      strength: 'none'
    };
  }

  // Length requirements
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }
  
  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must be no more than ${PASSWORD_REQUIREMENTS.maxLength} characters long`);
  }

  // Character requirements
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }

  if (PASSWORD_REQUIREMENTS.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }

  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  // Common password check
  if (PASSWORD_REQUIREMENTS.forbidCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.includes(lowerPassword)) {
      errors.push('This password is too common. Please choose a more unique password');
    }
    
    // Check for simple patterns
    if (/^(.)\1+$/.test(password)) { // All same character
      errors.push('Password cannot be all the same character');
    }
    
    if (/^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
      errors.push('Password cannot contain simple sequences');
    }
    
    if (/^(qwerty|asdfgh|zxcvbn|qwertyui|asdfghjk|zxcvbnm)/i.test(password)) {
      errors.push('Password cannot be based on keyboard patterns');
    }
  }

  // Personal information check
  if (PASSWORD_REQUIREMENTS.forbidPersonalInfo && userInfo) {
    const personalData = [
      userInfo.firstName,
      userInfo.lastName,
      userInfo.email?.split('@')[0],
      userInfo.phone,
      userInfo.username
    ].filter(Boolean);

    for (const data of personalData) {
      if (data && password.toLowerCase().includes(data.toLowerCase())) {
        errors.push('Password cannot contain your personal information');
        break;
      }
    }
  }

  // Calculate password strength
  const strength = calculatePasswordStrength(password);
  
  // Add warnings for weak passwords
  if (strength === 'weak') {
    warnings.push('Consider using a longer password with more variety');
  } else if (strength === 'medium') {
    warnings.push('Good password! Consider adding more special characters for extra security');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    strength,
    requirements: getPasswordRequirements()
  };
}

/**
 * Calculate password strength score
 * @param {string} password 
 * @returns {string} - 'weak', 'medium', 'strong', 'very-strong'
 */
function calculatePasswordStrength(password) {
  let score = 0;
  
  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  
  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
  
  // Complexity scoring
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?].*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1; // Multiple special chars
  if (!/(.)\1{2,}/.test(password)) score += 1; // No repeated characters
  if (password.length >= 20) score += 1; // Very long password
  
  if (score <= 3) return 'weak';
  if (score <= 5) return 'medium';
  if (score <= 7) return 'strong';
  return 'very-strong';
}

/**
 * Get password requirements for display
 * @returns {Array} - Array of requirement strings
 */
function getPasswordRequirements() {
  return [
    `At least ${PASSWORD_REQUIREMENTS.minLength} characters long`,
    'At least one uppercase letter (A-Z)',
    'At least one lowercase letter (a-z)',
    'At least one number (0-9)',
    'At least one special character (!@#$%^&*)',
    'Cannot be a common password',
    'Cannot contain your personal information'
  ];
}

/**
 * Generate a strong password suggestion
 * @returns {string} - A strong password suggestion
 */
function generateStrongPassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let password = '';
  
  // Ensure at least one of each required type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

module.exports = {
  validatePassword,
  calculatePasswordStrength,
  getPasswordRequirements,
  generateStrongPassword,
  PASSWORD_REQUIREMENTS
};
