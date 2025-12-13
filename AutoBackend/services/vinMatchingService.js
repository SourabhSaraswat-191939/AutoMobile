import BookingListData from '../models/BookingListData.js';
import RepairOrderListData from '../models/RepairOrderListData.js';
import mongoose from 'mongoose';

/**
 * VIN Matching Service
 * Handles VIN matching between BookingList and RepairOrderList
 * Works regardless of upload order
 */

/**
 * Get all VINs from RepairOrderList for a specific user/showroom
 */
export const getRepairOrderVINs = async (uploadedBy, city, showroom_id) => {
  try {
    console.log(`🔍 Getting RepairOrder VINs for: ${uploadedBy}, ${city}`);
    
    const repairOrders = await RepairOrderListData.find({
      showroom_id: showroom_id
    }).select('vin').lean();
    
    const vinSet = new Set();
    repairOrders.forEach(order => {
      if (order.vin && order.vin.trim()) {
        vinSet.add(order.vin.trim().toUpperCase());
      }
    });
    
    console.log(`📊 Found ${vinSet.size} unique VINs in RepairOrderList`);
    return vinSet;
  } catch (error) {
    console.error('❌ Error getting RepairOrder VINs:', error);
    return new Set();
  }
};

/**
 * Get all VINs from BookingList for a specific user/showroom
 */
export const getBookingListVINs = async (uploadedBy, city, showroom_id) => {
  try {
    console.log(`🔍 Getting BookingList VINs for: ${uploadedBy}, ${city}`);
    
    const bookings = await BookingListData.find({
      showroom_id: showroom_id
    }).select('vin_number').lean();
    
    const vinSet = new Set();
    bookings.forEach(booking => {
      if (booking.vin_number && booking.vin_number.trim()) {
        vinSet.add(booking.vin_number.trim().toUpperCase());
      }
    });
    
    console.log(`📊 Found ${vinSet.size} unique VINs in BookingList`);
    return vinSet;
  } catch (error) {
    console.error('❌ Error getting BookingList VINs:', error);
    return new Set();
  }
};

/**
 * Perform VIN matching and return enhanced BookingList data with statuses
 */
