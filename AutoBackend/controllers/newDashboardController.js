import UploadedFileMetaDetails from '../models/UploadedFileMetaDetails.js';
import ROBillingData from '../models/ROBillingData.js';
import WarrantyData from '../models/WarrantyData.js';
import BookingListData from '../models/BookingListData.js';
import OperationsPartData from '../models/OperationsPartData.js';
import AdvisorOperations from '../models/AdvisorOperations.js';
import RepairOrderListData from '../models/RepairOrderListData.js';
import dashboardStatsService from '../services/dashboardStatsService.js';
import mongoose from 'mongoose';

/**
 * Get dashboard data from new Excel upload models
 * This replaces the old getDashboardData function to work with the new data structure
 */
export const getNewDashboardData = async (req, res) => {
  try {
    const { uploadedBy, city, dataType } = req.query;
    const summaryOnly = req.query.summary === 'true';

    console.log(`🔍 Dashboard API called with params:`, req.query);

    if (!uploadedBy) {
      return res.status(400).json({ 
        message: "Missing required parameter: uploadedBy" 
      });
    }

    console.log(`🎯 Getting dashboard data for: "${uploadedBy}", type: ${dataType}`);

    let data = [];
    let count = 0;
    let summary = {};
    let uploads = [];

    // Get file uploads metadata with smart matching
    let fileQuery = {};
    
    // Map frontend dataType to backend file_type
    const typeMapping = {
      'ro_billing': 'ro_billing',
      'operations': 'operations_part',
      'warranty': 'warranty',
      'service_booking': 'booking_list',
      'repair_order_list': 'repair_order_list'
    };
    
    if (dataType && dataType !== 'all' && dataType !== 'average') {
      fileQuery.file_type = typeMapping[dataType] || dataType;
    }

    console.log(`🔍 Searching uploads with query:`, fileQuery);
    
    // Try exact email match first
    const exactQuery = { ...fileQuery, uploaded_by: uploadedBy };
    try {
      uploads = await UploadedFileMetaDetails.find(exactQuery)
        .sort({ uploaded_at: -1 })
        .limit(10)
        .lean();
      console.log(`📊 Found ${uploads.length} uploads for exact email match`);
    } catch (uploadQueryError) {
      console.error("❌ Error querying uploads:", uploadQueryError);
      return res.status(500).json({
        success: false,
        message: "Error fetching upload metadata",
        error: uploadQueryError.message
      });
    }

    // If no uploads, return empty success to avoid downstream errors
    if (uploads.length === 0) {
      return res.json({
        success: true,
        dataType: dataType || 'all',
        count: 0,
        data: [],
        summary: {},
        uploads: [],
      });
    }

    // ✅ STRICT DATA ISOLATION: Only show data uploaded by the exact user
    // No fallback to other users' data to prevent data leakage between service managers
    if (uploads.length === 0) {
      console.log(`⚠️ No uploads found for email "${uploadedBy}" - maintaining strict data isolation`);
      console.log(`🔒 Data isolation enforced: Each service manager can only see their own uploaded data`);
    }

    // Get data based on type
    switch (dataType) {
      case 'ro_billing':
        const roBillingFiles = uploads.filter(f => f.file_type === 'ro_billing');
        if (roBillingFiles.length > 0) {
          const fileIds = roBillingFiles.map(f => f._id).filter(id => mongoose.Types.ObjectId.isValid(id));
          
          if (fileIds.length === 0) {
            break; // Skip if no valid file IDs
          }

          try {
            if (!summaryOnly) {
              const rawData = await ROBillingData.find({ uploaded_file_id: { $in: fileIds } })
                .sort({ created_at: -1 })
                .lean();
              
              // Convert snake_case to camelCase for frontend compatibility
              data = (rawData || []).map(record => ({
                ...record,
                // Map database fields to frontend expected fields
                workType: record.work_type,
                serviceAdvisor: record.service_advisor,
                labourAmt: record.labour_amt || 0,
                partAmt: record.part_amt || 0,
                totalAmount: record.total_amount || 0,
                vehicleNumber: record.vehicle_number,
                customerName: record.customer_name,
                billDate: record.bill_date,
                technicianName: record.technician_name,
                discountAmount: record.discount_amount || 0,
                taxAmount: record.tax_amount || 0,
                roundOffAmount: record.round_off_amount || 0,
                serviceTax: record.service_tax || 0,
                vatAmount: record.vat_amount || 0,
                labourTax: record.labour_tax || 0,
                partTax: record.part_tax || 0,
                otherAmount: record.other_amount || 0
              }));
            }
            
            count = await ROBillingData.countDocuments({ uploaded_file_id: { $in: fileIds } }).catch(() => 0);
            
            // Calculate summary
            const totalAmount = await ROBillingData.aggregate([
              { $match: { uploaded_file_id: { $in: fileIds } } },
              { $group: { 
                _id: null, 
                total: { $sum: { $ifNull: ['$total_amount', 0] } },
                labour: { $sum: { $ifNull: ['$labour_amt', 0] } },
                parts: { $sum: { $ifNull: ['$part_amt', 0] } }
              }}
            ]).catch(() => []);
          
            summary = {
              totalRecords: count,
              totalAmount: totalAmount[0]?.total || 0,
              labourAmount: totalAmount[0]?.labour || 0,
              partsAmount: totalAmount[0]?.parts || 0
            };
          } catch (roBillingError) {
            console.error("❌ Error processing RO Billing data:", roBillingError);
            count = 0;
            data = [];
            summary = {
              totalRecords: 0,
              totalAmount: 0,
              labourAmount: 0,
              partsAmount: 0
            };
          }
        }
        break;

      case 'warranty':
        const warrantyFiles = uploads.filter(f => f.file_type === 'warranty');
        if (warrantyFiles.length > 0) {
          const fileIds = warrantyFiles.map(f => f._id);
          if (!summaryOnly) {
            data = await WarrantyData.find({ uploaded_file_id: { $in: fileIds } })
              .sort({ created_at: -1 });
          }
          count = await WarrantyData.countDocuments({ uploaded_file_id: { $in: fileIds } });
          
          // Calculate warranty financial summary
          const warrantyFinancials = await WarrantyData.aggregate([
            { $match: { uploaded_file_id: { $in: fileIds } } },
            { $group: { 
              _id: null, 
              totalClaimAmount: { $sum: '$total_claim_amount' },
              totalLabourAmount: { $sum: '$labour_amount' },
              totalPartAmount: { $sum: '$part_amount' },
              totalApprovedAmount: { $sum: '$approved_amount' }
            }}
          ]);
          
          // Get claim type breakdown
          const claimTypeBreakdown = await WarrantyData.aggregate([
            { $match: { uploaded_file_id: { $in: fileIds } } },
            { $group: { 
              _id: '$claim_type',
              count: { $sum: 1 },
              totalAmount: { $sum: '$total_claim_amount' },
              labourAmount: { $sum: '$labour_amount' },
              partAmount: { $sum: '$part_amount' }
            }},
            { $sort: { count: -1 } }
          ]);

          // Get claim status breakdown
          const claimStatusBreakdown = await WarrantyData.aggregate([
            { $match: { uploaded_file_id: { $in: fileIds } } },
            { $group: { 
              _id: { $ifNull: ['$claim_status', 'Not Set'] },
              count: { $sum: 1 },
              totalAmount: { $sum: '$total_claim_amount' },
              labourAmount: { $sum: '$labour_amount' },
              partAmount: { $sum: '$part_amount' }
            }},
            { $sort: { count: -1 } }
          ]);

          // Get claim type with status breakdown (grouped by type and status)
          const claimTypeStatusBreakdown = await WarrantyData.aggregate([
            { $match: { uploaded_file_id: { $in: fileIds } } },
            { $group: { 
              _id: {
                claimType: '$claim_type',
                claimStatus: { $ifNull: ['$claim_status', 'Not Set'] }
              },
              count: { $sum: 1 },
              totalAmount: { $sum: '$total_claim_amount' },
              labourAmount: { $sum: '$labour_amount' },
              partAmount: { $sum: '$part_amount' }
            }},
            { $sort: { '_id.claimType': 1, count: -1 } }
          ]);
          
          summary = {
            totalRecords: count,
            totalClaims: count,
            totalClaimAmount: warrantyFinancials[0]?.totalClaimAmount || 0,
            totalLabourAmount: warrantyFinancials[0]?.totalLabourAmount || 0,
            totalPartAmount: warrantyFinancials[0]?.totalPartAmount || 0,
            totalApprovedAmount: warrantyFinancials[0]?.totalApprovedAmount || 0,
            claimTypeBreakdown: claimTypeBreakdown.map(item => ({
              type: item._id || 'Unknown',
              count: item.count,
              totalAmount: item.totalAmount,
              labourAmount: item.labourAmount,
              partAmount: item.partAmount
            })),
            claimStatusBreakdown: claimStatusBreakdown.map(item => ({
              status: item._id,
              count: item.count,
              totalAmount: item.totalAmount,
              labourAmount: item.labourAmount,
              partAmount: item.partAmount
            })),
            claimTypeStatusBreakdown: claimTypeStatusBreakdown.map(item => ({
              claimType: item._id.claimType || 'Unknown',
              claimStatus: item._id.claimStatus,
              count: item.count,
              totalAmount: item.totalAmount,
              labourAmount: item.labourAmount,
              partAmount: item.partAmount
            }))
          };
        }
        break;

      case 'service_booking':
        const bookingFiles = uploads.filter(f => f.file_type === 'booking_list');
        if (bookingFiles.length > 0) {
          const fileIds = bookingFiles.map(f => f._id);
          if (!summaryOnly) {
            data = await BookingListData.find({ uploaded_file_id: { $in: fileIds } })
              .sort({ created_at: -1 });
          }
          count = await BookingListData.countDocuments({ uploaded_file_id: { $in: fileIds } });
          
          // Get Service Advisor breakdown
          const advisorBreakdown = await BookingListData.aggregate([
            { $match: { uploaded_file_id: { $in: fileIds } } },
            { $group: { 
              _id: '$service_advisor',
              count: { $sum: 1 }
            }},
            { $sort: { count: -1 } }
          ]);

          // Get Work Type breakdown
          const workTypeBreakdown = await BookingListData.aggregate([
            { $match: { uploaded_file_id: { $in: fileIds } } },
            { $group: { 
              _id: '$work_type',
              count: { $sum: 1 }
            }},
            { $sort: { count: -1 } }
          ]);

          // Get Status breakdown (including null values) - use booking_status field
          const statusBreakdown = await BookingListData.aggregate([
            { $match: { uploaded_file_id: { $in: fileIds } } },
            { $group: { 
              _id: { $ifNull: ['$booking_status', 'Not Set'] },
              count: { $sum: 1 }
            }},
            { $sort: { count: -1 } }
          ]);
          
          summary = {
            totalRecords: count,
            totalBookings: count,
            serviceAdvisorBreakdown: advisorBreakdown.map(item => ({
              advisor: item._id || 'Unknown',
              count: item.count
            })),
            workTypeBreakdown: workTypeBreakdown.map(item => ({
              type: item._id || 'Unknown',
              count: item.count
            })),
            statusBreakdown: statusBreakdown.map(item => ({
              status: item._id,
              count: item.count
            }))
          };
        }
        break;

      case 'operations':
        const operationsFiles = uploads.filter(f => f.file_type === 'operations_part');
        if (operationsFiles.length > 0) {
          const fileIds = operationsFiles.map(f => f._id);
          data = await OperationsPartData.find({ uploaded_file_id: { $in: fileIds } })
            .sort({ created_at: -1 });
          count = await OperationsPartData.countDocuments({ uploaded_file_id: { $in: fileIds } });
          
          summary = {
            totalRecords: count,
            totalOperations: count
          };
        }
        break;

      case 'repair_order_list':
        const repairOrderFiles = uploads.filter(f => f.file_type === 'repair_order_list');
        if (repairOrderFiles.length > 0) {
          const fileIds = repairOrderFiles.map(f => f._id);
          if (!summaryOnly) {
            data = await RepairOrderListData.find({ uploaded_file_id: { $in: fileIds } })
              .sort({ created_at: -1 });
          }
          count = await RepairOrderListData.countDocuments({ uploaded_file_id: { $in: fileIds } });
          
          // Calculate summary for Repair Order List
          const statusBreakdown = await RepairOrderListData.aggregate([
            { $match: { uploaded_file_id: { $in: fileIds } } },
            { $group: { 
              _id: '$ro_status',
              count: { $sum: 1 }
            }},
            { $sort: { count: -1 } }
          ]);

          const advisorBreakdown = await RepairOrderListData.aggregate([
            { $match: { uploaded_file_id: { $in: fileIds } } },
            { $group: { 
              _id: '$svc_adv',
              count: { $sum: 1 }
            }},
            { $sort: { count: -1 } }
          ]);

          const workTypeBreakdown = await RepairOrderListData.aggregate([
            { $match: { uploaded_file_id: { $in: fileIds } } },
            { $group: { 
              _id: '$work_type',
              count: { $sum: 1 }
            }},
            { $sort: { count: -1 } }
          ]);
          
          summary = {
            totalRecords: count,
            statusBreakdown: statusBreakdown.map(item => ({
              status: item._id,
              count: item.count
            })),
            advisorBreakdown: advisorBreakdown.map(item => ({
              advisor: item._id,
              count: item.count
            })),
            workTypeBreakdown: workTypeBreakdown.map(item => ({
              workType: item._id,
              count: item.count
            }))
          };
        }
        break;

      default:
        // Get all data types with actual data for average dashboard
        const allFiles = uploads;
        const fileIds = allFiles.map(f => f._id);
        
        // Validate fileIds - ensure they're valid ObjectIds
        const validFileIds = fileIds.filter(id => {
          try {
            return mongoose.Types.ObjectId.isValid(id);
          } catch (e) {
            return false;
          }
        });
        
        // If no valid file IDs, return empty response
        if (validFileIds.length === 0) {
          return res.json({
            success: true,
            dataType: dataType || 'all',
            count: 0,
            data: [],
            summary: {
              totalRecords: 0,
              roBilling: 0,
              warranty: 0,
              bookings: 0,
              operations: 0,
              totalAmount: 0,
              labourAmount: 0,
              partsAmount: 0
            },
            uploads: uploads.map(upload => ({
              _id: upload._id,
              fileName: upload.uploaded_file_name,
              uploadDate: upload.uploaded_at,
              fileType: upload.file_type,
              rowsCount: upload.rows_count,
              processingStatus: upload.processing_status
            }))
          });
        }
        
        // Get counts and aggregates; only fetch sample data when not summary
        let roCount = 0, warrantyCount = 0, bookingCount = 0, operationsCount = 0;
        let warrantyTotals = [], totalAmountAgg = [];
        
        try {
          [
            roCount,
            warrantyCount,
            bookingCount,
            operationsCount,
            warrantyTotals,
            totalAmountAgg
          ] = await Promise.all([
            ROBillingData.countDocuments({ uploaded_file_id: { $in: validFileIds } }).catch(() => 0),
            WarrantyData.countDocuments({ uploaded_file_id: { $in: validFileIds } }).catch(() => 0),
            BookingListData.countDocuments({ uploaded_file_id: { $in: validFileIds } }).catch(() => 0),
            OperationsPartData.countDocuments({ uploaded_file_id: { $in: validFileIds } }).catch(() => 0),
            WarrantyData.aggregate([
              { $match: { uploaded_file_id: { $in: validFileIds } } },
              { $group: { 
                _id: null, 
                totalClaimAmount: { $sum: { $ifNull: ['$total_claim_amount', 0] } },
                totalLabourAmount: { $sum: { $ifNull: ['$labour_amount', 0] } },
                totalPartAmount: { $sum: { $ifNull: ['$part_amount', 0] } },
                totalApprovedAmount: { $sum: { $ifNull: ['$approved_amount', 0] } }
              }}
            ]).catch(() => []),
            ROBillingData.aggregate([
              { $match: { uploaded_file_id: { $in: validFileIds } } },
              { $group: { 
                _id: null, 
                total: { $sum: { $ifNull: ['$total_amount', 0] } },
                labour: { $sum: { $ifNull: ['$labour_amt', 0] } },
                parts: { $sum: { $ifNull: ['$part_amt', 0] } }
              }}
            ]).catch(() => [])
          ]);
        } catch (queryError) {
          console.error("❌ Error in Promise.all queries:", queryError);
          // Continue with default values (all zeros/empty arrays)
        }

        if (!summaryOnly) {
          try {
            const [roData, warrantyData] = await Promise.all([
              ROBillingData.find({ uploaded_file_id: { $in: validFileIds } }).sort({ created_at: -1 }).limit(50).catch(() => []),
              WarrantyData.find({ uploaded_file_id: { $in: validFileIds } }).sort({ created_at: -1 }).limit(50).catch(() => [])
            ]);

            // Convert RO Billing data to camelCase for frontend
            const convertedRoData = (roData || []).map(record => {
              const recordObj = record && typeof record.toObject === 'function' ? record.toObject() : record;
              return {
                ...recordObj,
                workType: recordObj.work_type,
                serviceAdvisor: recordObj.service_advisor,
                labourAmt: recordObj.labour_amt || 0,
                partAmt: recordObj.part_amt || 0,
                totalAmount: recordObj.total_amount || 0,
                vehicleNumber: recordObj.vehicle_number,
                customerName: recordObj.customer_name,
                billDate: recordObj.bill_date,
                technicianName: recordObj.technician_name
              };
            });

            // Combine data for average view (limited sample)
            data = [...convertedRoData, ...(warrantyData || [])];
          } catch (dataFetchError) {
            console.error("❌ Error fetching data for average dashboard:", dataFetchError);
            data = []; // Set empty data array on error
          }
        }

        const totalAmount = totalAmountAgg || [];
        count = roCount + warrantyCount + bookingCount + operationsCount;

        summary = {
          totalRecords: count,
          roBilling: roCount,
          warranty: warrantyCount,
          bookings: bookingCount,
          operations: operationsCount,
          totalAmount: totalAmount[0]?.total || 0,
          labourAmount: totalAmount[0]?.labour || 0,
          partsAmount: totalAmount[0]?.parts || 0,
          // Add frontend-expected structure
          ro_billing: {
            totalRevenue: totalAmount[0]?.total || 0,
            totalRecords: roCount,
            labourAmount: totalAmount[0]?.labour || 0,
            partsAmount: totalAmount[0]?.parts || 0
          },
          warranty: {
            totalClaimValue: warrantyTotals[0]?.totalClaimAmount || 0,
            totalClaims: warrantyCount,
            totalLabourAmount: warrantyTotals[0]?.totalLabourAmount || 0,
            totalPartAmount: warrantyTotals[0]?.totalPartAmount || 0,
            totalApprovedAmount: warrantyTotals[0]?.totalApprovedAmount || 0
          },
          service_booking: {
            totalBookings: bookingCount
          },
          operations: {
            totalOperations: operationsCount,
            totalAmount: 0
          }
        };
        break;
    }

    console.log(`✅ Dashboard data retrieved: ${count} records, ${uploads.length} uploads`);

    // Prepare response data
    const responseData = {
      success: true,
      dataType: dataType || 'all',
      count,
      data,
      summary,
      uploads: uploads.map(upload => ({
        _id: upload._id,
        fileName: upload.uploaded_file_name,
        uploadDate: upload.uploaded_at,
        fileType: upload.file_type,
        rowsCount: upload.rows_count,
        processingStatus: upload.processing_status
      }))
    };

    // Save dashboard stats to database (async, don't wait for completion)
    if (dataType && dataType !== 'all' && dataType !== 'average' && count > 0) {
      dashboardStatsService.saveDashboardStats(uploadedBy, city || 'Unknown', dataType, responseData)
        .then(() => {
          console.log(`💾 Dashboard stats saved for ${dataType}`);
        })
        .catch(error => {
          console.error(`❌ Error saving dashboard stats for ${dataType}:`, error.message);
        });
    }

    return res.status(200).json(responseData);

  } catch (error) {
    console.error("❌ Dashboard data error:", error);
    res.status(500).json({ 
      message: "Error fetching dashboard data", 
      error: error.message 
    });
  }
};

