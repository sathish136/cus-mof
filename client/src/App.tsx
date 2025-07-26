import { Route, Router } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import SplashScreen from "@/components/SplashScreen";
import { LicenseGuard } from "@/components/LicenseGuard";
import Dashboard from "@/components/Dashboard";
import EmployeeManagement from "@/components/EmployeeManagement";
import AttendanceTracker from "@/components/AttendanceTracker";
import LeaveManagement from "@/pages/LeaveManagement";
import LeaveReports from "@/pages/LeaveReports";
import OvertimeManagement from "@/components/OvertimeManagement";
import Reports from "@/components/Reports";
import Settings from "@/components/Settings";
// Renamed from GroupPolicies to HRSettings
import HRSettings from "@/components/HRSettings";
import HolidayManagement from "@/components/HolidayManagement";
import Login from "@/components/Login";
import UserProfile from "@/components/UserProfile";
import Notifications from "@/components/Notifications";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Check if this is the initial app load
    const hasLoadedBefore = sessionStorage.getItem('appLoaded');
    if (hasLoadedBefore) {
      setShowSplash(false);
      setIsInitialLoad(false);
    } else {
      sessionStorage.setItem('appLoaded', 'true');
    }
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (showSplash && isInitialLoad) {
    return <SplashScreen onComplete={handleSplashComplete} duration={3500} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LicenseGuard>
        <div className="h-screen bg-gray-50">
          <Layout>
            {/* Header with app title removed as per user request */}
            <Route path="/" component={Dashboard} />
            <Route path="/employees" component={EmployeeManagement} />
            <Route path="/attendance" component={AttendanceTracker} />
            <Route path="/leave" component={LeaveManagement} />
            <Route path="/leave-reports" component={LeaveReports} />
            <Route path="/holidays" component={HolidayManagement} />
            <Route path="/overtime" component={OvertimeManagement} />
            <Route path="/reports" component={Reports} />
            <Route path="/settings" component={Settings} />
            <Route path="/hr-settings" component={HRSettings} />
            <Route path="/login" component={Login} />
            <Route path="/profile" component={UserProfile} />
            <Route path="/notifications" component={Notifications} />
          </Layout>
          <Toaster />
        </div>
      </LicenseGuard>
    </QueryClientProvider>
  );
}

export default App;
