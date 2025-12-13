// Time utility functions for IST conversion

/**
 * Convert UTC timestamp to IST (Indian Standard Time)
 * @param utcTimestamp - UTC timestamp string or Date object
 * @returns Formatted IST time string
 */
export const convertToIST = (utcTimestamp: string | Date): string => {
  try {
    const date = new Date(utcTimestamp)
    
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000 // 5.5 hours in milliseconds
    const istDate = new Date(date.getTime() + istOffset)
    
    // Format as readable string
    return istDate.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  } catch (error) {
    console.error('Error converting timestamp to IST:', error)
    return 'Invalid Date'
  }
}

/**
 * Convert UTC timestamp to IST date only
 * @param utcTimestamp - UTC timestamp string or Date object
 * @returns Formatted IST date string
 */
export const convertToISTDate = (utcTimestamp: string | Date): string => {
  try {
    const date = new Date(utcTimestamp)
    
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch (error) {
    console.error('Error converting timestamp to IST date:', error)
    return 'Invalid Date'
  }
}

/**
 * Convert UTC timestamp to IST time only
 * @param utcTimestamp - UTC timestamp string or Date object
 * @returns Formatted IST time string
 */
export const convertToISTTime = (utcTimestamp: string | Date): string => {
  try {
    const date = new Date(utcTimestamp)
    
    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  } catch (error) {
    console.error('Error converting timestamp to IST time:', error)
    return 'Invalid Time'
  }
}

/**
 * Get current IST timestamp
 * @returns Current IST timestamp string
 */
export const getCurrentIST = (): string => {
  return convertToIST(new Date())
}

/**
 * Format timestamp for display in tables/cards
 * @param utcTimestamp - UTC timestamp string or Date object
 * @returns Formatted display string with IST
 */
export const formatTimestampForDisplay = (utcTimestamp: string | Date): string => {
  try {
    const istTime = convertToIST(utcTimestamp)
    return `${istTime} IST`
  } catch (error) {
    console.error('Error formatting timestamp for display:', error)
    return 'Invalid Date'
  }
}
