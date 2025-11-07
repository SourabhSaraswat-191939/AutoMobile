// API Configuration
// Temporarily using local backend for testing
// Switch back to 'https://auto-mobile-mblq.vercel.app' after configuring Vercel env vars
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// Helper function to build API URLs
export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint}`
}
