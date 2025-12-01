import path from "path";
import XLSX from "xlsx";
import ServiceManagerUpload from "../models/ServiceManagerUpload.js";
import DashboardStats from "../models/DashboardStats.js";
import AdvisorPerformanceSummary from "../models/AdvisorPerformanceSummary.js";
import { aggregateUploadData } from "../services/aggregationService.js";

// Upload Excel file for Service Manager
export const uploadServiceManagerFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { uploadedBy, city, uploadType } = req.body;

    if (!uploadedBy || !city || !uploadType) {
      return res.status(400).json({ 
        message: "Missing required fields: uploadedBy, city, or uploadType" 
      });
    }

    // Validate upload type
    const validTypes = ["ro_billing", "operations", "warranty", "service_booking"];
    if (!validTypes.includes(uploadType)) {
      return res.status(400).json({ 
        message: "Invalid upload type. Must be one of: ro_billing, operations, warranty, service_booking" 
      });
    }

    const filePath = path.resolve(req.file.path);
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    // Log column names for debugging
    if (jsonData.length > 0) {
      console.log(` Upload Type: ${uploadType}`);
      console.log(` Column names found:`, Object.keys(jsonData[0]));
    }

    // Process data based on upload type
    let filteredData = [];
    
    switch (uploadType) {
      case "ro_billing":
        // Log first row to see actual column names
        if (jsonData.length > 0) {
          console.log("First row keys:", Object.keys(jsonData[0]));
          console.log("Sample row:", jsonData[0]);
        }
        
        filteredData = jsonData.map((row) => {
          // Extract all possible tax-related fields
          const labourTax = parseFloat(
            row["Labour Tax"] || 
            row["LabourTax"] || 
            row["Servce Tax on Mechanical Labour"] ||
            row["Service Tax on Mechanical Labour"] ||
            0
          );
          
          const partTax = parseFloat(
            row["Part Tax"] || 
            row["PartTax"] ||
            row["VAT on Bodyshop Labour"] ||
            0
          );
          
          return {
            billDate: row["Bill Date"] || row["Date"] || "",
            serviceAdvisor: row["Service Advisor"] || row["Advisor"] || "",
            labourAmt: parseFloat(row["Labour Amt"] || row["Labour Amount"] || 0),
            partAmt: parseFloat(row["Part Amt"] || row["Parts Amount"] || 0),
            labourTax: labourTax,
            partTax: partTax,
            workType: row["Work Type"] || row["Type"] || "",
            roNumber: row["RO Number"] || row["RO No"] || row["R/O No"] || "",
            vehicleNumber: row["Vehicle Number"] || row["Vehicle No"] || row["Vehicle Reg No"] || "",
            customerName: row["Customer Name"] || row["Customer"] || "",
            totalAmount: parseFloat(row["Total Amount"] || row["Total"] || row["Total Amt"] || 0),
          };
        });
        
        // Log sample processed data
        if (filteredData.length > 0) {
          console.log("Sample processed data:", filteredData[0]);
        }
        break;

      case "operations":
        filteredData = jsonData.map((row) => ({
          opPartDescription: row["OP/Part Desc."] || row["OP/Part Desc"] || row["Description"] || row["OP Description"] || row["Part Description"] || "",
          count: parseFloat(row["Count"] || row["Quantity"] || 0),
          amount: parseFloat(row["Amount"] || row["Total"] || 0),
        }));
        break;

      case "warranty":
        filteredData = jsonData.map((row) => ({
          claimNo: row["Claim No"] || row["Claim Number"] || "",
          claimDate: row["Claim Date"] || row["Date"] || "",
          claimType: row["Claim Type"] || row["Type"] || row["Warranty Type"] || "",
          roNumber: row["R/O No"] || row["RO No"] || row["RO Number"] || "",
          roDate: row["R/O Date"] || row["RO Date"] || "",
          status: row["Status"] || "",
          mileage: row["Mileage"] || "",
          labour: parseFloat(row["Labour"] || row["Labour Amt"] || row["Labour Amount"] || 0),
          part: parseFloat(row["part"] || row["Part"] || row["Part Amt"] || row["Parts Amount"] || 0),
          totalAmt: parseFloat(row["Total Amt"] || row["Total Amount"] || row["Total"] || 0),
          approveAmount: parseFloat(row["Approve Amount by HMI"] || row["Approved Amount"] || 0),
          vin: row["VIN"] || "",
          vehicleNumber: row["Vehicle Number"] || row["Vehicle No"] || "",
        }));
        break;

      case "service_booking":
        filteredData = jsonData.map((row) => ({
          serviceAdvisor: row["Service Advisor"] || row["Advisor"] || row["SA"] || "",
          btDateTime: row["B.T Date & Time"] || row["BT Date & Time"] || row["BT DateTime"] || row["Date & Time"] || "",
          workType: row["Work Type"] || row["Type"] || row["Service Type"] || "",
          status: row["Status"] || "",
        }));
        break;
    }

    // Extract date range from filename or data
    const fileName = req.file.originalname.replace(".xlsx", "").replace(".xls", "");
    let startDate = null;
    let endDate = null;
    
    // Try to extract dates from filename (format: name_startDate_to_endDate)
    const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})_to_(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      startDate = new Date(dateMatch[1]);
      endDate = new Date(dateMatch[2]);
    } else {
      // Extract from data
      if (uploadType === 'ro_billing' && filteredData.length > 0) {
        const dates = filteredData
          .map(row => row.billDate ? new Date(row.billDate) : null)
          .filter(d => d && !isNaN(d));
        if (dates.length > 0) {
          startDate = new Date(Math.min(...dates));
          endDate = new Date(Math.max(...dates));
        }
      }
    }

    // Calculate quick stats for fast access
    let quickStats = {};
    if (uploadType === 'ro_billing') {
      const totalRevenue = filteredData.reduce((sum, row) => sum + (row.totalAmount || 0), 0);
      const totalLabour = filteredData.reduce((sum, row) => sum + (row.labourAmt || 0), 0);
      const totalParts = filteredData.reduce((sum, row) => sum + (row.partAmt || 0), 0);
      const uniqueAdvisors = new Set(filteredData.map(row => row.serviceAdvisor)).size;
      
      quickStats = {
        totalRevenue,
        totalLabour,
        totalParts,
        roCount: filteredData.length,
        uniqueAdvisors,
        dateRange: startDate && endDate 
          ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
          : 'N/A'
      };
    } else if (uploadType === 'warranty') {
      const totalLabour = filteredData.reduce((sum, row) => sum + (row.labour || 0), 0);
      const totalParts = filteredData.reduce((sum, row) => sum + (row.part || 0), 0);
      const totalClaimValue = totalLabour + totalParts;
      
      quickStats = {
        totalClaims: filteredData.length,
        totalLabour,
        totalParts,
        totalClaimValue,
        dateRange: startDate && endDate 
          ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
          : 'N/A'
      };
    } else if (uploadType === 'operations') {
      const totalAmount = filteredData.reduce((sum, row) => sum + (row.amount || 0), 0);
      
      quickStats = {
        totalOperations: filteredData.length,
        totalAmount,
        dateRange: startDate && endDate 
          ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
          : 'N/A'
      };
    } else if (uploadType === 'service_booking') {
      const uniqueAdvisors = new Set(filteredData.map(row => row.serviceAdvisor)).size;
      
      quickStats = {
        totalBookings: filteredData.length,
        uniqueAdvisors,
        dateRange: startDate && endDate 
          ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
          : 'N/A'
      };
    }

    // Save to database
    const upload = new ServiceManagerUpload({
      uploadedBy,
      city,
      uploadType,
      fileName: req.file.originalname,
      startDate,
      endDate,
      totalRows: filteredData.length,
      quickStats,
      data: filteredData,
      aggregationStatus: "pending"
    });

    await upload.save();

    // Trigger aggregation in background (non-blocking)
    aggregateUploadData(upload._id)
      .then(() => {
        console.log(`✅ Background aggregation completed for upload ${upload._id}`);
        // Update aggregation status
        ServiceManagerUpload.findByIdAndUpdate(upload._id, { aggregationStatus: "completed" })
          .catch(err => console.error("Error updating aggregation status:", err));
      })
      .catch(err => {
        console.error(`❌ Background aggregation failed for upload ${upload._id}:`, err);
        ServiceManagerUpload.findByIdAndUpdate(upload._id, { aggregationStatus: "failed" })
          .catch(err => console.error("Error updating aggregation status:", err));
      });

    return res.status(200).json({
      message: "File uploaded successfully ✅",
      uploadId: upload._id,
      uploadType,
      city,
      totalRows: filteredData.length,
      uploadDate: upload.uploadDate,
      quickStats
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ 
      message: "Error processing Excel file", 
      error: error.message 
    });
  }
};

