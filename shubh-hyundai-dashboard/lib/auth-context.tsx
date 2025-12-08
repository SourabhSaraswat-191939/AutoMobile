"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export type UserRole = "general_manager" | "service_manager" | "service_advisor"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  city?: string
  org_id?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Optimized: Check cache first to avoid redundant lookups
      const cachedUser = localStorage.getItem("user")
      if (cachedUser) {
        const parsedUser = JSON.parse(cachedUser)
        if (parsedUser.email === email) {
          setUser(parsedUser)
          setIsLoading(false)
          return // User already cached, skip authentication
        }
      }

      // Fake authentication - in production, call your API
      const mockUsers: Record<string, User> = {
        "gm@shubh.com": {
          id: "1",
          name: "Rajesh Kumar",
          email: "gm@shubh.com",
          role: "general_manager",
        },
        "sm.pune@shubh.com": {
          id: "2",
          name: "Amit Sharma",
          email: "sm.pune@shubh.com",
          role: "service_manager",
          city: "Pune",
        },
        "sm.mumbai@shubh.com": {
          id: "3",
          name: "Priya Desai",
          email: "sm.mumbai@shubh.com",
          role: "service_manager",
          city: "Mumbai",
        },
        "sm.nagpur@shubh.com": {
          id: "4",
          name: "Vikram Singh",
          email: "sm.nagpur@shubh.com",
          role: "service_manager",
          city: "Nagpur",
        },
        "sa.pune@shubh.com": {
          id: "5",
          name: "Deepak Patel",
          email: "sa.pune@shubh.com",
          role: "service_advisor",
          city: "Pune",
        },
        "sa.mumbai@shubh.com": {
          id: "6",
          name: "Kavya Nair",
          email: "sa.mumbai@shubh.com",
          role: "service_advisor",
          city: "Mumbai",
        },
      }

      const foundUser = mockUsers[email]
      if (foundUser && password === "password") {
        setUser(foundUser)
        localStorage.setItem("user", JSON.stringify(foundUser))
      } else {
        throw new Error("Invalid credentials")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
  }

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>
}

// Export all demo users for use in other components
export const getAllDemoUsers = (): User[] => {
  return [
    {
      id: "1",
      name: "Rajesh Kumar",
      email: "gm@shubh.com",
      role: "general_manager",
      city: "All Cities",
      org_id: "shubh_hyundai"
    },
    {
      id: "2",
      name: "Amit Sharma",
      email: "sm.pune@shubh.com",
      role: "service_manager",
      city: "Pune",
      org_id: "shubh_hyundai"
    },
    {
      id: "3",
      name: "Priya Desai",
      email: "sm.mumbai@shubh.com",
      role: "service_manager",
      city: "Mumbai",
      org_id: "shubh_hyundai"
    },
    {
      id: "4",
      name: "Vikram Singh",
      email: "sm.nagpur@shubh.com",
      role: "service_manager",
      city: "Nagpur",
      org_id: "shubh_hyundai"
    },
    {
      id: "5",
      name: "Deepak Patel",
      email: "sa.pune@shubh.com",
      role: "service_advisor",
      city: "Pune",
      org_id: "shubh_hyundai"
    },
    {
      id: "6",
      name: "Kavya Nair",
      email: "sa.mumbai@shubh.com",
      role: "service_advisor",
      city: "Mumbai",
      org_id: "shubh_hyundai"
    }
  ]
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    // If used outside of an AuthProvider, return a safe noop context
    // to avoid a hard crash that would render a blank page. This
    // helps debugging and is safe because components should still
    // handle a null `user` and `isLoading` values.
    return {
      user: null,
      isLoading: false,
      login: async () => {},
      logout: () => {},
    }
  }

  return context
}