export const performVINMatching = async (uploadedBy, city, showroom_id) => {
  try {
    console.log(`🎯 Starting VIN matching for: ${uploadedBy}, ${city}, showroom: ${showroom_id}`);
    
    // Get all VINs from RepairOrderList
    const repairOrderVINs = await getRepairOrderVINs(uploadedBy, city, showroom_id);
    
    // Get all BookingList records - UPDATED: Handle both ObjectId and String showroom_id
    console.log(`🔍 Querying BookingList with showroom_id: ${showroom_id}`);
    
    let bookings;
    try {
      // Try querying with ObjectId first
      bookings = await BookingListData.find({
        showroom_id: new mongoose.Types.ObjectId(showroom_id)
      }).lean();
      
      console.log(`📋 Found ${bookings.length} booking records with ObjectId query`);
      
      // If no results with ObjectId, try with string
      if (bookings.length === 0) {
        console.log(`🔄 Trying string query for showroom_id: ${showroom_id}`);
        bookings = await BookingListData.find({
          showroom_id: showroom_id
        }).lean();
        console.log(`📋 Found ${bookings.length} booking records with string query`);
      }
    } catch (error) {
      console.log(`❌ ObjectId query failed, trying string query:`, error.message);
      bookings = await BookingListData.find({
        showroom_id: showroom_id
      }).lean();
      console.log(`📋 Found ${bookings.length} booking records with string fallback`);
    }
    
    console.log(`📋 Found ${bookings.length} booking records in database`);
    
    // If no bookings found, log some debug info
    if (bookings.length === 0) {
      console.log(`❌ No BookingList records found for showroom_id: ${showroom_id}`);
      
      // Check if there are any BookingList records at all
      const totalBookings = await BookingListData.countDocuments();
      console.log(`📊 Total BookingList records in database: ${totalBookings}`);
      
      // Check what showroom_ids exist
      const existingShowrooms = await BookingListData.distinct('showroom_id');
      console.log(`🏢 Existing showroom_ids in BookingList:`, existingShowrooms);
      
      return {
        bookings: [],
        statusSummary: {},
        totalBookings: 0,
        matchedVINs: 0,
        unmatchedVINs: 0,
        serviceAdvisorBreakdown: [],
        traditionalServiceAdvisorBreakdown: []
      };
    }
    
    // Process each booking and determine status
    const enhancedBookings = bookings.map(booking => {
      const bookingVIN = booking.vin_number ? booking.vin_number.trim().toUpperCase() : '';
      const isVINMatched = bookingVIN && repairOrderVINs.has(bookingVIN);
      
      // Determine status based on VIN matching and date
      let status = 'Unknown';
      let statusCategory = 'unknown';
      
      if (isVINMatched) {
        // Case 1: VIN MATCH FOUND
        status = 'Converted';
        statusCategory = 'converted';
      } else {
        // Case 2: VIN NOT MATCHED - Check date
        const bookingDate = parseBookingDate(booking.bt_date_time);
        if (bookingDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          bookingDate.setHours(0, 0, 0, 0);
          
          if (bookingDate <= today) {
            // Past or present date
            status = 'Booking Processing';
            statusCategory = 'processing';
          } else if (bookingDate.getTime() === tomorrow.getTime()) {
            // Tomorrow
            status = 'Tomorrow Delivery';
            statusCategory = 'tomorrow';
          } else {
            // Future date
            status = 'Future Delivery';
            statusCategory = 'future';
          }
        } else {
          // No valid date
          status = 'Booking Processing';
          statusCategory = 'processing';
        }
      }
      
      return {
        ...booking,
        vin_matched: isVINMatched,
        computed_status: status,
        status_category: statusCategory,
        booking_date_parsed: parseBookingDate(booking.bt_date_time)
      };
    });
    
    // Group by status for summary
    const statusSummary = enhancedBookings.reduce((acc, booking) => {
      const category = booking.status_category;
      if (!acc[category]) {
        acc[category] = {
          status: booking.computed_status,
          count: 0,
          records: []
        };
      }
      acc[category].count++;
      acc[category].records.push(booking);
      return acc;
    }, {});
    
    console.log(`✅ VIN matching completed. Status summary:`, Object.keys(statusSummary).map(key => `${key}: ${statusSummary[key].count}`));
    
    // Create Service Advisor breakdown with work types and status
    const serviceAdvisorBreakdown = enhancedBookings.reduce((acc, booking) => {
      const advisor = booking.service_advisor || 'Unknown';
      const workType = booking.work_type || 'Unknown';
      const excelStatus = booking.booking_status || booking.status || 'Unknown'; // Actual Excel Status
      const statusCategory = booking.status_category;
      
      if (!acc[advisor]) {
        acc[advisor] = {
          advisor: advisor,
          count: 0,
          converted: 0,
          processing: 0,
          tomorrow: 0,
          future: 0,
          workTypes: {}
        };
      }
      
      // Initialize work type if not exists
      if (!acc[advisor].workTypes[workType]) {
        acc[advisor].workTypes[workType] = {
          type: workType,
          count: 0,
          converted: 0,
          processing: 0,
          tomorrow: 0,
          future: 0,
          excelStatuses: {} // Track actual Excel statuses
        };
      }
      
      // Track Excel Status counts
      if (!acc[advisor].workTypes[workType].excelStatuses[excelStatus]) {
        acc[advisor].workTypes[workType].excelStatuses[excelStatus] = 0;
      }
      acc[advisor].workTypes[workType].excelStatuses[excelStatus]++;
      
      // Increment counts
      acc[advisor].count++;
      acc[advisor].workTypes[workType].count++;
      
      // Increment status counts
      if (statusCategory === 'converted') {
        acc[advisor].converted++;
        acc[advisor].workTypes[workType].converted++;
      } else if (statusCategory === 'processing') {
        acc[advisor].processing++;
        acc[advisor].workTypes[workType].processing++;
      } else if (statusCategory === 'tomorrow') {
        acc[advisor].tomorrow++;
        acc[advisor].workTypes[workType].tomorrow++;
      } else if (statusCategory === 'future') {
        acc[advisor].future++;
        acc[advisor].workTypes[workType].future++;
      }
      
      return acc;
    }, {});

    // Convert to array and flatten work types
    const advisorWorkTypeBreakdown = [];
    Object.values(serviceAdvisorBreakdown).forEach(advisor => {
      Object.values(advisor.workTypes).forEach(workType => {
        advisorWorkTypeBreakdown.push({
          advisor: advisor.advisor,
          workType: workType.type,
          count: workType.count,
          converted: workType.converted,
          processing: workType.processing,
          tomorrow: workType.tomorrow,
          future: workType.future,
          conversionRate: workType.count > 0 ? Math.round((workType.converted / workType.count) * 100) : 0,
          excelStatuses: workType.excelStatuses // Include actual Excel statuses
        });
      });
    });

    // Sort by advisor name and then by work type
    advisorWorkTypeBreakdown.sort((a, b) => {
      if (a.advisor !== b.advisor) {
        return a.advisor.localeCompare(b.advisor);
      }
      return a.workType.localeCompare(b.workType);
    });

    // Create traditional service advisor breakdown (for backward compatibility)
    const traditionalServiceAdvisorBreakdown = Object.values(serviceAdvisorBreakdown).map(advisor => ({
      advisor: advisor.advisor,
      count: advisor.count,
      converted: advisor.converted,
      processing: advisor.processing,
      tomorrow: advisor.tomorrow,
      future: advisor.future
    })).sort((a, b) => b.count - a.count);

    return {
      bookings: enhancedBookings,
      statusSummary: statusSummary,
      totalBookings: enhancedBookings.length,
      matchedVINs: enhancedBookings.filter(b => b.vin_matched).length,
      unmatchedVINs: enhancedBookings.filter(b => !b.vin_matched).length,
      serviceAdvisorBreakdown: advisorWorkTypeBreakdown,
      traditionalServiceAdvisorBreakdown: traditionalServiceAdvisorBreakdown
    };
    
  } catch (error) {
    console.error('❌ Error performing VIN matching:', error);
    throw error;
  }
};