// Get all uploads for a specific Service Manager
export const getServiceManagerUploads = async (req, res) => {
  try {
    const { uploadedBy, city, uploadType } = req.query;

    if (!uploadedBy || !city) {
      return res.status(400).json({ 
        message: "Missing required parameters: uploadedBy and city" 
      });
    }

    const query = { uploadedBy, city };
    
    if (uploadType && uploadType !== "all") {
      query.uploadType = uploadType;
    }

    const uploads = await ServiceManagerUpload.find(query)
      .sort({ uploadDate: -1 })
      .select("-data"); // Exclude data for list view

    return res.status(200).json({
      success: true,
      count: uploads.length,
      uploads,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ 
      message: "Error fetching uploads", 
      error: error.message 
    });
  }
};

// Get specific upload data with full details
export const getUploadData = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { uploadedBy, city } = req.query;

    if (!uploadedBy || !city) {
      return res.status(400).json({ 
        message: "Missing required parameters: uploadedBy and city" 
      });
    }

    const upload = await ServiceManagerUpload.findOne({
      _id: uploadId,
      uploadedBy,
      city,
    });

    if (!upload) {
      return res.status(404).json({ 
        message: "Upload not found or access denied" 
      });
    }

    return res.status(200).json({
      success: true,
      upload,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ 
      message: "Error fetching upload data", 
      error: error.message 
    });
  }
};

