import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Login from "./Login";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useLocation();

  const checkAuthentication = () => {
    const authStatus = localStorage.getItem("isAuthenticated");
    const user = localStorage.getItem("user");
    
    // User is authenticated if both items exist
    const authenticated = authStatus === "true" && user !== null;
    setIsAuthenticated(authenticated);
    setIsLoading(false);

    // If not authenticated and not on login page, redirect to login
    if (!authenticated && location !== "/login") {
      setLocation("/login");
    }
  };

  useEffect(() => {
    checkAuthentication();
    
    // Check authentication status every 1 second for real-time updates
    const interval = setInterval(checkAuthentication, 1000);
    
    return () => clearInterval(interval);
  }, [location]);

  // Handle storage changes (logout from another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "isAuthenticated" || e.key === "user") {
        checkAuthentication();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-slate-600 font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // If on login page, always show login regardless of auth status
  if (location === "/login") {
    return <Login />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Login />;
  }

  // If authenticated, show the protected content
  return <>{children}</>;
}