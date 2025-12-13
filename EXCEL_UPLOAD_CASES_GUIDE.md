# Excel Upload Cases & VIN Matching Guide

## Overview
This document explains how the system handles different upload scenarios for **BookingList** and **RepairOrderList** Excel files, and how VIN matching works between them.

---

## 📋 File Types

### 1. BookingList (Service Booking)
- **Purpose**: Contains customer service bookings/appointments
- **Key Columns**: 
  - `VIN Number` (Vehicle Identification Number) - **UNIQUE IDENTIFIER**
  - `Reg_No` (Registration Number) - Optional (can be null)
  - `Service Advisor`
  - `Work Type`
  - `Status` (Open/Close)
  - `B.T Date & Time` (Booking Date & Time)

### 2. RepairOrderList (Repair Order)
- **Purpose**: Contains actual service/repair work done
- **Key Columns**:
  - `VIN` (Vehicle Identification Number) - **UNIQUE IDENTIFIER**
  - `Reg_No` (Registration Number) - Optional (can be null)
  - `Service Advisor`
  - `Work Type`
  - `R/O Status` (Repair Order Status)
  - `R/O Date` (Repair Order Date)

---

## 🔍 Unique Identifiers for Case Detection

### BookingList Unique Key
- **Primary**: `VIN Number` + `showroom_id`
- **Compound Unique Index**: `{vin_number: 1, showroom_id: 1}`
- **Why VIN**: Some rows have null `Reg_No`, but VIN is always present
- **Why Compound**: Same VIN can exist in different showrooms

### RepairOrderList Unique Key
- **Primary**: `VIN` + `showroom_id`
- **Compound Unique Index**: `{vin: 1, showroom_id: 1}`
- **Why VIN**: Some rows have null `Reg_No`, but VIN is always present
- **Why Compound**: Same VIN can exist in different showrooms

---

## 📊 Three Upload Cases Explained

### CASE 1: New File (All New Records)
**When it happens:**
- You upload an Excel file for the first time
- OR all records in the Excel are completely new (not in database)

**How System Identifies:**
- Checks each row's `VIN Number` + `showroom_id` combination
- If NONE of the records exist in database → **CASE 1**

**What System Does:**
- **Inserts** all records as new entries
- Uses `upsert` operation (insert if new, update if exists)
- Counts how many records were inserted

**Example:**
```
Excel has: 
- MABCD1234567890 (New VIN)
- MABCD1234567891 (New VIN)
- MABCD1234567892 (New VIN)

Database has: (Empty)

Result: All 3 records INSERTED → CASE 1
```

---

### CASE 2: Duplicate File (All Existing Records)
**When it happens:**
- You upload the same Excel file again
- OR all records in Excel already exist in database

**How System Identifies:**
- Checks each row's `VIN Number` + `showroom_id` combination
- If ALL records already exist in database → **CASE 2**

**What System Does:**
- **Updates** all existing records with new data
- Uses `upsert` operation (updates existing records)
- Counts how many records were updated
- Useful for refreshing data with latest information

**Example:**
```
Excel has:
- MABCD1234567890 (Exists)
- MABCD1234567891 (Exists)
- MABCD1234567892 (Exists)

Database has:
- MABCD1234567890 (Old data)
- MABCD1234567891 (Old data)
- MABCD1234567892 (Old data)

Result: All 3 records UPDATED → CASE 2
```

---

### CASE 3: Mixed File (Some New, Some Existing)
**When it happens:**
- Excel file contains both new and existing records
- Partial data update scenario

**How System Identifies:**
- Checks each row's `VIN Number` + `showroom_id` combination
- If SOME records exist and SOME are new → **CASE 3**

**What System Does:**
- **Inserts** new records
- **Updates** existing records
- Uses `upsert` operation for all records
- Counts both inserted and updated records separately

**Example:**
```
Excel has:
- MABCD1234567890 (Exists)
- MABCD1234567891 (New)
- MABCD1234567892 (Exists)
- MABCD1234567893 (New)

Database has:
- MABCD1234567890 (Old data)
- MABCD1234567892 (Old data)

Result: 
- 2 records UPDATED (890, 892)
- 2 records INSERTED (891, 893)
→ CASE 3
```

---

## 🔗 VIN Matching Explained

### What is VIN Matching?
VIN Matching connects **BookingList** (appointments) with **RepairOrderList** (actual service done) to track conversion.

### How It Works

#### Step 1: Collect VINs from RepairOrderList
- System reads all VIN numbers from RepairOrderList
- Creates a list of vehicles that actually received service
- Example: [VIN123, VIN456, VIN789]

#### Step 2: Check Each Booking
For each booking in BookingList:
- Take the VIN number from booking
- Check if it exists in RepairOrderList VINs