// Get GM dashboard data (OPTIMIZED - uses pre-aggregated stats)
export const getGMDashboardData = async (req, res) => {
  try {
    const { city, dataType, startDate, endDate } = req.query;

    const query = {};
    
    if (city && city !== "all") {
      query.city = city;
    }
    
    if (dataType && dataType !== "all" && dataType !== "average") {
      query.uploadType = dataType;
    }
    
    // Add date range
    if (startDate && endDate) {
      query.periodStart = { $gte: new Date(startDate) };
      query.periodEnd = { $lte: new Date(endDate) };
    }

    let result = {};

    if (dataType === "average" || !dataType) {
      // Fetch pre-aggregated stats (FAST!)
      const stats = await DashboardStats.find(query)
        .sort({ periodStart: -1 })
        .limit(500);

      // Group by city
      const citiesData = {};
      const overallMetrics = {
        totalRevenue: 0,
        totalROs: 0,
        totalCities: 0,
        totalOperations: 0,
        totalWarrantyClaims: 0,
        totalBookings: 0
      };

      stats.forEach(stat => {
        if (!citiesData[stat.city]) {
          citiesData[stat.city] = {
            ro_billing: { totalRevenue: 0, roCount: 0, totalLabour: 0, totalParts: 0 },
            operations: { totalAmount: 0, totalOperations: 0 },
            warranty: { totalClaims: 0, totalClaimValue: 0 },
            service_booking: { totalBookings: 0 }
          };
        }

        if (stat.uploadType === 'ro_billing' && stat.roBillingStats) {
          citiesData[stat.city].ro_billing.totalRevenue += stat.roBillingStats.totalRevenue || 0;
          citiesData[stat.city].ro_billing.roCount += stat.roBillingStats.roCount || 0;
          citiesData[stat.city].ro_billing.totalLabour += stat.roBillingStats.totalLabour || 0;
          citiesData[stat.city].ro_billing.totalParts += stat.roBillingStats.totalParts || 0;
          overallMetrics.totalRevenue += stat.roBillingStats.totalRevenue || 0;
          overallMetrics.totalROs += stat.roBillingStats.roCount || 0;
        } else if (stat.uploadType === 'operations' && stat.operationsStats) {
          citiesData[stat.city].operations.totalAmount += stat.operationsStats.totalAmount || 0;
          citiesData[stat.city].operations.totalOperations += stat.operationsStats.totalOperations || 0;
          overallMetrics.totalOperations += stat.operationsStats.totalOperations || 0;
        } else if (stat.uploadType === 'warranty' && stat.warrantyStats) {
          citiesData[stat.city].warranty.totalClaims += stat.warrantyStats.totalClaims || 0;
          citiesData[stat.city].warranty.totalClaimValue += stat.warrantyStats.totalClaimValue || 0;
          overallMetrics.totalWarrantyClaims += stat.warrantyStats.totalClaims || 0;
        } else if (stat.uploadType === 'service_booking' && stat.serviceBookingStats) {
          citiesData[stat.city].service_booking.totalBookings += stat.serviceBookingStats.totalBookings || 0;
          overallMetrics.totalBookings += stat.serviceBookingStats.totalBookings || 0;
        }
      });

      overallMetrics.totalCities = Object.keys(citiesData).length;
      overallMetrics.avgROValue = overallMetrics.totalROs > 0 
        ? overallMetrics.totalRevenue / overallMetrics.totalROs 
        : 0;

      // FALLBACK: If no aggregated stats, use quickStats from uploads
      if (stats.length === 0) {
        const uploadQuery = {};
        if (city && city !== "all") {
          uploadQuery.city = city;
        }
        
        const uploads = await ServiceManagerUpload.find(uploadQuery)
          .sort({ uploadDate: -1 })
          .select('city uploadType quickStats totalRows')
          .limit(500);
        
        uploads.forEach(upload => {
          if (!citiesData[upload.city]) {
            citiesData[upload.city] = {
              ro_billing: { totalRevenue: 0, roCount: 0, totalLabour: 0, totalParts: 0 },
              operations: { totalAmount: 0, totalOperations: 0 },
              warranty: { totalClaims: 0, totalClaimValue: 0 },
              service_booking: { totalBookings: 0 }
            };
          }
          
          if (upload.uploadType === 'ro_billing' && upload.quickStats) {
            citiesData[upload.city].ro_billing.totalRevenue += upload.quickStats.totalRevenue || 0;
            citiesData[upload.city].ro_billing.roCount += upload.quickStats.roCount || 0;
            citiesData[upload.city].ro_billing.totalLabour += upload.quickStats.totalLabour || 0;
            citiesData[upload.city].ro_billing.totalParts += upload.quickStats.totalParts || 0;
            overallMetrics.totalRevenue += upload.quickStats.totalRevenue || 0;
            overallMetrics.totalROs += upload.quickStats.roCount || 0;
          } else if (upload.uploadType === 'warranty' && upload.quickStats) {
            citiesData[upload.city].warranty.totalClaims += upload.quickStats.totalClaims || 0;
            citiesData[upload.city].warranty.totalClaimValue += upload.quickStats.totalClaimValue || 0;
            overallMetrics.totalWarrantyClaims += upload.quickStats.totalClaims || 0;
          } else if (upload.uploadType === 'operations' && upload.quickStats) {
            citiesData[upload.city].operations.totalAmount += upload.quickStats.totalAmount || 0;
            citiesData[upload.city].operations.totalOperations += upload.quickStats.totalOperations || 0;
            overallMetrics.totalOperations += upload.quickStats.totalOperations || 0;
          } else if (upload.uploadType === 'service_booking' && upload.quickStats) {
            citiesData[upload.city].service_booking.totalBookings += upload.quickStats.totalBookings || 0;
            overallMetrics.totalBookings += upload.quickStats.totalBookings || 0;
          }
        });
        
        overallMetrics.totalCities = Object.keys(citiesData).length;
        overallMetrics.avgROValue = overallMetrics.totalROs > 0 
          ? overallMetrics.totalRevenue / overallMetrics.totalROs 
          : 0;
      }

      // Get top performers from AdvisorPerformanceSummary
      const topPerformersQuery = {};
      if (city && city !== "all") {
        topPerformersQuery.city = city;
      }
      
      const topPerformers = await AdvisorPerformanceSummary.find(topPerformersQuery)
        .sort({ 'roBillingPerformance.totalRevenue': -1 })
        .limit(10)
        .select('advisorName city roBillingPerformance.totalRevenue roBillingPerformance.roCount rankings');

      result = {
        dataType: "average",
        citiesData,
        overallMetrics,
        topPerformers,
        periodsCovered: stats.length,
        cached: stats.length > 0
      };
    } else if (dataType && dataType !== "all") {
      // Get specific data type stats
      query.uploadType = dataType;
      const stats = await DashboardStats.find(query)
        .sort({ periodStart: -1 })
        .limit(100);

      const cities = [...new Set(stats.map(s => s.city))];
      
      result = {
        dataType,
        stats,
        cities,
        count: stats.length
      };
    }

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("GM Dashboard error:", error);
    res.status(500).json({ 
      message: "Error fetching GM dashboard data", 
      error: error.message 
    });
  }
};

