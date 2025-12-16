// API Configuration
// Prefer explicit env var; fall back to deployed backend in production and localhost in dev.

const DEPLOYED_BACKEND_URL = "https://auto-mobile-mblq.vercel.app"
const LOCAL_BACKEND_URL = "http://localhost:5000"

export const getApiUrl = (endpoint: string) => {
  // 1) If NEXT_PUBLIC_API_URL is set, always use it (for Vercel environment variables)
  const envBase = process.env.NEXT_PUBLIC_API_URL
  if (envBase && envBase.trim() !== '') {
    // Ensure no trailing slash
    const baseUrl = envBase.replace(/\/$/, '')
    return `${baseUrl}${endpoint}`
  }

  // 2) If running in the browser (client-side), detect environment
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname
    const port = window.location.port || ''
    
    // Check if we're on localhost or a local IP
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1"
    const isLocalNetwork = hostname.startsWith("192.168.") ||
                           hostname.startsWith("10.") ||
                           hostname.startsWith("172.16.") ||
                           hostname.startsWith("172.17.") ||
                           hostname.startsWith("172.18.") ||
                           hostname.startsWith("172.19.") ||
                           hostname.startsWith("172.20.") ||
                           hostname.startsWith("172.21.") ||
                           hostname.startsWith("172.22.") ||
                           hostname.startsWith("172.23.") ||
                           hostname.startsWith("172.24.") ||
                           hostname.startsWith("172.25.") ||
                           hostname.startsWith("172.26.") ||
                           hostname.startsWith("172.27.") ||
                           hostname.startsWith("172.28.") ||
                           hostname.startsWith("172.29.") ||
                           hostname.startsWith("172.30.") ||
                           hostname.startsWith("172.31.") ||
                           hostname.endsWith(".local")
    
    if (isLocalhost) {
      // Frontend on localhost, backend should be on localhost:5000
      return `${LOCAL_BACKEND_URL}${endpoint}`
    } else if (isLocalNetwork) {
      // Frontend on network IP (like 192.168.0.102:3000), backend should be on same IP:5000
      const backendPort = "5000"
      return `http://${hostname}:${backendPort}${endpoint}`
    } else {
      // We're in production/deployed environment, use deployed backend
      return `${DEPLOYED_BACKEND_URL}${endpoint}`
    }
  }

  // 3) Server-side rendering or localhost - use local backend
  // Check NODE_ENV for server-side detection
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    // Production build but server-side, use deployed backend
    return `${DEPLOYED_BACKEND_URL}${endpoint}`
  }

  // 4) Default local backend for development
  return `${LOCAL_BACKEND_URL}${endpoint}`
}

// Keep a named export for compatibility where API_BASE_URL was imported
export const API_BASE_URL = (() => {
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== '') {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  }
  
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname
    
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1"
    const isLocalNetwork = hostname.startsWith("192.168.") ||
                           hostname.startsWith("10.") ||
                           hostname.startsWith("172.16.") ||
                           hostname.startsWith("172.17.") ||
                           hostname.startsWith("172.18.") ||
                           hostname.startsWith("172.19.") ||
                           hostname.startsWith("172.20.") ||
                           hostname.startsWith("172.21.") ||
                           hostname.startsWith("172.22.") ||
                           hostname.startsWith("172.23.") ||
                           hostname.startsWith("172.24.") ||
                           hostname.startsWith("172.25.") ||
                           hostname.startsWith("172.26.") ||
                           hostname.startsWith("172.27.") ||
                           hostname.startsWith("172.28.") ||
                           hostname.startsWith("172.29.") ||
                           hostname.startsWith("172.30.") ||
                           hostname.startsWith("172.31.") ||
                           hostname.endsWith(".local")
    
    if (isLocalhost) {
      return LOCAL_BACKEND_URL
    } else if (isLocalNetwork) {
      return `http://${hostname}:5000`
    } else {
      return DEPLOYED_BACKEND_URL
    }
  }
  
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return DEPLOYED_BACKEND_URL
  }
  
  return LOCAL_BACKEND_URL
})()