/**
 * Parse booking date from various formats
 */
const parseBookingDate = (dateString) => {
  if (!dateString) return null;
  
  try {
    // Handle Excel serial numbers
    const excelSerialMatch = dateString.toString().match(/^(\d+)(\.\d+)?$/);
    if (excelSerialMatch) {
      const serialNumber = parseFloat(dateString);
      const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
      return new Date(excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000);
    }
    
    // Handle DD-MM-YYYY format
    const ddmmyyyyMatch = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Handle standard date parsing
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
    
    return null;
  } catch (error) {
    console.warn('Date parsing error for:', dateString, error);
    return null;
  }
};

/**
 * Trigger VIN matching after BookingList upload
 */
export const triggerVINMatchingAfterBookingUpload = async (uploadedBy, city, showroom_id) => {
  console.log(`🚀 Triggering VIN matching after BookingList upload`);
  return await performVINMatching(uploadedBy, city, showroom_id);
};

/**
 * Trigger VIN matching after RepairOrderList upload
 */
export const triggerVINMatchingAfterRepairOrderUpload = async (uploadedBy, city, showroom_id) => {
  console.log(`🚀 Triggering VIN matching after RepairOrderList upload`);
  return await performVINMatching(uploadedBy, city, showroom_id);
};

export default {
  performVINMatching,
  getRepairOrderVINs,
  getBookingListVINs,
  triggerVINMatchingAfterBookingUpload,
  triggerVINMatchingAfterRepairOrderUpload
};