#### Step 3: Determine Status

**If VIN is MATCHED (Found in RepairOrderList):**
- Status = **"Converted"** ✅
- Meaning: Customer came for appointment AND got service done
- This is a successful conversion!

**If VIN is NOT MATCHED (Not in RepairOrderList):**
- Check the booking date (B.T Date & Time)
- Categorize based on date:

  **a) Past/Present Date (B.T Date ≤ Today):**
  - Status = **"Processing"** ⏳
  - Meaning: Appointment was today or earlier, but no service record yet
  - Could be: Work in progress, customer didn't show up, or data not updated

  **b) Tomorrow Date (B.T Date = Tomorrow):**
  - Status = **"Tomorrow Delivery"** 📅
  - Meaning: Appointment is scheduled for tomorrow
  - Customer expected to come tomorrow

  **c) Future Date (B.T Date > Tomorrow):**
  - Status = **"Future Delivery"** 🔮
  - Meaning: Appointment is scheduled for future
  - Customer will come on a later date

---

## 📈 VIN Matching Example

### Scenario:
**RepairOrderList has:**
- VIN: ABC123 (Service completed)
- VIN: XYZ789 (Service completed)

**BookingList has:**
| VIN Number | B.T Date & Time | Status Result |
|------------|----------------|---------------|
| ABC123 | 10-Dec-2025 | ✅ **Converted** (VIN matched) |
| XYZ789 | 12-Dec-2025 | ✅ **Converted** (VIN matched) |
| DEF456 | 11-Dec-2025 | ⏳ **Processing** (Past date, no VIN match) |
| GHI999 | 14-Dec-2025 | 📅 **Tomorrow** (Tomorrow's date, no VIN match) |
| JKL000 | 20-Dec-2025 | 🔮 **Future** (Future date, no VIN match) |

### Results:
- **Total Bookings**: 5
- **Converted**: 2 (40% conversion rate)
- **Processing**: 1 (20%)
- **Tomorrow**: 1 (20%)
- **Future**: 1 (20%)

---

## 🎯 Key Benefits

### 1. Smart Upload Handling
- System automatically detects whether data is new, duplicate, or mixed
- No manual intervention needed
- Prevents duplicate entries
- Updates existing data automatically

### 2. Conversion Tracking
- See which bookings converted to actual service
- Track advisor performance
- Identify pending bookings
- Plan for future appointments

### 3. Data Integrity
- Unique keys prevent duplicate records
- Upsert operations ensure data consistency
- Showroom-wise data segregation
- Automatic status categorization

---

## 📝 Important Notes

### For BookingList:
- **VIN Number is the primary unique identifier**
- `Reg_No` can be null or empty in some rows
- `VIN Number` must always be present for proper tracking
- `B.T Date & Time` is crucial for status categorization
- `Status` column shows Excel status (Open/Close)

### For RepairOrderList:
- **VIN is the primary unique identifier**
- `Reg_No` can be null or empty in some rows
- `VIN` must always be present for proper tracking
- `R/O Date` shows when service was completed
- `R/O Status` shows repair order status

### For VIN Matching:
- Works regardless of upload order
- Can upload BookingList first, then RepairOrderList (or vice versa)
- System re-calculates matching every time dashboard is accessed
- Real-time conversion tracking
- Uses VIN as the matching key between both files

---

## 🔄 Upload Flow Summary

```
1. Upload Excel File
   ↓
2. System reads all rows
   ↓
3. Check each VIN Number + showroom_id
   ↓
4. Count: New vs Existing records
   ↓
5. Determine Case:
   - All New → CASE 1
   - All Existing → CASE 2
   - Mixed → CASE 3
   ↓
6. Process accordingly:
   - Insert new records
   - Update existing records
   ↓
7. Show result:
   - "X records inserted"
   - "Y records updated"
   - "Total Z records processed"
```

---

## 🎓 Simple Summary

### Upload Cases:
- **CASE 1**: Everything is new → Insert all
- **CASE 2**: Everything exists → Update all
- **CASE 3**: Some new, some exist → Insert new, Update existing

### VIN Matching:
- **Converted**: Booking VIN found in Repair Orders = Customer got service ✅
- **Processing**: Past/today booking, no service record yet ⏳
- **Tomorrow**: Tomorrow's booking, waiting for customer 📅
- **Future**: Future booking, scheduled for later 🔮

### Unique Identifier:
- **Both files use**: `VIN Number` + `showroom_id`
- **Why VIN**: Some rows have null `Reg_No`, VIN is always present
- This combination must be unique per showroom
- Prevents duplicate records
- Enables smart case detection

---

**End of Guide**
