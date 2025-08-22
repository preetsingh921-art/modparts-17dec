// Development server for local testing
// This simulates the Vercel serverless function environment locally

// Load environment variables from .env.local or .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Fallback to .env

// Ensure bcryptjs is available before starting
function ensureBcryptjs() {
  try {
    require.resolve('bcryptjs');
    console.log('✅ bcryptjs is available');
    return true;
  } catch (e) {
    console.log('❌ bcryptjs not found, attempting to install...');
    try {
      const { execSync } = require('child_process');
      execSync('npm install bcryptjs --no-save', { stdio: 'inherit' });
      console.log('✅ bcryptjs installed successfully!');
      return true;
    } catch (installError) {
      console.error('❌ Failed to install bcryptjs:', installError.message);
      console.log('⚠️ Authentication may not work properly');
      return false;
    }
  }
}

// Run bcryptjs check
ensureBcryptjs();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const passport = require('./lib/passport-config');

const app = express();
const PORT = 3000;

// Determine allowed origins based on environment
const getAllowedOrigins = () => {
  const origins = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

  // In production, add the Render URL and custom domain
  if (process.env.NODE_ENV === 'production') {
    // Add common Render URL patterns
    origins.push('https://*.onrender.com');

    // Add custom domain
    origins.push('https://partsformyrd350.com');
    origins.push('https://www.partsformyrd350.com');

    // If RENDER_EXTERNAL_URL is available, use it
    if (process.env.RENDER_EXTERNAL_URL) {
      origins.push(process.env.RENDER_EXTERNAL_URL);
    }
  }

  return origins;
};

// Middleware
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Add explicit CORS headers for all requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  // Set specific origin instead of wildcard when credentials are used
  if (allowedOrigins.includes(origin) ||
      (origin && origin.includes('.onrender.com')) ||
      (origin && origin.includes('partsformyrd350.com'))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'production') {
    // In production, allow same-origin requests
    res.header('Access-Control-Allow-Origin', '*');
  } else {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173'); // Default to frontend
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from public directory
app.use(express.static('public'));

// Google OAuth routes (before API handler)
app.get('/auth/google', (req, res, next) => {
  console.log('🚀 Google OAuth initiation');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
  console.log('🔄 Google OAuth callback');
  const googleHandler = require('./api/auth/google');
  googleHandler(req, res);
});

// API route handler - dynamically load API functions
app.all('/api/*', async (req, res) => {
  try {
    // Extract the API path
    const apiPath = req.path.replace('/api/', '');
    console.log(`API Request: ${req.method} ${req.path}`);
    console.log('API Path:', apiPath);
    
    // Convert path to file path
    let filePath;
    if (apiPath.includes('/')) {
      // Handle nested routes like auth/login, products/123, cart/456
      const parts = apiPath.split('/');
      if (parts.length === 2 && (
        !isNaN(parts[1]) || // Numeric ID
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parts[1]) // UUID
      )) {
        // Handle dynamic routes like products/123 or cart/uuid -> products/[id].js or cart/[id].js
        filePath = path.join(__dirname, 'api', parts[0], '[id].js');
        req.query.id = parts[1]; // Add ID to query params
      } else {
        // Handle regular nested routes like auth/login -> auth/login.js
        filePath = path.join(__dirname, 'api', ...parts) + '.js';
      }
    } else {
      // Handle root level routes like products -> products/index.js
      filePath = path.join(__dirname, 'api', apiPath, 'index.js');
    }
    
    console.log('Trying file path:', filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('File not found, returning 404');
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    
    // Clear require cache to allow hot reloading during development
    delete require.cache[require.resolve(filePath)];
    
    // Load and execute the API function
    const apiModule = require(filePath);
    const handler = apiModule.default || apiModule;
    
    if (typeof handler !== 'function') {
      console.error('API module does not export a function');
      return res.status(500).json({ message: 'Invalid API endpoint' });
    }
    
    // Create a mock request/response object similar to Vercel
    const mockReq = {
      ...req,
      query: { ...req.query, ...req.params },
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url
    };
    
    const mockRes = {
      status: (code) => {
        res.status(code);
        return mockRes;
      },
      json: (data) => {
        res.json(data);
        return mockRes;
      },
      send: (data) => {
        res.send(data);
        return mockRes;
      },
      end: (data) => {
        res.end(data);
        return mockRes;
      },
      setHeader: (name, value) => {
        res.setHeader(name, value);
        return mockRes;
      }
    };
    
    // Execute the handler
    await handler(mockReq, mockRes);
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Catch-all handler for SPA routing
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built. Run "npm run build" first.');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Development server running on http://localhost:${PORT}`);
  console.log('📁 Serving static files from: public/');
  console.log('🔌 API endpoints available at: /api/*');
  console.log('');

  // Debug environment variables
  console.log('🔧 Environment Variables Check:');
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
  console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
  console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
  console.log('');

  console.log('Available API endpoints:');
  console.log('  POST /api/auth/login');
  console.log('  POST /api/auth/register');
  console.log('  GET  /api/products');
  console.log('  GET  /api/categories');
  console.log('  GET  /api/cart');
  console.log('  POST /api/cart');
  console.log('  GET  /api/orders');
  console.log('  POST /api/orders');
  console.log('  GET  /api/users/profile');
  console.log('  PUT  /api/users/profile');
  console.log('');
  console.log('💡 Make sure to:');
  console.log('  1. Set up your Supabase database');
  console.log('  2. Copy .env.example to .env.local');
  console.log('  3. Fill in your environment variables');
  console.log('  4. Run "npm run build" to build the frontend');
});

module.exports = app;
