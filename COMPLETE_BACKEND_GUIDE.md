# Complete Backend Architecture Guide

## Database Models & Usage

### 1. AdvisorOperations Model
**File**: `models/AdvisorOperations.js`

```javascript
// Database Schema
const advisorOperationsSchema = new mongoose.Schema({
  advisorName: { type: String, required: true },
  city: { type: String, required: true },
  uploadedBy: { type: String, required: true },
  fileName: String,
  uploadDate: { type: Date, default: Date.now },
  dataDate: { type: Date, required: true, default: Date.now },
  totalMatchedAmount: { type: Number, default: 0 },
  matchedOperations: [{
    operation: String,
    amount: Number,
  }],
  rawData: { type: mongoose.Schema.Types.Mixed, default: [] },
});
```

**Usage**: Stores service advisor performance data with operation matching
**Indexes**: advisorName+city+dataDate, uploadedBy+city+dataDate, uploadDate, dataDate

---

### 2. ServiceManagerUpload Model
**File**: `models/ServiceManagerUpload.js`

```javascript
// Main Schema
const serviceManagerUploadSchema = new mongoose.Schema({
  uploadedBy: { type: String, required: true },
  city: { type: String, required: true },
  uploadType: { 
    type: String, 
    enum: ["ro_billing", "operations", "warranty", "service_booking"],
    required: true 
  },
  fileName: String,
  uploadDate: { type: Date, default: Date.now },
  startDate: String,
  endDate: String,
  totalRows: Number,
  data: { type: mongoose.Schema.Types.Mixed, default: [] },
});
```

**Sub-Schemas**:
- **RO Billing**: billDate, serviceAdvisor, labourAmt, partAmt, workType, roNumber, vehicleNumber, customerName, totalAmount
- **Operations**: opPartDescription, count, amount
- **Warranty**: claimDate, claimType, status, labour, part, claimNumber, vehicleNumber, customerName
- **Service Booking**: serviceAdvisor, btDateTime, workType, status, bookingNumber, vehicleNumber, customerName

**Usage**: Stores all service manager data types with metadata
**Indexes**: uploadedBy+city+uploadType, uploadDate

---

## API Endpoints & Responses

### Upload Routes (`/api/upload`)

#### POST `/api/upload`
**Purpose**: Upload general Excel files
**Middleware**: `multer` file upload
**Controller**: `uploadController.uploadExcel`

**Request**:
```javascript
// FormData
file: Excel file (.xlsx/.xls)
uploadedBy: "email@example.com"
store: "store_name"
```

