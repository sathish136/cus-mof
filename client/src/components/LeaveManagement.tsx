import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLeaveRequestSchema, type LeaveRequest, type InsertLeaveRequest } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function LeaveManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leaveRequests, isLoading } = useQuery({
    queryKey: ["/api/leave-requests"],
    queryFn: async () => {
      const response = await fetch("/api/leave-requests");
      if (!response.ok) throw new Error("Failed to fetch leave requests");
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

  const createLeaveRequestMutation = useMutation({
    mutationFn: async (leaveRequest: InsertLeaveRequest) => {
      const response = await apiRequest("POST", "/api/leave-requests", leaveRequest);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({
        title: "Success",
        description: "Leave request created successfully",
      });
      setIsDialogOpen(false);
      form.reset({
        employeeId: "",
        leaveType: "annual",
        startDate: new Date(),
        endDate: new Date(),
        days: 1,
        reason: "",
        status: "pending",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create leave request",
        variant: "destructive",
      });
    },
  });

  const updateLeaveRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PUT", `/api/leave-requests/${id}`, { 
        status, 
        approvedBy: "1149", // Current user ID - use actual employee ID
        approvedAt: new Date().toISOString()
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({
        title: "Success",
        description: "Leave request updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update leave request",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertLeaveRequest>({
    resolver: zodResolver(insertLeaveRequestSchema.extend({
      employeeId: z.string().min(1, "Employee selection is required")
    })),
    defaultValues: {
      employeeId: "",
      leaveType: "annual",
      startDate: new Date(),
      endDate: new Date(),
      days: 1,
      reason: "",
      status: "pending",
    },
  });

  const onSubmit = (data: InsertLeaveRequest) => {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Find the employee by employeeId to get the database ID
    const employee = employees?.find((emp: any) => emp.employeeId === data.employeeId);
    if (!employee) {
      toast({
        title: "Error",
        description: "Employee not found",
        variant: "destructive",
      });
      return;
    }
    
    createLeaveRequestMutation.mutate({
      ...data,
      employeeId: employee.id.toString(), // Convert to string as schema expects varchar
      days,
    });
  };

  const handleApprove = (id: number) => {
    updateLeaveRequestMutation.mutate({ id, status: "approved" });
  };

  const handleReject = (id: number) => {
    updateLeaveRequestMutation.mutate({ id, status: "rejected" });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const filteredRequests = leaveRequests?.filter((request: LeaveRequest) => {
    if (filterStatus === "all") return true;
    return request.status === filterStatus;
  }) || [];

  const leaveStats = {
    total: leaveRequests?.length || 0,
    pending: leaveRequests?.filter((r: LeaveRequest) => r.status === "pending").length || 0,
    approved: leaveRequests?.filter((r: LeaveRequest) => r.status === "approved").length || 0,
    rejected: leaveRequests?.filter((r: LeaveRequest) => r.status === "rejected").length || 0,
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
          <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
          <p className="text-sm text-gray-600">Manage employee leave requests and approvals</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[hsl(var(--gov-navy))] hover:bg-[hsl(var(--gov-navy-light))]">
              <Plus className="w-4 h-4 mr-2" />
              New Leave Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Leave Request</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees?.map((employee: any) => (
                                <SelectItem key={employee.id} value={employee.employeeId}>
                                  {employee.fullName} - {employee.employeeId}
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
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Leave Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="annual">Annual Holiday</SelectItem>
                              <SelectItem value="special">Special Holiday</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
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
                          <Input 
                            type="date" 
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
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
                    className="bg-[hsl(var(--gov-navy))] hover:bg-[hsl(var(--gov-navy-light))]"
                    disabled={createLeaveRequestMutation.isPending}
                  >
                    {createLeaveRequestMutation.isPending ? "Creating..." : "Create Request"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{leaveStats.total}</p>
              </div>
              <Calendar className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{leaveStats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{leaveStats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{leaveStats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests Table */}
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Leave Requests</CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
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
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No leave requests found for the selected filter
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request: any) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          Employee ID: {request.employeeId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline">
                          {request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.days} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(request.status)}
                          {getStatusBadge(request.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {request.status === "pending" && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleApprove(request.id)}
                              className="text-green-600 hover:text-green-700"
                              disabled={updateLeaveRequestMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleReject(request.id)}
                              className="text-red-600 hover:text-red-700"
                              disabled={updateLeaveRequestMutation.isPending}
                            >
                              Reject
                            </Button>
                          </>
                        )}
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
