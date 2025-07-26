import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, FileText, Download, Filter, TrendingUp, Users, Clock, CheckCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import * as XLSX from 'xlsx';
import type { LeaveRequest, Employee } from "@shared/schema";

export default function LeaveReports() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  // Fetch data
  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ["/api/leave-requests"],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["/api/departments"],
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ["/api/holidays"],
  });

  // Filter data based on selected criteria
  const filterData = () => {
    const monthStart = startOfMonth(new Date(selectedMonth));
    const monthEnd = endOfMonth(new Date(selectedMonth));

    return leaveRequests.filter(request => {
      const requestDate = new Date(request.startDate);
      const employee = employees.find(e => e.id.toString() === request.employeeId);
      
      // Date filter
      const inDateRange = requestDate >= monthStart && requestDate <= monthEnd;
      
      // Department filter
      const departmentMatch = selectedDepartment === "all" || 
        employee?.departmentId?.toString() === selectedDepartment;
      
      // Status filter
      const statusMatch = selectedStatus === "all" || request.status === selectedStatus;
      
      // Employee filter
      const employeeMatch = selectedEmployee === "all" || 
        request.employeeId === selectedEmployee;

      return inDateRange && departmentMatch && statusMatch && employeeMatch;
    });
  };

  const filteredData = filterData();

  // Calculate statistics
  const calculateStats = () => {
    const total = filteredData.length;
    const approved = filteredData.filter(r => r.status === 'approved').length;
    const pending = filteredData.filter(r => r.status === 'pending').length;
    const rejected = filteredData.filter(r => r.status === 'rejected').length;
    const totalDays = filteredData.reduce((sum, r) => sum + (r.days || 0), 0);
    const approvedDays = filteredData.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.days || 0), 0);
    
    // Leave type breakdown
    const leaveTypes = {
      annual: filteredData.filter(r => r.leaveType === 'annual').length,
      sick: filteredData.filter(r => r.leaveType === 'sick').length,
      casual: filteredData.filter(r => r.leaveType === 'casual').length,
      maternity: filteredData.filter(r => r.leaveType === 'maternity').length,
      paternity: filteredData.filter(r => r.leaveType === 'paternity').length,
    };

    return {
      total,
      approved,
      pending,
      rejected,
      totalDays,
      approvedDays,
      leaveTypes,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  };

  const stats = calculateStats();

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredData.map(request => {
      const employee = employees.find(e => e.id.toString() === request.employeeId);
      const department = departments.find(d => d.id === employee?.departmentId);
      
      return {
        'Employee ID': employee?.employeeId || '',
        'Employee Name': employee?.fullName || '',
        'Department': department?.name || '',
        'Group': employee?.group || '',
        'Leave Type': request.leaveType,
        'Start Date': format(new Date(request.startDate), 'yyyy-MM-dd'),
        'End Date': format(new Date(request.endDate), 'yyyy-MM-dd'),
        'Days': request.days,
        'Reason': request.reason || '',
        'Status': request.status,
        'Applied Date': format(new Date(request.createdAt), 'yyyy-MM-dd'),
        'Approved Date': request.approvedAt ? format(new Date(request.approvedAt), 'yyyy-MM-dd') : '',
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-width columns
    const colWidths = [
      { wch: 12 }, // Employee ID
      { wch: 20 }, // Employee Name
      { wch: 15 }, // Department
      { wch: 8 },  // Group
      { wch: 12 }, // Leave Type
      { wch: 12 }, // Start Date
      { wch: 12 }, // End Date
      { wch: 6 },  // Days
      { wch: 30 }, // Reason
      { wch: 10 }, // Status
      { wch: 12 }, // Applied Date
      { wch: 12 }, // Approved Date
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Leave Report');
    
    const monthName = format(new Date(selectedMonth), 'MMMM yyyy');
    XLSX.writeFile(wb, `Leave_Report_${monthName.replace(' ', '_')}.xlsx`);
  };

  // Get employee leave summary
  const getEmployeeSummary = () => {
    const summary = new Map();
    
    filteredData.forEach(request => {
      const empId = request.employeeId;
      if (!summary.has(empId)) {
        const employee = employees.find(e => e.id.toString() === empId);
        summary.set(empId, {
          employee,
          totalRequests: 0,
          approvedDays: 0,
          pendingDays: 0,
          rejectedDays: 0,
          leaveTypes: new Set(),
        });
      }
      
      const emp = summary.get(empId);
      emp.totalRequests += 1;
      emp.leaveTypes.add(request.leaveType);
      
      if (request.status === 'approved') {
        emp.approvedDays += request.days;
      } else if (request.status === 'pending') {
        emp.pendingDays += request.days;
      } else if (request.status === 'rejected') {
        emp.rejectedDays += request.days;
      }
    });
    
    return Array.from(summary.values()).sort((a, b) => 
      b.approvedDays - a.approvedDays
    );
  };

  const employeeSummary = getEmployeeSummary();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive leave analytics and reporting
          </p>
        </div>
        <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white">
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Month</label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Employee</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.fullName} ({emp.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDays} total days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              {stats.approvedDays} days approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvalRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.pending} pending, {stats.rejected} rejected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.entries(stats.leaveTypes).reduce((a, b) => 
                stats.leaveTypes[a[0]] > stats.leaveTypes[b[0]] ? a : b
              )[0] || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.max(...Object.values(stats.leaveTypes))} requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different reports */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Employee Summary</TabsTrigger>
          <TabsTrigger value="details">Request Details</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Employee Leave Summary</CardTitle>
              <CardDescription>
                Leave usage by employee for {format(new Date(selectedMonth), 'MMMM yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Approved Days</TableHead>
                    <TableHead>Pending Days</TableHead>
                    <TableHead>Leave Types</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeSummary.map((summary, index) => {
                    const dept = departments.find(d => d.id === summary.employee?.departmentId);
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{summary.employee?.fullName}</div>
                            <div className="text-sm text-muted-foreground">
                              {summary.employee?.employeeId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{dept?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {summary.employee?.group || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>{summary.totalRequests}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {summary.approvedDays}
                        </TableCell>
                        <TableCell className="text-yellow-600">
                          {summary.pendingDays}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Array.from(summary.leaveTypes).map((type) => (
                              <Badge key={type} variant="secondary" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>
                All leave requests for {format(new Date(selectedMonth), 'MMMM yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((request) => {
                    const employee = employees.find(e => e.id.toString() === request.employeeId);
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee?.fullName}</div>
                            <div className="text-sm text-muted-foreground">
                              {employee?.employeeId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.leaveType}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(request.startDate), 'MMM dd')} - {format(new Date(request.endDate), 'MMM dd')}
                          </div>
                        </TableCell>
                        <TableCell>{request.days}</TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              request.status === 'approved' ? 'bg-green-100 text-green-800' :
                              request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.createdAt), 'MMM dd')}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={request.reason || ''}>
                            {request.reason || 'N/A'}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Leave Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.leaveTypes).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="capitalize">{type} Leave</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Wise Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {departments.map(dept => {
                    const deptRequests = filteredData.filter(request => {
                      const employee = employees.find(e => e.id.toString() === request.employeeId);
                      return employee?.departmentId === dept.id;
                    }).length;
                    
                    return (
                      <div key={dept.id} className="flex items-center justify-between">
                        <span>{dept.name}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ 
                                width: `${stats.total > 0 ? (deptRequests / stats.total) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium">{deptRequests}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}