import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Users, UserCheck, CalendarX, Clock, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("7");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      return response.json();
    },
  });



  const { data: recentActivities, isLoading: activitiesLoading } = useQuery<any[]>({ 
    queryKey: ["/api/dashboard/recent-activity"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/recent-activity");
      if (!response.ok) throw new Error("Failed to fetch recent activities");
      return response.json();
    },
  });

  // Fetch attendance trends data for the chart
  const { data: attendanceTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ["/api/dashboard/attendance-trends", selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/attendance-trends?days=${selectedPeriod}`);
      if (!response.ok) throw new Error("Failed to fetch attendance trends");
      return response.json();
    },
  });

  if (statsLoading || activitiesLoading || trendsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Employees</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {stats?.totalEmployees || 0}
                </p>
              </div>
              <div className="p-3 bg-slate-100 rounded-lg">
                <Users className="w-6 h-6 text-slate-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-emerald-600 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                Active workforce
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-emerald-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Present Today</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">
                  {stats?.presentToday || 0}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <UserCheck className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-slate-600">
                {stats?.totalEmployees ? 
                  `${((stats.presentToday / stats.totalEmployees) * 100).toFixed(1)}% attendance rate` : 
                  "No data available"
                }
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-amber-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">On Leave</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">
                  {stats?.onLeave || 0}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <CalendarX className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-slate-600">
                {stats?.totalEmployees ? 
                  `${((stats.onLeave / stats.totalEmployees) * 100).toFixed(1)}% of workforce` : 
                  "No data available"
                }
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overtime Hours</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats?.overtimeHours || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-gray-600">This month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Chart */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900 mb-1">Attendance Overview</CardTitle>
                <p className="text-sm text-gray-600">Daily attendance trends and patterns</p>
              </div>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40 bg-white border-gray-300">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="14">Last 14 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-72">
              {attendanceTrends && attendanceTrends.length > 0 ? (
                <div className="space-y-4">
                  {/* Legend */}
                  <div className="flex items-center justify-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-gray-700">Present</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="text-gray-700">Late</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-gray-700">Absent</span>
                    </div>
                  </div>
                  
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={attendanceTrends} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="lateGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 2" stroke="#cbd5e1" opacity={0.5} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#475569"
                        fontSize={11}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={11}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={{ stroke: '#cbd5e1' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                          backdropFilter: 'blur(10px)'
                        }}
                        labelStyle={{ color: '#374151', fontWeight: '600' }}
                        labelFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          });
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="present" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                        name="Present"
                        fill="url(#presentGradient)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="late" 
                        stroke="#f59e0b" 
                        strokeWidth={2.5}
                        dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }}
                        name="Late"
                        fill="url(#lateGradient)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="absent" 
                        stroke="#ef4444" 
                        strokeWidth={2.5}
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#ef4444', strokeWidth: 2, stroke: '#ffffff' }}
                        name="Absent"
                        fill="url(#absentGradient)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-full bg-white/50 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center">
                    <Activity className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-700 font-medium">No attendance data available</p>
                    <p className="text-sm text-gray-500 mt-1">Chart will appear when data is available</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities?.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === "check-in" ? "bg-green-500" :
                    activity.type === "leave" ? "bg-blue-500" :
                    activity.type === "overtime" ? "bg-yellow-500" :
                    "bg-red-500"
                  }`} />
                  <div>
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/attendance">
              <Button variant="ghost" className="w-full mt-4 text-sm text-[hsl(var(--gov-navy))] hover:text-[hsl(var(--gov-navy-light))] ">
                View All Activities
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}
