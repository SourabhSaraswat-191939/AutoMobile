/**
 * Date Utility Functions for IST (Indian Standard Time)
 * IST is UTC+5:30
 */

/**
 * Get current date/time in IST
 * @returns {Date} Current date in IST
 */
export const getISTDate = () => {
  const now = new Date();
  // Convert to IST by adding 5 hours and 30 minutes
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const utcTime = now.getTime();
  const istTime = new Date(utcTime + istOffset);
  return istTime;
};

/**
 * Convert any date to IST
 * @param {Date} date - Date to convert
 * @returns {Date} Date in IST
 */
export const toIST = (date) => {
  if (!date) return getISTDate();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcTime = new Date(date).getTime();
  const istTime = new Date(utcTime + istOffset);
  return istTime;
};

/**
 * Format date to IST string
 * @param {Date} date - Date to format
 * @returns {String} Formatted IST date string
 */
export const formatISTDate = (date) => {
  const istDate = date ? toIST(date) : getISTDate();
  return istDate.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

export default {
  getISTDate,
  toIST,
  formatISTDate
};
