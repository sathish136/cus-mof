import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Eye, EyeOff, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      
      // Store user session data
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("isAuthenticated", "true");
      
      toast({
        title: "Success",
        description: "Logged in successfully",
      });

      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-sm">
        {/* Main Login Card */}
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          {/* Header Section */}
          <CardHeader className="text-center pb-4 pt-6">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold text-slate-800 mb-1">
              Ministry of Finance
            </CardTitle>
            <p className="text-slate-600 text-sm font-medium">
              HR Attendance Management System
            </p>
            <p className="text-slate-500 text-xs">
              Sri Lanka Government Portal
            </p>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="username" className="text-slate-700 font-medium text-sm">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password" className="text-slate-700 font-medium text-sm">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <input
                    id="remember"
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="remember" className="text-slate-600">
                    Remember me
                  </Label>
                </div>
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Support Section */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 mb-1">
                For technical support, contact IT Department
              </p>
              <p className="text-xs text-slate-400">
                Authorized personnel only • Government of Sri Lanka
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Powered By Section */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-md flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xs">LU</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-600">Powered by </span>
              <span className="font-semibold text-blue-600">Live U Pvt Ltd</span>
              <span className="text-slate-600">, Sri Lanka</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Professional HR Solutions & Software Development
          </p>
        </div>
      </div>
    </div>
  );
}