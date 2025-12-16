// API Configuration
// Prefer explicit env var; fall back to deployed backend in production and localhost in dev.

export const getApiUrl = (endpoint: string) => {
  // 1) If NEXT_PUBLIC_API_URL is set, always use it
  const envBase = process.env.NEXT_PUBLIC_API_URL
  if (envBase) {
    return `${envBase}${endpoint}`
  }

  // 2) If running in the browser and not on localhost, use deployed backend URL
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    const deployedBase = "https://auto-mobile-mblq.vercel.app"
    return `${deployedBase}${endpoint}`
  }

  // 3) Default local backend for development
  const localBase = "http://localhost:5000"
  return `${localBase}${endpoint}`
}

// Keep a named export for compatibility where API_BASE_URL was imported
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://auto-mobile-mblq.vercel.app"
    : "http://localhost:5000")
