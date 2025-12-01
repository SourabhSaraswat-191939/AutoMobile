import XLSX from "xlsx";
import AdvisorOperations from "../models/AdvisorOperations.js";
import AdvisorPerformanceSummary from "../models/AdvisorPerformanceSummary.js";

// Helper function to update advisor performance summary
const updateAdvisorPerformanceSummary = async (advisorName, city, uploadedBy, dataDate, totalMatchedAmount, matchedOperations) => {
  try {
    // Determine period
    const periodStart = new Date(dataDate);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(dataDate);
    periodEnd.setHours(23, 59, 59, 999);

    // Get top operations
    const topOperations = matchedOperations
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(op => ({
        operation: op.operation,
        totalAmount: op.amount,
        count: op.count || 1
      }));

    await AdvisorPerformanceSummary.findOneAndUpdate(
      {
        advisorName,
        city,
        uploadedBy,
        periodType: 'daily',
        periodStart,
        periodEnd
      },
      {
        $set: {
          'operationsPerformance.totalMatchedAmount': totalMatchedAmount,
          'operationsPerformance.totalOperationsCount': matchedOperations.length,
          'operationsPerformance.topOperations': topOperations,
          lastUpdated: new Date()
        }
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error updating advisor performance summary:', error);
  }
};

// Predefined operations list for matching
const PREDEFINED_OPERATIONS = [
  "AC Disinfectant Bardahl (EB) (Optional)",
  "AC Disinfectant Horizon (HR) (Optional)",
  "AC Disinfectant Wuerth (WT) (Optional)",
  "Car Upholstery Cleaning and adjustment",
  "EGR cleaner – Diesel Bardahl (EB) (Optional)",
  "EGR cleaner – Diesel Horizon (HR) (Optional)",
  "Engine Cleaning/Dressing Large Bardahl (EB) (Optional)",
  "Engine Cleaning/Dressing Large Horizon (HR) (Optional)",
  "Engine Cleaning/Dressing Medium Bardahl (EB) (Optional)",
  "Engine Cleaning/Dressing Medium Horizon (HR) (Optional)",
  "Engine Cleaning/Dressing Small Bardahl (EB) (Optional)",
  "Engine Cleaning/Dressing Small Horizon (HR) (Optional)",
  "INTERIOR ANTIMICROBIAL TREATMENT",
  "Lubrication (All Joints and Hinges etc)",
  "Lubrication (Hinge/Joints/Battery) Large Bardahl (EB) (Optional)",
  "Lubrication (Hinge/Joints/Battery) Large Horizon (HR) (Optional)",
  "Lubrication (Hinge/Joints/Battery) Medium 3M (Optional)",
  "Lubrication (Hinge/Joints/Battery) Medium Bardahl (EB) (Optional)",
  "Lubrication (Hinge/Joints/Battery) Medium Horizon (HR) (Optional)",
  "Lubrication (Hinge/Joints/Battery) Small Bardahl (EB) (Optional)",
  "Premium Interior Foam Base Cleaning Large Bardahl (EB) (Optional)",
  "Rodent repellent Large 3M (Optional)",
  "Rodent repellent Large Bardahl (EB) (Optional)",
  "Rodent repellent Large Horizon (HR) (Optional)",
  "Rodent repellent Medium Bardahl (EB) (Optional)",
  "Rodent repellent Medium Horizon (HR) (Optional)",
  "Rodent repellent Small Bardahl (EB) (Optional)",
  "Rodent repellent Small Horizon (HR) (Optional)",
  "Rubbing and polishing",
  "Throttle Body Cleaner - Petrol Bardahl (EB) (Optional)",
  "Throttle Body Cleaner - Petrol Horizon (HR) (Optional)",
  "Throttle Body Cleaner - Petrol Wuerth (WT) (Optional)",
  "UNDERBODY COATING",
];

// Upload advisor operation Excel file
export const uploadAdvisorOperations = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { advisorName, uploadedBy, city, dataDate } = req.body;

    if (!advisorName || !uploadedBy || !city) {
      return res.status(400).json({ 
        message: "Missing required fields: advisorName, uploadedBy, or city" 
      });
    }

    // Parse dataDate or use current IST date
    let operationDate;
    if (dataDate) {
      operationDate = new Date(dataDate);
    } else {
      // Get current time in IST (UTC+5:30)
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
      operationDate = new Date(now.getTime() + istOffset);
    }
    // Set time to start of day for consistency
    operationDate.setUTCHours(0, 0, 0, 0);

    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    console.log(`Processing operations file for advisor: ${advisorName}`);
    console.log(`Total rows in Excel: ${jsonData.length}`);
    
    if (jsonData.length > 0) {
      console.log("Column names found:", Object.keys(jsonData[0]));
    }

    // Process the Excel data
    const matchedOperations = [];
    let totalMatchedAmount = 0;

    jsonData.forEach((row, index) => {
      // Get the "OP/Part Desc." column value
      const opPartDesc = row["OP/Part Desc."] || 
                        row["OP/Part Desc"] || 
                        row["Operation"] || 
                        row["Description"] || 
                        "";

      if (!opPartDesc) return;

      // Check if this operation matches any predefined operation
      const matchedOp = PREDEFINED_OPERATIONS.find(predefinedOp => 
        opPartDesc.trim().toLowerCase() === predefinedOp.toLowerCase()
      );

      if (matchedOp) {
        // Get all column keys to find the second-last column
        const columnKeys = Object.keys(row);
        const secondLastColumnKey = columnKeys[columnKeys.length - 2];
        
        // Get the amount from second-last column
        const amount = parseFloat(row[secondLastColumnKey] || 0);

        console.log(`Match found at row ${index + 1}: ${matchedOp} = ₹${amount}`);

        matchedOperations.push({
          operation: matchedOp,
          amount: amount,
        });

        totalMatchedAmount += amount;
      }
    });

    console.log(`Total matched operations: ${matchedOperations.length}`);
    console.log(`Total matched amount: ₹${totalMatchedAmount}`);

    // Processing metadata
    const processingMetadata = {
      totalRowsProcessed: jsonData.length,
      matchedRowsCount: matchedOperations.length,
      unmatchedRowsCount: jsonData.length - matchedOperations.length
    };

    // Check if advisor already has operations data for this city and date
    const existingData = await AdvisorOperations.findOne({
      advisorName,
      city,
      dataDate: operationDate,
    });

    if (existingData) {
      // Update existing record
      existingData.fileName = req.file.originalname;
      existingData.uploadDate = new Date();
      existingData.dataDate = operationDate;
      existingData.totalMatchedAmount = totalMatchedAmount;
      existingData.totalOperationsCount = matchedOperations.length;
      existingData.matchedOperations = matchedOperations;
      existingData.rawData = jsonData;
      existingData.uploadedBy = uploadedBy;
      existingData.processingMetadata = processingMetadata;
      
      await existingData.save();

      // Update advisor performance summary
      await updateAdvisorPerformanceSummary(advisorName, city, uploadedBy, operationDate, totalMatchedAmount, matchedOperations);

      return res.status(200).json({
        message: "Operations data updated successfully ✅",
        advisorName,
        totalMatchedAmount,
        matchedCount: matchedOperations.length,
        uploadDate: existingData.uploadDate,
      });
    } else {
      // Create new record
      const advisorOps = new AdvisorOperations({
        advisorName,
        city,
        uploadedBy,
        fileName: req.file.originalname,
        dataDate: operationDate,
        totalMatchedAmount,
        totalOperationsCount: matchedOperations.length,
        matchedOperations,
        rawData: jsonData,
        processingMetadata
      });

      await advisorOps.save();

      // Update advisor performance summary
      await updateAdvisorPerformanceSummary(advisorName, city, uploadedBy, operationDate, totalMatchedAmount, matchedOperations);

      return res.status(200).json({
        message: "Operations data uploaded successfully ✅",
        advisorName,
        totalMatchedAmount,
        matchedCount: matchedOperations.length,
        uploadDate: advisorOps.uploadDate,
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ 
      message: "Error processing Excel file", 
      error: error.message 
    });
  }
};

// Get all advisor operations for a city (OPTIMIZED - uses aggregation pipeline)
export const getAdvisorOperations = async (req, res) => {
  try {
    const { city, uploadedBy, dataDate, viewMode } = req.query;

    if (!city || !uploadedBy) {
      return res.status(400).json({ 
        message: "Missing required parameters: city and uploadedBy" 
      });
    }

    // Use AdvisorPerformanceSummary for summary view (FAST!)
    if (viewMode === 'summary') {
      const query = { city, uploadedBy };
      
      if (dataDate) {
        const filterDate = new Date(dataDate);
        query.periodStart = { $lte: filterDate };
        query.periodEnd = { $gte: filterDate };
      }
      
      const summaries = await AdvisorPerformanceSummary.find(query)
        .sort({ 'operationsPerformance.totalMatchedAmount': -1 })
        .select('-operationsPerformance.topOperations'); // Exclude detailed operations for list view
      
      return res.status(200).json({
        success: true,
        count: summaries.length,
        data: summaries,
        viewMode: 'summary',
        cached: true
      });
    }

    // Build query for detailed view
    const matchQuery = { city, uploadedBy };
    
    // If dataDate is provided and viewMode is 'specific', get only that date's data
    if (dataDate && viewMode === 'specific') {
      const filterDate = new Date(dataDate);
      filterDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(dataDate);
      endDate.setUTCHours(23, 59, 59, 999);
      matchQuery.dataDate = { $gte: filterDate, $lte: endDate };
    } else if (dataDate) {
      // Cumulative: get all data up to and including that date
      const filterDate = new Date(dataDate);
      filterDate.setUTCHours(23, 59, 59, 999);
      matchQuery.dataDate = { $lte: filterDate };
    }

    // Use aggregation pipeline for efficient grouping
    const operations = await AdvisorOperations.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$advisorName",
          city: { $first: "$city" },
          uploadedBy: { $first: "$uploadedBy" },
          totalMatchedAmount: { $sum: "$totalMatchedAmount" },
          totalOperationsCount: { $sum: "$totalOperationsCount" },
          latestDataDate: { $max: "$dataDate" },
          latestFileName: { $last: "$fileName" },
          latestUploadDate: { $last: "$uploadDate" }
        }
      },
      {
        $project: {
          _id: 0,
          advisorName: "$_id",
          city: 1,
          uploadedBy: 1,
          totalMatchedAmount: 1,
          totalOperationsCount: 1,
          dataDate: "$latestDataDate",
          fileName: "$latestFileName",
          uploadDate: "$latestUploadDate"
        }
      },
      { $sort: { totalMatchedAmount: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      count: operations.length,
      data: operations,
      viewMode: viewMode || 'cumulative'
    });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ 
      message: "Error fetching advisor operations", 
      error: error.message 
    });
  }
};

