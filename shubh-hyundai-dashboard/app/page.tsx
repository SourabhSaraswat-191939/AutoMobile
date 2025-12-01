"use client"

import { useAuth } from "@/lib/auth-context"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider } from "@/lib/auth-context"
import LoginPage from "./login/page"

function HomeContent() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  
  // DEV debug banner to confirm client rendering
  const showDebug = process.env.NODE_ENV === "development"

  useEffect(() => {
    if (!isLoading) {
      if (user?.role === "general_manager") {
        router.push("/dashboard/gm")
      } else if (user?.role === "service_manager") {
        router.push("/dashboard/sm")
      } else if (user?.role === "service_advisor") {
        router.push("/dashboard/sa")
      } else if (user) {
        // Fallback for users without a recognized role — send to SM dashboard
        router.push("/dashboard/sm")
      }
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        {showDebug && (
          <div className="p-3 bg-yellow-200 text-black text-sm text-center">DEV: HomeContent rendered - user: null</div>
        )}
        <LoginPage />
      </>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      {showDebug && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 p-2 bg-yellow-200 text-black text-sm text-center z-50">
          DEV: HomeContent rendered - user: {user?.email}
        </div>
      )}
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <HomeContent />
    </AuthProvider>
  )
}