**Response**:
```json
{
  "message": "File uploaded and processed successfully",
  "fileName": "filename.xlsx",
  "data": [
    {
      "Bill Date": "2024-01-01",
      "Service Advisor": "John Doe",
      "Labour Amt": 1500,
      "Part Amt": 2000,
      "Work Type": "Service"
    }
  ],
  "serviceName": "service_name",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

---

### Service Manager Routes (`/api/service-manager`)

#### POST `/api/service-manager/upload`
**Purpose**: Upload service manager data (RO billing, operations, warranty, service booking)
**Middleware**: `validateServiceManager`, `multer`
**Controller**: `serviceManagerController.uploadServiceManagerFile`

**Request**:
```javascript
// FormData
file: Excel file
uploadedBy: "email@example.com"
city: "Pune|Mumbai|Nagpur"
uploadType: "ro_billing|operations|warranty|service_booking"
```

**Response**:
```json
{
  "success": true,
  "message": "File uploaded and processed successfully",
  "upload": {
    "_id": "64a1b2c3d4e5f6789012345",
    "uploadedBy": "email@example.com",
    "city": "Pune",
    "uploadType": "ro_billing",
    "fileName": "pune_ro_billing_1234567890_data.xlsx",
    "totalRows": 150,
    "data": [...],
    "uploadDate": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET `/api/service-manager/uploads`
**Purpose**: Get list of uploaded files
**Middleware**: `ensureDataOwnership`
**Controller**: `serviceManagerController.getServiceManagerUploads`

**Request**:
```javascript
// Query params
uploadedBy: "email@example.com"
city: "Pune"
uploadType?: "ro_billing" // optional
```

**Response**:
```json
{
  "success": true,
  "uploads": [
    {
      "_id": "64a1b2c3d4e5f6789012345",
      "uploadedBy": "email@example.com",
      "city": "Pune",
      "uploadType": "ro_billing",
      "fileName": "data.xlsx",
      "uploadDate": "2024-01-15T10:30:00.000Z",
      "totalRows": 150
    }
  ]
}
```

#### GET `/api/service-manager/upload/:uploadId`
**Purpose**: Get specific upload data
**Middleware**: `ensureDataOwnership`
**Controller**: `serviceManagerController.getUploadData`

**Response**:
```json
{
  "success": true,
  "upload": {
    "_id": "64a1b2c3d4e5f6789012345",
    "uploadedBy": "email@example.com",
    "city": "Pune",
    "uploadType": "ro_billing",
    "fileName": "data.xlsx",
    "data": [...],
    "totalRows": 150
  }
}
```

#### GET `/api/service-manager/dashboard-data`
**Purpose**: Get dashboard analytics
**Middleware**: `ensureDataOwnership`
**Controller**: `serviceManagerController.getDashboardData`

**Request**:
```javascript
// Query params
uploadedBy: "email@example.com"
city: "Pune"
dataType?: "ro_billing|operations|warranty|service_booking"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalRevenue": 150000,
    "totalLabour": 75000,
    "totalParts": 75000,
    "advisorPerformance": [
      {
        "advisor": "John Doe",
        "totalAmount": 50000,
        "roCount": 25
      }
    ],
    "monthlyTrend": [...],
    "workTypeBreakdown": [...]
  }
}
```

#### GET `/api/service-manager/gm-dashboard-data`
**Purpose**: Get GM dashboard data (no auth required)
**Controller**: `serviceManagerController.getGMDashboardData`

**Request**:
```javascript
// Query params
city?: "Pune" // optional
dataType?: "ro_billing" // optional
```

**Response**:
```json
{
  "success": true,
  "data": {
    "cityComparison": [...],
    "overallMetrics": {
      "totalRevenue": 500000,
      "totalROs": 1000,
      "avgROValue": 500
    },
    "topPerformers": [...]
  }
}
```

#### DELETE `/api/service-manager/upload/:uploadId`
**Purpose**: Delete specific upload
**Middleware**: `ensureDataOwnership`
**Controller**: `serviceManagerController.deleteUpload`

**Response**:
```json
{
  "success": true,
  "message": "Upload deleted successfully"
}
```

#### DELETE `/api/service-manager/reset-database`
**Purpose**: Reset all data for user
**Middleware**: `ensureDataOwnership`
**Controller**: `serviceManagerController.resetDatabase`

**Response**:
```json
{
  "success": true,
  "message": "Database reset successfully",
  "deletedCount": 25
}
```

---

### Advisor Operations Routes

#### POST `/api/service-manager/advisor-operations/upload`
**Purpose**: Upload advisor operations data
**Middleware**: `validateServiceManager`, `multer`
**Controller**: `advisorOperationsController.uploadAdvisorOperations`

**Request**:
```javascript
// FormData
file: Excel file
advisorName: "John Doe"
uploadedBy: "email@example.com"
city: "Pune"
dataDate: "2024-01-15"
```

**Response**:
```json
{
  "success": true,
  "message": "Advisor operations uploaded successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789012345",
    "advisorName": "John Doe",
    "city": "Pune",
    "uploadedBy": "email@example.com",
    "totalMatchedAmount": 15000,
    "matchedOperations": [
      {
        "operation": "Engine Cleaning/Dressing Large Bardahl (EB) (Optional)",
        "amount": 500
      }
    ],
    "rawData": [...]
  }
}
```

#### GET `/api/service-manager/advisor-operations`
**Purpose**: Get advisor operations data
**Middleware**: `ensureDataOwnership`
**Controller**: `advisorOperationsController.getAdvisorOperations`

**Request**:
```javascript
// Query params
city: "Pune"
uploadedBy: "email@example.com"
dataDate?: "2024-01-15" // optional
viewMode?: "summary|detailed" // optional
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012345",
      "advisorName": "John Doe",
      "city": "Pune",
      "totalMatchedAmount": 15000,
      "matchedOperations": [...],
      "uploadDate": "2024-01-15T10:30:00.000Z"
    }
  ],
  "summary": {
    "totalAdvisors": 5,
    "totalMatchedAmount": 75000,
    "topPerformer": "John Doe"
  }
}
```

#### GET `/api/service-manager/advisor-operations/details`
**Purpose**: Get detailed advisor operations
**Middleware**: `ensureDataOwnership`
**Controller**: `advisorOperationsController.getAdvisorOperationDetails`

**Request**:
```javascript
// Query params
advisorName: "John Doe"
city: "Pune"
dataDate?: "2024-01-15"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "advisorName": "John Doe",
    "city": "Pune",
    "operations": [
      {
        "operation": "Engine Cleaning/Dressing Large Bardahl (EB) (Optional)",
        "amount": 500,
        "count": 3
      }
    ],
    "totalAmount": 15000,
    "operationCount": 25
  }
}
```

#### DELETE `/api/service-manager/advisor-operations`
**Purpose**: Delete advisor operations
**Middleware**: `ensureDataOwnership`
**Controller**: `advisorOperationsController.deleteAdvisorOperations`

**Request**:
```javascript
// Query params
advisorName: "John Doe"
city: "Pune"
```

**Response**:
```json
{
  "success": true,
  "message": "Advisor operations deleted successfully",
  "deletedCount": 5
}
```

---

## Authentication Middleware

### validateServiceManager
**Purpose**: Validate user credentials on upload
**Validates**:
- Email format for `uploadedBy`
- City must be one of: "Pune", "Mumbai", "Nagpur"
- Attaches user info to `req.userAuth`

**Error Response**:
```json
{
  "message": "Unauthorized: Missing authentication credentials"
}
```

### ensureDataOwnership
**Purpose**: Ensure user can only access their data
**Validates**:
- `uploadedBy` and `city` in query params
- Attaches user info to `req.userAuth`

**Error Response**:
```json
{
  "message": "Forbidden: Access denied"
}
```

---

## Database Connection & Configuration

### MongoDB Connection
```javascript
// server.js
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    if (process.env.NODE_ENV !== 'production') {
      app.listen(5000, () => console.log("🚀 Server running on port 5000"));
    }
  })
```

### Environment Variables
```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
PORT=5000
JWT_SECRET=mystrongsecretkey123
NODE_ENV=development
```

---

## File Processing Flow

### Excel Upload Processing
1. **File Validation**: Multer checks file type (.xlsx/.xls)
2. **File Storage**: Saved to `/tmp` (production) or `uploads/` (development)
3. **Excel Parsing**: XLSX library converts to JSON
4. **Data Filtering**: Controllers filter relevant columns
5. **Database Storage**: Processed data saved to MongoDB
6. **Response**: Success/failure with processed data

### Predefined Operations Matching
The system uses a predefined list of 38 operations for advisor matching:
- AC Disinfectant services
- Engine Cleaning/Dressing (various sizes and brands)
- Lubrication services
- Rodent repellent treatments
- Throttle Body Cleaner
- UNDERBODY COATING
- And more...

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

### 404 Response
```json
{
  "success": false,
  "message": "Route POST /api/invalid not found",
  "error": "Not Found"
}
```

### Validation Errors
```json
{
  "message": "Only .xlsx or .xls files are allowed"
}
```

---

## Summary

This backend architecture provides:
- **Multi-model database structure** for different automotive data types
- **Secure file upload system** with validation and processing
- **Role-based access control** with data isolation
- **Comprehensive API endpoints** for all CRUD operations
- **Dashboard analytics** for business intelligence
- **Error handling and validation** throughout the system

The system is designed to handle automobile dealership operations including repair orders, service bookings, warranty claims, and advisor performance tracking.