// Get specific advisor operations details (cumulative up to selected date)
export const getAdvisorOperationDetails = async (req, res) => {
  try {
    const { advisorName, city, dataDate } = req.query;

    if (!advisorName || !city) {
      return res.status(400).json({ 
        message: "Missing required parameters: advisorName and city" 
      });
    }

    // Build query for cumulative data
    const query = { advisorName, city };
    
    // If dataDate is provided, get all data up to and including that date
    if (dataDate) {
      const filterDate = new Date(dataDate);
      filterDate.setUTCHours(23, 59, 59, 999);
      query.dataDate = { $lte: filterDate };
    }

    const operations = await AdvisorOperations.find(query).sort({ dataDate: 1 });

    if (!operations || operations.length === 0) {
      return res.status(404).json({ 
        message: "No operations data found for this advisor" 
      });
    }

    // Aggregate the data
    const aggregated = {
      advisorName,
      city,
      uploadedBy: operations[0].uploadedBy,
      fileName: operations[operations.length - 1].fileName,
      uploadDate: operations[operations.length - 1].uploadDate,
      dataDate: operations[operations.length - 1].dataDate,
      totalMatchedAmount: operations.reduce((sum, op) => sum + op.totalMatchedAmount, 0),
      matchedOperations: operations[operations.length - 1].matchedOperations,
      rawData: operations[operations.length - 1].rawData,
    };

    const operations_single = aggregated;

    return res.status(200).json({
      success: true,
      data: operations_single,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ 
      message: "Error fetching advisor operation details", 
      error: error.message 
    });
  }
};

// Delete advisor operations
export const deleteAdvisorOperations = async (req, res) => {
  try {
    const { advisorName, city } = req.query;

    if (!advisorName || !city) {
      return res.status(400).json({ 
        message: "Missing required parameters: advisorName and city" 
      });
    }

    const result = await AdvisorOperations.findOneAndDelete({ advisorName, city });

    if (!result) {
      return res.status(404).json({ 
        message: "No operations data found for this advisor" 
      });
    }

    return res.status(200).json({
      success: true,
      message: "Advisor operations deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ 
      message: "Error deleting advisor operations", 
      error: error.message 
    });
  }
};
