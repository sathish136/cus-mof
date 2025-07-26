import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, FileText, Users, Plus, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LeaveRequest, Employee, LeaveType } from "@shared/schema";

const leaveRequestSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  leaveType: z.enum(["annual", "special"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  days: z.number().optional(), // Make days optional since it's calculated
  reason: z.string().min(1, "Reason is required"),
});

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

export default function LeaveManagement() {
  const [activeTab, setActiveTab] = useState("pending");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [useAbsentData, setUseAbsentData] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [requestToReject, setRequestToReject] = useState<LeaveRequest | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      employeeId: "",
      leaveType: "annual",
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  // Fetch data queries
  const { data: leaveRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ["/api/leave-requests"],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["/api/attendance"],
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ["/api/holidays"],
  });

  // Calculate actual leave allowances from Holiday Management data
  const annualHolidayCount = holidays.filter(h => h.type === 'annual').length || 0;
  const specialHolidayCount = holidays.filter(h => h.type === 'special').length || 24;
  
  const leaveTypes = [
    { id: 1, name: "annual", description: "Annual Holiday", maxDays: annualHolidayCount },
    { id: 2, name: "special", description: "Special Holiday", maxDays: specialHolidayCount },
  ];

  // Define today's date
  const today = new Date().toISOString().split('T')[0];

  // Get absent employees for selected date with leave balance info
  const absentEmployees = employees.filter(emp => {
    const hasAttendanceOnDate = attendance.some(att => 
      att.employeeId === emp.id && 
      new Date(att.date).toISOString().split('T')[0] === selectedDate
    );
    const hasLeaveOnDate = leaveRequests.some(leave => 
      leave.employeeId === emp.id && 
      leave.status === 'approved' &&
      new Date(leave.startDate).toISOString().split('T')[0] <= selectedDate &&
      new Date(leave.endDate).toISOString().split('T')[0] >= selectedDate
    );
    return !hasAttendanceOnDate && !hasLeaveOnDate;
  }).map(emp => {
    // Calculate used leave days for current year from actual approved requests
    const currentYear = new Date().getFullYear();
    const usedAnnualDays = leaveRequests.filter(req => 
      req.employeeId === emp.id && 
      req.leaveType === 'annual' && 
      req.status === 'approved' &&
      new Date(req.startDate).getFullYear() === currentYear
    ).reduce((total, req) => total + (req.days || 0), 0);
    
    const usedSpecialDays = leaveRequests.filter(req => 
      req.employeeId === emp.id && 
      req.leaveType === 'special' && 
      req.status === 'approved' &&
      new Date(req.startDate).getFullYear() === currentYear
    ).reduce((total, req) => total + (req.days || 0), 0);

    // Get actual holiday counts from Holiday Management data
    const annualHolidays = holidays.filter(h => h.type === 'annual').length || 0;
    const specialHolidays = holidays.filter(h => h.type === 'special').length || 24;

    return {
      ...emp,
      leaveBalance: {
        annual: { used: usedAnnualDays, remaining: Math.max(0, annualHolidays - usedAnnualDays) },
        special: { used: usedSpecialDays, remaining: Math.max(0, specialHolidays - usedSpecialDays) }
      }
    };
  });

  // Create leave request mutation
  const createLeaveRequestMutation = useMutation({
    mutationFn: async (data: LeaveRequestFormData) => {
      try {
        console.log("Submitting leave request:", data);
        const response = await fetch("/api/leave-requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          credentials: "include",
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
          throw new Error(errorData.message || "Failed to create leave request");
        }
        return response.json();
      } catch (error) {
        console.error("Mutation function error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      try {
        queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
        setIsDialogOpen(false);
        form.reset();
        toast({
          title: "Success",
          description: "Leave request created successfully",
          variant: "default",
        });
        console.log("Leave request created successfully");
      } catch (error) {
        console.error("Success handler error:", error);
      }
    },
    onError: (error: any) => {
      try {
        console.error("Failed to create leave request:", error);
        const errorMessage = error.message || "Failed to create leave request";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } catch (handlerError) {
        console.error("Error handler error:", handlerError);
      }
    },
  });

  // Approve/Reject leave request mutations
  const updateLeaveStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: number; status: string; reason?: string }) => {
      console.log("Updating leave request:", { id, status, reason });
      const response = await fetch(`/api/leave-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status, 
          approvedBy: "1149", // Current user ID - use actual employee ID
          approvedAt: new Date().toISOString(),
          rejectionReason: reason 
        }),
        credentials: "include",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update leave request: ${errorText}`);
      }
      return response.json();
    },
    onSuccess: (updatedRequest, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({
        title: "Success",
        description: `Leave request ${variables.status === 'approved' ? 'approved' : 'rejected'} successfully`,
        variant: "default",
      });
      console.log("Leave request updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update leave request:", error);
    },
  });

  const handleSubmit = async (data: LeaveRequestFormData) => {
    try {
      console.log("Form submission data:", data);
      console.log("Available employees:", employees);
      console.log("Form validation errors:", form.formState.errors);
      
      // Check for duplicate leave requests on the same date
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      const duplicateRequest = leaveRequests.find(req => {
        if (req.employeeId !== parseInt(data.employeeId)) return false;
        
        const reqStartDate = new Date(req.startDate);
        const reqEndDate = new Date(req.endDate);
        
        // Check for any overlap between date ranges
        return (
          (startDate >= reqStartDate && startDate <= reqEndDate) ||
          (endDate >= reqStartDate && endDate <= reqEndDate) ||
          (startDate <= reqStartDate && endDate >= reqEndDate)
        );
      });
      
      if (duplicateRequest) {
        toast({
          title: "Duplicate Leave Request",
          description: `Employee already has a leave request for overlapping dates (${format(new Date(duplicateRequest.startDate), 'dd/MM/yyyy')} - ${format(new Date(duplicateRequest.endDate), 'dd/MM/yyyy')})`,
          variant: "destructive",
        });
        return;
      }

      // Calculate days between start and end date
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Check leave balance for the employee
      const employee = employeesWithBalance.find(e => e.id.toString() === data.employeeId);
      if (employee) {
        const availableBalance = data.leaveType === 'annual' 
          ? employee.leaveBalance.annual.remaining 
          : employee.leaveBalance.special.remaining;
        
        if (daysDiff > availableBalance) {
          toast({
            title: "Insufficient Leave Balance",
            description: `Employee only has ${availableBalance} ${data.leaveType} leave days remaining. Cannot request ${daysDiff} days.`,
            variant: "destructive",
          });
          return;
        }
      }
      
      // Subtract holidays from total days
      const holidaysInRange = holidays.filter(holiday => {
        const holidayDate = new Date(holiday.date);
        return holidayDate >= startDate && holidayDate <= endDate;
      }).length;
      
      const workingDays = Math.max(1, daysDiff - holidaysInRange);
      
      const submitData = {
        ...data,
        days: workingDays,
      };
      
      console.log("Final submit data:", submitData);
      
      await createLeaveRequestMutation.mutateAsync(submitData);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast({
        title: "Error",
        description: "Failed to submit leave request",
        variant: "destructive",
      });
    }
  };

  const handleQuickLeaveFromAbsent = (employee: any, leaveType: string) => {
    form.setValue("employeeId", employee.id.toString());
    form.setValue("leaveType", leaveType);
    form.setValue("startDate", selectedDate);
    form.setValue("endDate", selectedDate);
    form.setValue("days", 1);
    form.setValue("reason", `Absent on ${selectedDate} - ${leaveType} leave encashment request`);
    setSelectedEmployee(employee);
    setUseAbsentData(false); // Switch to manual mode to show the form
  };

  const handleRejectWithReason = (request: LeaveRequest) => {
    setRequestToReject(request);
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    if (requestToReject && rejectReason.trim()) {
      updateLeaveStatusMutation.mutate({
        id: requestToReject.id,
        status: "rejected",
        reason: rejectReason
      });
      setShowRejectDialog(false);
      setRejectReason("");
      setRequestToReject(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };

  const pendingRequests = leaveRequests.filter(req => req.status === "pending");
  const approvedRequests = leaveRequests.filter(req => req.status === "approved");
  const rejectedRequests = leaveRequests.filter(req => req.status === "rejected");

  if (isLoadingRequests) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading leave requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">
            Manage employee leave requests and approvals
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Leave Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Leave Request</DialogTitle>
              <DialogDescription>
                Add a new leave request for an employee
              </DialogDescription>
            </DialogHeader>
            
            {/* Toggle for data source */}
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                checked={useAbsentData}
                onCheckedChange={setUseAbsentData}
              />
              <span className="text-sm">
                {useAbsentData ? "Get from absent employees" : "Manual entry"}
              </span>
            </div>

            {/* Date picker for absent employees */}
            {useAbsentData && (
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Select Date:</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full max-w-xs"
                />
              </div>
            )}

            {/* Absent employees leave encashment */}
            {useAbsentData && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">
                  Absent Employees on {new Date(selectedDate).toLocaleDateString()} - Leave Encashment Available:
                </h4>
                {absentEmployees.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {absentEmployees.map((employee) => (
                      <div key={employee.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {employee.fullName && employee.fullName !== employee.employeeId 
                                ? employee.fullName 
                                : `Employee ${employee.employeeId}`}
                            </p>
                            <p className="text-xs text-gray-500">{employee.employeeId} - {employee.position}</p>
                            <div className="flex gap-3 mt-1 text-xs">
                              <span className="text-blue-600">
                                Annual: {employee.leaveBalance.annual.remaining}/{annualHolidayCount} days left
                              </span>
                              <span className="text-green-600">
                                Special: {employee.leaveBalance.special.remaining}/{specialHolidayCount} days left
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleQuickLeaveFromAbsent(employee, 'annual')}
                              disabled={employee.leaveBalance.annual.remaining <= 0}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                            >
                              Annual
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleQuickLeaveFromAbsent(employee, 'special')}
                              disabled={employee.leaveBalance.special.remaining <= 0}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            >
                              Special
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No absent employees found for selected date
                  </p>
                )}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit(handleSubmit)(e).catch((error) => {
                  console.error("Form submission error:", error);
                  toast({
                    title: "Error",
                    description: "Failed to submit leave request",
                    variant: "destructive",
                  });
                });
              }} className="space-y-4">
                {/* Debug info */}
                <div className="text-xs text-gray-500">
                  Form errors: {JSON.stringify(form.formState.errors)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id.toString()}>
                                  {employee.fullName} ({employee.employeeId})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="leaveType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Leave Type</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select leave type" />
                            </SelectTrigger>
                            <SelectContent>
                              {leaveTypes.map((leaveType) => (
                                <SelectItem key={leaveType.id} value={leaveType.name}>
                                  {leaveType.description || leaveType.name.charAt(0).toUpperCase() + leaveType.name.slice(1)} Leave
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter reason for leave..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={createLeaveRequestMutation.isPending}
                  >
                    {createLeaveRequestMutation.isPending ? "Creating..." : "Create Leave Request"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {approvedRequests.filter(req => 
                req.approvedAt && new Date(req.approvedAt).toISOString().split('T')[0] === today
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Recently approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{absentEmployees.length}</div>
            <p className="text-xs text-muted-foreground">Without attendance/leave</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave Today</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {approvedRequests.filter(req => 
                new Date(req.startDate) <= new Date() && 
                new Date(req.endDate) >= new Date()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Currently on leave</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Leave Requests</CardTitle>
              <CardDescription>
                Review and approve/reject leave requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending leave requests
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => {
                    const employee = employees.find(e => e.id.toString() === request.employeeId.toString());
                    return (
                      <div key={request.id} className="border rounded-lg p-6 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="bg-blue-100 p-2 rounded-full">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <span className="font-semibold text-lg text-gray-800">
                                  {employee?.fullName && employee.fullName !== employee.employeeId 
                                    ? employee.fullName 
                                    : employee?.employeeId 
                                    ? `Employee ${employee.employeeId}`
                                    : `Employee ${request.employeeId}`}
                                </span>
                                <span className="text-gray-500 ml-2">({employee?.employeeId || request.employeeId})</span>
                                <Badge 
                                  variant="secondary" 
                                  className="ml-3 bg-blue-100 text-blue-800 font-medium"
                                >
                                  {request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)} Holiday
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center space-x-6 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-green-600" />
                                <span className="font-medium">
                                  {format(new Date(request.startDate), "dd MMM")} - {format(new Date(request.endDate), "dd MMM, yyyy")}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-orange-600" />
                                <span className="font-medium">{request.days} day{request.days > 1 ? 's' : ''}</span>
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border-l-4 border-blue-500">
                              <p className="text-sm text-gray-700 font-medium">Reason:</p>
                              <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2 ml-4">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 font-medium shadow-md hover:shadow-lg transition-all"
                              onClick={() => updateLeaveStatusMutation.mutate({
                                id: request.id,
                                status: "approved"
                              })}
                              disabled={updateLeaveStatusMutation.isPending}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 font-medium shadow-md hover:shadow-lg transition-all"
                              onClick={() => handleRejectWithReason(request)}
                              disabled={updateLeaveStatusMutation.isPending}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Approved Leave Requests</CardTitle>
              <CardDescription>
                Previously approved leave requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvedRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No approved leave requests
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedRequests.map((request) => {
                    const employee = employees.find(e => e.id.toString() === request.employeeId.toString());
                    return (
                      <div key={request.id} className="border rounded-lg p-4 bg-green-50">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4" />
                              <span className="font-medium">
                                {employee?.fullName && employee.fullName !== employee.employeeId 
                                  ? employee.fullName 
                                  : employee?.employeeId 
                                  ? `Employee ${employee.employeeId}`
                                  : `Employee ${request.employeeId}`} ({employee?.employeeId || request.employeeId})
                              </span>
                              <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {format(new Date(request.startDate), "MMM dd")} - {format(new Date(request.endDate), "MMM dd, yyyy")}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{request.days} days</span>
                              </div>
                            </div>
                            <p className="text-sm">{request.reason}</p>
                            {request.approvedAt && (
                              <p className="text-xs text-green-600">
                                Approved on {format(new Date(request.approvedAt), "MMM dd, yyyy")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Leave Requests</CardTitle>
              <CardDescription>
                Previously rejected leave requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rejectedRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No rejected leave requests
                </div>
              ) : (
                <div className="space-y-4">
                  {rejectedRequests.map((request) => {
                    const employee = employees.find(e => e.id.toString() === request.employeeId.toString());
                    return (
                      <div key={request.id} className="border rounded-lg p-4 bg-red-50">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4" />
                              <span className="font-medium">
                                {employee?.fullName && employee.fullName !== employee.employeeId 
                                  ? employee.fullName 
                                  : employee?.employeeId 
                                  ? `Employee ${employee.employeeId}`
                                  : `Employee ${request.employeeId}`} ({employee?.employeeId || request.employeeId})
                              </span>
                              <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {format(new Date(request.startDate), "MMM dd")} - {format(new Date(request.endDate), "MMM dd, yyyy")}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{request.days} days</span>
                              </div>
                            </div>
                            <p className="text-sm">{request.reason}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-red-600" />
              Reject Leave Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Please provide a reason for rejecting this leave request:
              </p>
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-20 border-gray-300"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason("");
                  setRequestToReject(null);
                }}
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmReject}
                disabled={!rejectReason.trim() || updateLeaveStatusMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {updateLeaveStatusMutation.isPending ? "Rejecting..." : "Reject Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}