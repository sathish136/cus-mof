import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AttendanceTracker() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ["/api/attendance", selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/attendance?date=${selectedDate}`);
      if (!response.ok) throw new Error("Failed to fetch attendance records");
      return response.json();
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "absent":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "late":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case "absent":
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
      case "late":
        return <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Not Recorded</Badge>;
    }
  };

  const filteredRecords = attendanceRecords?.filter((record: any) => {
    if (filterStatus === "all") return true;
    return record.status === filterStatus;
  }) || [];

  const attendanceStats = {
    total: employees?.length || 0,
    present: attendanceRecords?.filter((r: any) => r.status === "present").length || 0,
    absent: attendanceRecords?.filter((r: any) => r.status === "absent").length || 0,
    late: attendanceRecords?.filter((r: any) => r.status === "late").length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Tracker</h2>
          <p className="text-sm text-gray-600">Monitor and track employee attendance</p>
        </div>
        <div className="flex items-center space-x-4">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-48"
          />
          <Button className="bg-[hsl(var(--gov-navy))] hover:bg-[hsl(var(--gov-navy-light))]">
            Generate Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{attendanceStats.total}</p>
              </div>
              <Users className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Present</p>
                <p className="text-2xl font-bold text-green-600">{attendanceStats.present}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">{attendanceStats.absent}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Late</p>
                <p className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records */}
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Attendance Records - {new Date(selectedDate).toLocaleDateString()}
            </CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Working Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No attendance records found for the selected date and filter
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record: any) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-[hsl(var(--gov-navy))] text-white">
                              {record.employee?.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "N/A"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {record.employee?.fullName || "Unknown Employee"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {record.employee?.employeeId || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(record.status)}
                          {getStatusBadge(record.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.workingHours || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.notes || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
