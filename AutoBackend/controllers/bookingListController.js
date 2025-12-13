import BookingListData from '../models/BookingListData.js';
import vinMatchingService from '../services/vinMatchingService.js';
import mongoose from 'mongoose';

/**
 * BookingList Controller
 * Handles BookingList specific API endpoints with VIN matching
 */

/**
 * GET /api/booking-list/dashboard
 * Get BookingList data with VIN matching and status categorization
 */
export const getBookingListDashboard = async (req, res) => {
  try {
    console.log('🎯 BookingList Dashboard API called with params:', req.query);
    
    const { uploadedBy, city, showroom_id } = req.query;
    
    if (!uploadedBy || !showroom_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: uploadedBy, showroom_id'
      });
    }

    console.log(`🎯 Getting BookingList dashboard data for: "${uploadedBy}", showroom: ${showroom_id}`);

    // DEBUGGING: Check what data actually exists in the database
    const totalBookingRecords = await BookingListData.countDocuments();
    const existingShowroomIds = await BookingListData.distinct('showroom_id');
    const bookingsByShowroom = await BookingListData.aggregate([
      { $group: { _id: '$showroom_id', count: { $sum: 1 } } }
    ]);
    
    console.log(`📊 Database Debug Info:`);
    console.log(`   Total BookingList records: ${totalBookingRecords}`);
    console.log(`   Existing showroom_ids:`, existingShowroomIds);
    console.log(`   Records per showroom:`, bookingsByShowroom);
    console.log(`   Querying for showroom_id: ${showroom_id} (type: ${typeof showroom_id})`);

    // Perform VIN matching and get enhanced booking data
    const vinMatchingResult = await vinMatchingService.performVINMatching(
      uploadedBy, 
      city || 'Unknown', 
      showroom_id
    );

    // Handle case when no data is found
    if (!vinMatchingResult || !vinMatchingResult.bookings) {
      console.log('⚠️ No booking data found for the given parameters');
      return res.json({
        success: true,
        data: [],
        summary: {
          totalBookings: 0,
          matchedVINs: 0,
          unmatchedVINs: 0,
          statusBreakdown: [],
          serviceAdvisorBreakdown: [],
          traditionalServiceAdvisorBreakdown: [],
          workTypeBreakdown: []
        },
        vinMatching: {
          totalBookings: 0,
          matchedVINs: 0,
          unmatchedVINs: 0,
          statusSummary: {}
        }
      });
    }

    // Create status breakdown for dashboard
    const statusBreakdown = Object.keys(vinMatchingResult.statusSummary || {}).map(category => ({
      status: vinMatchingResult.statusSummary[category].status,
      category: category,
      count: vinMatchingResult.statusSummary[category].count
    }));

    // Create work type breakdown from traditional service advisor breakdown
    const workTypeBreakdown = (vinMatchingResult.traditionalServiceAdvisorBreakdown || []).reduce((acc, advisor) => {
      // This is a simplified work type breakdown for backward compatibility
      // The detailed advisor-worktype breakdown is in serviceAdvisorBreakdown
      return acc;
    }, []);

    console.log(`✅ BookingList dashboard data retrieved: ${vinMatchingResult.totalBookings} bookings`);
    console.log(`📊 VIN matching: ${vinMatchingResult.matchedVINs} matched, ${vinMatchingResult.unmatchedVINs} unmatched`);

    res.json({
      success: true,
      data: vinMatchingResult.bookings,
      summary: {
        totalBookings: vinMatchingResult.totalBookings,
        matchedVINs: vinMatchingResult.matchedVINs,
        unmatchedVINs: vinMatchingResult.unmatchedVINs,
        statusBreakdown: statusBreakdown,
        serviceAdvisorBreakdown: vinMatchingResult.serviceAdvisorBreakdown, // New detailed advisor-worktype breakdown
        traditionalServiceAdvisorBreakdown: vinMatchingResult.traditionalServiceAdvisorBreakdown, // For backward compatibility
        workTypeBreakdown: workTypeBreakdown
      },
      vinMatching: {
        totalBookings: vinMatchingResult.totalBookings,
        matchedVINs: vinMatchingResult.matchedVINs,
        unmatchedVINs: vinMatchingResult.unmatchedVINs,
        statusSummary: vinMatchingResult.statusSummary
      }
    });

  } catch (error) {
    console.error('❌ Error getting BookingList dashboard data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error retrieving BookingList dashboard data'
    });
  }
};

/**
 * GET /api/booking-list/vin-status/:vin
 * Check VIN matching status for a specific VIN
 */
export const getVINStatus = async (req, res) => {
  try {
    const { vin } = req.params;
    const { showroom_id } = req.query;
    
    if (!vin || !showroom_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: vin, showroom_id'
      });
    }

    // Check if VIN exists in BookingList
    const bookingRecord = await BookingListData.findOne({
      vin_number: { $regex: new RegExp(`^${vin.trim()}$`, 'i') },
      showroom_id: new mongoose.Types.ObjectId(showroom_id)
    }).lean();

    // Check if VIN exists in RepairOrderList
    const repairOrderVINs = await vinMatchingService.getRepairOrderVINs(null, null, showroom_id);
    const isVINMatched = repairOrderVINs.has(vin.trim().toUpperCase());

    res.status(200).json({
      success: true,
      data: {
        vin: vin,
        existsInBookingList: !!bookingRecord,
        existsInRepairOrderList: isVINMatched,
        isMatched: !!bookingRecord && isVINMatched,
        bookingRecord: bookingRecord
      }
    });

  } catch (error) {
    console.error('❌ Error checking VIN status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error checking VIN status'
    });
  }
};

/**
 * Helper function to get service advisor breakdown
 */
const getServiceAdvisorBreakdown = (bookings) => {
  const advisorCounts = {};
  
  bookings.forEach(booking => {
    const advisor = booking.service_advisor || 'Unknown';
    if (!advisorCounts[advisor]) {
      advisorCounts[advisor] = {
        advisor: advisor,
        count: 0,
        converted: 0,
        processing: 0,
        tomorrow: 0,
        future: 0
      };
    }
    advisorCounts[advisor].count++;
    
    // Count by status category
    switch (booking.status_category) {
      case 'converted':
        advisorCounts[advisor].converted++;
        break;
      case 'processing':
        advisorCounts[advisor].processing++;
        break;
      case 'tomorrow':
        advisorCounts[advisor].tomorrow++;
        break;
      case 'future':
        advisorCounts[advisor].future++;
        break;
    }
  });
  
  return Object.values(advisorCounts).sort((a, b) => b.count - a.count);
};

/**
 * Helper function to get work type breakdown
 */
const getWorkTypeBreakdown = (bookings) => {
  const workTypeCounts = {};
  
  bookings.forEach(booking => {
    const workType = booking.work_type || 'Unknown';
    if (!workTypeCounts[workType]) {
      workTypeCounts[workType] = {
        type: workType,
        count: 0,
        converted: 0,
        processing: 0,
        tomorrow: 0,
        future: 0
      };
    }
    workTypeCounts[workType].count++;
    
    // Count by status category
    switch (booking.status_category) {
      case 'converted':
        workTypeCounts[workType].converted++;
        break;
      case 'processing':
        workTypeCounts[workType].processing++;
        break;
      case 'tomorrow':
        workTypeCounts[workType].tomorrow++;
        break;
      case 'future':
        workTypeCounts[workType].future++;
        break;
    }
  });
  
  return Object.values(workTypeCounts).sort((a, b) => b.count - a.count);
};

export default {
  getBookingListDashboard,
  getVINStatus
};