/**
 * Get advisor operations data from new models
 */
export const getNewAdvisorOperations = async (req, res) => {
  try {
    const { uploadedBy, city, dataDate, viewMode } = req.query;

    if (!uploadedBy) {
      return res.status(400).json({ 
        message: "Missing required parameter: uploadedBy" 
      });
    }

    console.log(`🎯 Getting advisor operations for: ${uploadedBy}, date: ${dataDate}`);

    // Get RO Billing data (which contains service advisor info)
    const roFiles = await UploadedFileMetaDetails.find({ 
      uploaded_by: uploadedBy,
      file_type: 'ro_billing'
    }).sort({ uploaded_at: -1 });

    if (roFiles.length === 0) {
      return res.status(200).json({
        success: true,
        advisors: [],
        operationsData: [],
        roData: []
      });
    }

    const fileIds = roFiles.map(f => f._id);
    
    // Get RO Billing data with service advisor information
    const roData = await ROBillingData.find({ 
      uploaded_file_id: { $in: fileIds } 
    }).sort({ created_at: -1 });

    // Extract unique advisors
    const advisors = [...new Set(roData
      .filter(ro => ro.service_advisor && ro.service_advisor.trim() !== '')
      .map(ro => ro.service_advisor.trim())
    )];

    // Group data by advisor
    const operationsData = advisors.map(advisor => {
      const advisorROs = roData.filter(ro => 
        ro.service_advisor && ro.service_advisor.trim() === advisor
      );
      
      const totalAmount = advisorROs.reduce((sum, ro) => sum + (ro.total_amount || 0), 0);
      
      return {
        advisorName: advisor,
        fileName: roFiles[0]?.uploaded_file_name || 'Unknown',
        uploadDate: roFiles[0]?.uploaded_at || new Date(),
        dataDate: dataDate || new Date().toISOString().split('T')[0],
        totalMatchedAmount: totalAmount,
        matchedOperations: advisorROs.map(ro => ({
          operation: ro.RO_No || 'Unknown',
          amount: ro.total_amount || 0
        }))
      };
    });

    console.log(`✅ Advisor operations retrieved: ${advisors.length} advisors, ${roData.length} ROs`);

    return res.status(200).json({
      success: true,
      advisors,
      operationsData,
      roData: roData.slice(0, 100) // Limit for performance
    });

  } catch (error) {
    console.error("❌ Advisor operations error:", error);
    res.status(500).json({ 
      message: "Error fetching advisor operations", 
      error: error.message 
    });
  }
};
