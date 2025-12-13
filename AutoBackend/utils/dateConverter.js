/**
 * Date Converter Utility
 * Handles conversion of Excel serial date numbers to proper date format
 */

/**
 * Convert Excel serial date number to DD/MM/YYYY format
 * Excel stores dates as serial numbers where 1 = January 1, 1900
 * @param {string|number} excelDate - Excel serial date number or date string
 * @returns {string} - Formatted date string in DD/MM/YYYY format
 */
export function convertExcelDate(excelDate) {
  // If it's already a proper date string, return as is
  if (typeof excelDate === 'string' && (excelDate.includes('/') || excelDate.includes('-'))) {
    // Convert DD-MM-YYYY to DD/MM/YYYY format
    if (excelDate.includes('-')) {
      return excelDate.replace(/-/g, '/');
    }
    return excelDate;
  }
  
  // Convert Excel serial number to date
  const serialNumber = parseInt(excelDate);
  
  // Check if it's a valid Excel serial number (between 1 and 100000)
  if (isNaN(serialNumber) || serialNumber < 1 || serialNumber > 100000) {
    console.log(`⚠️ Invalid Excel serial date: ${excelDate}`);
    return excelDate; // Return original if not a valid serial number
  }
  
  try {
    // Excel epoch starts from January 1, 1900
    // But Excel incorrectly treats 1900 as a leap year, so we need to adjust
    const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
    
    // Calculate the actual date
    // Subtract 2 days to account for Excel's leap year bug and 0-based indexing
    const actualDate = new Date(excelEpoch.getTime() + (serialNumber - 2) * 24 * 60 * 60 * 1000);
    
    // Format as DD/MM/YYYY
    const day = actualDate.getDate().toString().padStart(2, '0');
    const month = (actualDate.getMonth() + 1).toString().padStart(2, '0');
    const year = actualDate.getFullYear();
    
    const formattedDate = `${day}/${month}/${year}`;
    console.log(`📅 Converted Excel serial ${serialNumber} to ${formattedDate}`);
    
    return formattedDate;
  } catch (error) {
    console.error(`❌ Error converting Excel date ${excelDate}:`, error);
    return excelDate; // Return original on error
  }
}

/**
 * Format a JavaScript Date object to DD/MM/YYYY
 * @param {Date} date - JavaScript Date object
 * @returns {string} - Formatted date string
 */
export function formatDateToDDMMYYYY(date) {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Test the Excel date conversion with known values
 */
export function testExcelDateConversion() {
  console.log('🧪 Testing Excel Date Conversion:');
  
  // Test cases based on your data
  const testCases = [
    { serial: 45931, expected: '01/10/2025' }, // Your problematic date
    { serial: 45963, expected: '03/11/2025' }, // Another date from your Excel
    { string: '01-10-2025', expected: '01/10/2025' },
    { string: '03/11/2025', expected: '03/11/2025' }
  ];
  
  testCases.forEach(test => {
    const input = test.serial || test.string;
    const result = convertExcelDate(input);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`   ${status} Input: ${input} → Output: ${result} (Expected: ${test.expected})`);
  });
}

export default {
  convertExcelDate,
  formatDateToDDMMYYYY,
  testExcelDateConversion
};
