# Backend Architecture - Simple Explanation

## Overview
This is a **Node.js Express backend** built for an automobile dealership dashboard system. It handles Excel file uploads, data processing, and provides APIs for the frontend dashboard.

## Technology Stack
- **Node.js** with **Express.js** - Web server framework
- **MongoDB** with **Mongoose** - Database for storing data
- **Multer** - File upload handling
- **XLSX** - Excel file processing
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variables management

## Project Structure
```
AutoBackend/
├── server.js              # Main server entry point
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (DB connection, etc.)
├── controllers/           # Business logic handlers
│   ├── uploadController.js
│   ├── serviceManagerController.js
│   └── advisorOperationsController.js
├── models/                # Database schemas
│   ├── AdvisorOperations.js
│   └── ServiceManagerUpload.js
├── routes/                # API route definitions
│   ├── uploadRoutes.js
│   └── serviceManagerRoutes.js
├── middleware/            # Custom middleware functions
└── uploads/               # Temporary file storage
```

## How It Works

### 1. Server Setup (`server.js`)
- Initializes Express app with CORS and JSON parsing
- Connects to MongoDB Atlas database
- Registers API routes under `/api` prefix
- Includes error handling and health check endpoints
- Supports both local development (port 5000) and Vercel deployment

### 2. Database Models

#### ServiceManagerUpload.js
Stores different types of automotive data:
- **RO Billing** - Repair order billing information
- **Operations** - Operation-wise analysis data
- **Warranty Claims** - Warranty claim records
- **Service Bookings** - Booking list data

#### AdvisorOperations.js
Stores service advisor performance data:
- Advisor name, city, upload information
- Matched operations and amounts
- Raw Excel data for processing

### 3. API Routes

#### Upload Routes (`/api/upload`)
- **POST /api/upload** - Upload Excel files for processing
- Accepts `.xlsx` and `.xls` files only
- Processes Excel data and stores in database

#### Service Manager Routes (`/api/service-manager`)
- **POST /api/service-manager/upload** - Upload service manager data
- **GET /api/service-manager/uploads** - Get uploaded files list
- **GET /api/service-manager/dashboard-data** - Get dashboard analytics
- **GET /api/service-manager/gm-dashboard-data** - GM-specific dashboard data
- **DELETE /api/service-manager/upload/:id** - Delete uploaded data

#### Advisor Operations Routes
- **POST /api/service-manager/advisor-operations/upload** - Upload advisor data
- **GET /api/service-manager/advisor-operations** - Get advisor operations
- **DELETE /api/service-manager/advisor-operations** - Delete advisor data

### 4. File Processing Flow
1. **Upload** - User uploads Excel file via frontend
2. **Validation** - Multer validates file type and saves to uploads folder
3. **Parsing** - XLSX library reads Excel data and converts to JSON
4. **Processing** - Controllers process and filter the data
5. **Storage** - Processed data saved to MongoDB with metadata
6. **Response** - Success/failure response sent to frontend

### 5. Data Features
- **Multi-city Support** - Data organized by city locations
- **User Tracking** - Records who uploaded each file
- **Date Range** - Supports date-specific data analysis
- **File Metadata** - Stores filename, upload date, row counts
- **Data Matching** - Matches operations between different data types

### 6. Security & Authentication
- **Middleware Validation** - Validates service manager credentials
- **Data Ownership** - Ensures users can only access their data
- **Error Handling** - Comprehensive error responses
- **File Filtering** - Only allows Excel file uploads

### 7. Deployment
- **Local Development** - Runs on port 5000 with nodemon
- **Production** - Deployed on Vercel serverless platform
- **Database** - MongoDB Atlas cloud database
- **File Storage** - Uses `/tmp` for Vercel, local `uploads/` for development

## Key Features
- ✅ Excel file upload and processing
- ✅ Multi-type automotive data handling
- ✅ Dashboard analytics API
- ✅ User-specific data access
- ✅ File management (upload, view, delete)
- ✅ Database reset functionality
- ✅ Error handling and validation
- ✅ CORS enabled for frontend integration

## Environment Variables
- `MONGO_URI` - MongoDB connection string
- `PORT` - Server port (5000)
- `JWT_SECRET` - Authentication secret
- `NODE_ENV` - Environment (development/production)

This backend serves as the data processing engine for the automobile dealership dashboard, handling all file uploads, data storage, and API endpoints needed for the frontend application.