// Get aggregated data for dashboard (OPTIMIZED - uses pre-aggregated stats)
export const getDashboardData = async (req, res) => {
  try {
    const { uploadedBy, city, dataType, startDate, endDate } = req.query;

    if (!uploadedBy || !city) {
      return res.status(400).json({ 
        message: "Missing required parameters: uploadedBy and city" 
      });
    }

    // Build query for pre-aggregated stats
    const query = { uploadedBy, city };
    
    if (dataType && dataType !== "all" && dataType !== "average") {
      query.uploadType = dataType;
    }
    
    // Add date range filter if provided
    if (startDate && endDate) {
      query.periodStart = { $gte: new Date(startDate) };
      query.periodEnd = { $lte: new Date(endDate) };
    }

    let result = {};

    if (dataType === "average") {
      // Fetch pre-aggregated stats (FAST!)
      const stats = await DashboardStats.find(query)
        .sort({ periodStart: -1 })
        .limit(100);

      // Aggregate across all stats
      const summary = {
        ro_billing: {
          count: 0,
          totalRevenue: 0,
          totalLabour: 0,
          totalParts: 0,
          roCount: 0
        },
        operations: {
          count: 0,
          totalAmount: 0,
          totalOperations: 0
        },
        warranty: {
          count: 0,
          totalClaims: 0,
          totalClaimValue: 0
        },
        service_booking: {
          count: 0,
          totalBookings: 0
        }
      };

      stats.forEach(stat => {
        if (stat.uploadType === 'ro_billing' && stat.roBillingStats) {
          summary.ro_billing.totalRevenue += stat.roBillingStats.totalRevenue || 0;
          summary.ro_billing.totalLabour += stat.roBillingStats.totalLabour || 0;
          summary.ro_billing.totalParts += stat.roBillingStats.totalParts || 0;
          summary.ro_billing.roCount += stat.roBillingStats.roCount || 0;
          summary.ro_billing.count++;
        } else if (stat.uploadType === 'operations' && stat.operationsStats) {
          summary.operations.totalAmount += stat.operationsStats.totalAmount || 0;
          summary.operations.totalOperations += stat.operationsStats.totalOperations || 0;
          summary.operations.count++;
        } else if (stat.uploadType === 'warranty' && stat.warrantyStats) {
          summary.warranty.totalClaims += stat.warrantyStats.totalClaims || 0;
          summary.warranty.totalClaimValue += stat.warrantyStats.totalClaimValue || 0;
          summary.warranty.count++;
        } else if (stat.uploadType === 'service_booking' && stat.serviceBookingStats) {
          summary.service_booking.totalBookings += stat.serviceBookingStats.totalBookings || 0;
          summary.service_booking.count++;
        }
      });

      // FALLBACK: Always use quickStats from uploads if aggregated stats are empty or missing
      const uploads = await ServiceManagerUpload.find({
        uploadedBy,
        city
      })
        .sort({ uploadDate: -1 })
        .select('uploadType quickStats totalRows')
        .limit(100);
      
      console.log(`Found ${uploads.length} uploads for average aggregation`);
      
      uploads.forEach(upload => {
        console.log(`Processing upload: ${upload.uploadType}, quickStats:`, upload.quickStats);
        
        if (upload.uploadType === 'ro_billing' && upload.quickStats) {
          summary.ro_billing.totalRevenue += upload.quickStats.totalRevenue || 0;
          summary.ro_billing.totalLabour += upload.quickStats.totalLabour || 0;
          summary.ro_billing.totalParts += upload.quickStats.totalParts || 0;
          summary.ro_billing.roCount += upload.quickStats.roCount || 0;
          summary.ro_billing.count++;
        } else if (upload.uploadType === 'warranty' && upload.quickStats) {
          summary.warranty.totalClaims += upload.quickStats.totalClaims || 0;
          summary.warranty.totalClaimValue += upload.quickStats.totalClaimValue || 0;
          summary.warranty.count++;
        } else if (upload.uploadType === 'operations' && upload.quickStats) {
          summary.operations.totalAmount += upload.quickStats.totalAmount || 0;
          summary.operations.totalOperations += upload.quickStats.totalOperations || 0;
          summary.operations.count++;
        } else if (upload.uploadType === 'service_booking' && upload.quickStats) {
          summary.service_booking.totalBookings += upload.quickStats.totalBookings || 0;
          summary.service_booking.count++;
        }
      });
      
      console.log('Final summary for average:', summary);

      result = {
        dataType: "average",
        summary,
        periodsCovered: stats.length,
        cached: stats.length > 0
      };
    } else if (dataType && dataType !== "all") {
      // Get specific data type from pre-aggregated stats
      query.uploadType = dataType;
      const stats = await DashboardStats.find(query)
        .sort({ periodStart: -1 })
        .limit(50);

      // Also get upload metadata WITH data for backward compatibility
      const uploads = await ServiceManagerUpload.find({ 
        uploadedBy, 
        city, 
        uploadType: dataType 
      })
        .sort({ uploadDate: -1 })
        .limit(50);
      
      // Flatten all data from uploads for backward compatibility
      const allData = [];
      uploads.forEach(upload => {
        if (upload.data && Array.isArray(upload.data)) {
          allData.push(...upload.data);
        }
      });
      
      result = {
        dataType,
        stats,
        data: allData, // Add data array for backward compatibility
        uploads: uploads.map(u => ({
          id: u._id,
          fileName: u.fileName,
          uploadDate: u.uploadDate,
          totalRows: u.totalRows,
          quickStats: u.quickStats,
          aggregationStatus: u.aggregationStatus
        })),
        count: stats.length
      };
    } else {
      // Get all uploads metadata with data for backward compatibility
      const uploads = await ServiceManagerUpload.find(query)
        .sort({ uploadDate: -1 })
        .limit(100);
      
      // Flatten all data from uploads for backward compatibility
      const allData = [];
      uploads.forEach(upload => {
        if (upload.data && Array.isArray(upload.data)) {
          allData.push(...upload.data);
        }
      });
      
      result = {
        dataType: "all",
        totalUploads: uploads.length,
        data: allData, // Add data array for backward compatibility
        uploads: uploads.map(u => ({
          id: u._id,
          uploadType: u.uploadType,
          fileName: u.fileName,
          uploadDate: u.uploadDate,
          totalRows: u.totalRows,
          quickStats: u.quickStats,
          aggregationStatus: u.aggregationStatus
        }))
      };
    }

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    res.status(500).json({ 
      message: "Error fetching dashboard data", 
      error: error.message 
    });
  }
};

// Delete upload
export const deleteUpload = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { uploadedBy, city } = req.query;

    if (!uploadedBy || !city) {
      return res.status(400).json({ 
        message: "Missing required parameters: uploadedBy and city" 
      });
    }

    const upload = await ServiceManagerUpload.findOneAndDelete({
      _id: uploadId,
      uploadedBy,
      city,
    });

    if (!upload) {
      return res.status(404).json({ 
        message: "Upload not found or access denied" 
      });
    }

    return res.status(200).json({
      success: true,
      message: "Upload deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ 
      message: "Error deleting upload", 
      error: error.message 
    });
  }
};

// Reset database - delete all uploads for a user
export const resetDatabase = async (req, res) => {
  try {
    const { uploadedBy, city } = req.query;

    if (!uploadedBy || !city) {
      return res.status(400).json({ 
        message: "Missing required parameters: uploadedBy and city" 
      });
    }

    const result = await ServiceManagerUpload.deleteMany({
      uploadedBy,
      city,
    });

    return res.status(200).json({
      success: true,
      message: `Database reset successfully. Deleted ${result.deletedCount} uploads.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Reset error:", error);
    res.status(500).json({ 
      message: "Error resetting database", 
      error: error.message 
    });
  }
};
