// CORS Middleware for Express.js Backend Server
// Add this to your Express.js server (usually in app.js or server.js)

const cors = require('cors');

// Option 1: Simple CORS setup (allows all origins)
const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

// Option 2: More secure CORS setup (specific origins)
const secureCorsOptions = {
  origin: [
    'http://localhost:3000',  // Next.js development server
    'http://127.0.0.1:3000',  // Alternative localhost
    'https://your-production-domain.com' // Add your production domain
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

// Manual CORS middleware (if you don't want to use the cors package)
const manualCorsMiddleware = (req, res, next) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};

// Usage in your Express app:
// 
// Method 1: Using cors package (recommended)
// app.use(cors(corsOptions));
//
// Method 2: Using manual middleware
// app.use(manualCorsMiddleware);
//
// Method 3: Apply to specific routes
// app.use('/api', cors(corsOptions));

module.exports = {
  corsOptions,
  secureCorsOptions,
  manualCorsMiddleware
};
