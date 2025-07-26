import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, FileText, BarChart3, Users2, Clock, Download } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHolidaySchema, type Holiday, type InsertHoliday } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function HolidayManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isWeekendSettingsOpen, setIsWeekendSettingsOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [quickAddDate, setQuickAddDate] = useState("");
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddType, setQuickAddType] = useState("annual");
  const [weekendDays, setWeekendDays] = useState<string[]>(["saturday", "sunday"]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: holidays, isLoading } = useQuery({
    queryKey: ["/api/holidays", selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/holidays?year=${selectedYear}`);
      if (!response.ok) {
        // Return empty array if holidays endpoint doesn't exist yet
        if (response.status === 404) return [];
        throw new Error("Failed to fetch holidays");
      }
      return response.json();
    },
  });



  const createHolidayMutation = useMutation({
    mutationFn: async (holiday: InsertHoliday) => {
      const response = await apiRequest("POST", "/api/holidays", holiday);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({
        title: "Success",
        description: "Holiday created successfully",
      });
      setIsDialogOpen(false);
      form.reset({
        name: "",
        date: new Date(),
        type: "annual",
        description: "",
        isRecurring: false,
        applicableGroups: ["group_a", "group_b"],
        year: new Date().getFullYear(),
        isActive: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create holiday",
        variant: "destructive",
      });
    },
  });



  const form = useForm<InsertHoliday>({
    resolver: zodResolver(insertHolidaySchema),
    defaultValues: {
      name: "",
      date: new Date(),
      type: "annual",
      description: "",
      isRecurring: false,
      applicableGroups: ["group_a", "group_b"],
      year: new Date().getFullYear(),
      isActive: true,
    },
  });

  const onSubmit = (data: InsertHoliday) => {
    // Ensure year is extracted from the date if not explicitly provided
    const holidayData = {
      ...data,
      year: data.year || new Date(data.date).getFullYear(),
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
    
    if (editingHoliday) {
      updateHolidayMutation.mutate({ id: editingHoliday.id, data: holidayData });
    } else {
      createHolidayMutation.mutate(holidayData);
    }
  };

  const updateHolidayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertHoliday }) => {
      const response = await apiRequest("PUT", `/api/holidays/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({
        title: "Success",
        description: "Holiday updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingHoliday(null);
      form.reset({
        name: "",
        date: new Date(),
        type: "annual",
        description: "",
        isRecurring: false,
        applicableGroups: ["group_a", "group_b"],
        year: new Date().getFullYear(),
        isActive: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update holiday",
        variant: "destructive",
      });
    },
  });

  const handleQuickAdd = () => {
    if (!quickAddDate || !quickAddName) {
      toast({
        title: "Error",
        description: "Please fill in both date and name",
        variant: "destructive",
      });
      return;
    }

    const holidayData: InsertHoliday = {
      name: quickAddName,
      date: new Date(quickAddDate),
      type: quickAddType as "annual" | "special" | "weekend",
      description: quickAddName,
      isRecurring: false,
      applicableGroups: ["group_a", "group_b"],
      year: new Date(quickAddDate).getFullYear(),
      isActive: true,
    };

    createHolidayMutation.mutate(holidayData);
    
    // Reset form
    setQuickAddDate("");
    setQuickAddName("");
    setQuickAddType("annual");
  };

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/holidays/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({
        title: "Success",
        description: "Holiday deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete holiday",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    form.reset({
      name: holiday.name,
      date: new Date(holiday.date),
      type: holiday.type,
      description: holiday.description || holiday.name,
      isRecurring: holiday.isRecurring || false,
      applicableGroups: holiday.applicableGroups || ["group_a", "group_b"],
      year: holiday.year || new Date(holiday.date).getFullYear(),
      isActive: holiday.isActive !== undefined ? holiday.isActive : true,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      deleteHolidayMutation.mutate(id);
    }
  };



  // Calculate holiday statistics
  const holidayStats = {
    annual: holidays?.filter((h: Holiday) => h.type === "annual").length || 0,
    special: holidays?.filter((h: Holiday) => h.type === "special").length || 0,
    weekend: holidays?.filter((h: Holiday) => h.type === "weekend").length || 0,
    total: holidays?.length || 0,
  };

  const filteredHolidays = holidays?.filter((holiday: Holiday) => {
    if (filterType === "all") return true;
    return holiday.type === filterType;
  }) || [];

  // Export holiday report
  const exportReport = () => {
    const csvContent = [
      ["Holiday Type", "Number of Days"],
      ["Annual Holidays", holidayStats.annual],
      ["Special Holidays", holidayStats.special],
      ["Weekend Days", holidayStats.weekend],
      ["Total Holidays", holidayStats.total]
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `holiday-report-${selectedYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Holiday Management</h1>
          <p className="text-gray-600 mt-1">Manage government holidays and special dates</p>
        </div>
      </div>

      {/* Tabs for Holiday and Leave Type Management */}
      <div className="space-y-6">
          {/* Holiday Management Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Holiday Management</h2>
              <p className="text-sm text-gray-600">Manage government holidays and special dates</p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() + i - 2;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportReport}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" onClick={() => setIsWeekendSettingsOpen(true)}>
                <Clock className="w-4 h-4 mr-2" />
                Weekend Settings
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[hsl(var(--gov-navy))] hover:bg-[hsl(var(--gov-navy-light))]">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Holiday
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Holiday</DialogTitle>
                  </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Holiday Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter holiday name..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Holiday Type</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select holiday type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="annual">Annual Holiday</SelectItem>
                                <SelectItem value="special">Special Holiday</SelectItem>
                                <SelectItem value="weekend">Weekend</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
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
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              value={field.value || new Date().getFullYear()}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              min={2020}
                              max={2030}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isRecurring"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Recurring Holiday</FormLabel>
                            <p className="text-sm text-gray-500">
                              This holiday occurs annually
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter holiday description..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="applicableGroups"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Applicable Groups</FormLabel>
                        <div className="flex space-x-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value?.includes("group_a")}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current.filter(g => g !== "group_a"), "group_a"]);
                                } else {
                                  field.onChange(current.filter(g => g !== "group_a"));
                                }
                              }}
                            />
                            <span>Group A</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value?.includes("group_b")}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current.filter(g => g !== "group_b"), "group_b"]);
                                } else {
                                  field.onChange(current.filter(g => g !== "group_b"));
                                }
                              }}
                            />
                            <span>Group B</span>
                          </div>
                        </div>
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
                      disabled={createHolidayMutation.isPending}
                    >
                      {createHolidayMutation.isPending ? "Adding..." : "Add Holiday"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Edit Holiday Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditingHoliday(null);
              form.reset({
                name: "",
                date: new Date(),
                type: "annual",
                description: "",
                isRecurring: false,
                applicableGroups: ["group_a", "group_b"],
                year: new Date().getFullYear(),
                isActive: true,
              });
            }
          }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Holiday</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Holiday Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter holiday name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              value={field.value || new Date().getFullYear()}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              min={2020}
                              max={2030}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Holiday Type</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select holiday type" />
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
                      name="isRecurring"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Recurring Holiday</FormLabel>
                            <p className="text-sm text-gray-500">
                              This holiday occurs annually
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter holiday description..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="applicableGroups"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Applicable Groups</FormLabel>
                        <div className="flex space-x-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value?.includes("group_a")}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current.filter(g => g !== "group_a"), "group_a"]);
                                } else {
                                  field.onChange(current.filter(g => g !== "group_a"));
                                }
                              }}
                            />
                            <span>Group A</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value?.includes("group_b")}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current.filter(g => g !== "group_b"), "group_b"]);
                                } else {
                                  field.onChange(current.filter(g => g !== "group_b"));
                                }
                              }}
                            />
                            <span>Group B</span>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={updateHolidayMutation.isPending}
                    >
                      {updateHolidayMutation.isPending ? "Updating..." : "Update Holiday"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Weekend Settings Dialog */}
          <Dialog open={isWeekendSettingsOpen} onOpenChange={setIsWeekendSettingsOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Weekend Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Select which days should be considered weekends for your organization:
                </p>
                <div className="space-y-3">
                  {[
                    { value: "monday", label: "Monday" },
                    { value: "tuesday", label: "Tuesday" },
                    { value: "wednesday", label: "Wednesday" },
                    { value: "thursday", label: "Thursday" },
                    { value: "friday", label: "Friday" },
                    { value: "saturday", label: "Saturday" },
                    { value: "sunday", label: "Sunday" },
                  ].map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={day.value}
                        checked={weekendDays.includes(day.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setWeekendDays([...weekendDays, day.value]);
                          } else {
                            setWeekendDays(weekendDays.filter(d => d !== day.value));
                          }
                        }}
                      />
                      <label htmlFor={day.value} className="text-sm font-medium">
                        {day.label}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                  <Button variant="outline" onClick={() => setIsWeekendSettingsOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      toast({
                        title: "Success",
                        description: `Weekend settings updated: ${weekendDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}`,
                      });
                      setIsWeekendSettingsOpen(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Save Settings
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>

          {/* Holiday Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Annual Holidays</p>
                <p className="text-3xl font-bold text-blue-900">{holidayStats.annual}</p>
                <p className="text-xs text-blue-600 mt-1">days added</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Special Holidays</p>
                <p className="text-3xl font-bold text-purple-900">{holidayStats.special}</p>
                <p className="text-xs text-purple-600 mt-1">days added</p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>



        <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Total Holidays</p>
                <p className="text-3xl font-bold text-orange-900">{holidayStats.total}</p>
                <p className="text-xs text-orange-600 mt-1">days total</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      </div>

      {/* Quick Add Holiday Form */}
      <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-blue-900 flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Quick Add Holiday
          </CardTitle>
          <p className="text-sm text-blue-700">Add new holidays quickly using the form below</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date</label>
              <Input 
                type="date" 
                value={quickAddDate}
                onChange={(e) => setQuickAddDate(e.target.value)}
                className="border-blue-200 focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Holiday Name</label>
              <Input 
                placeholder="Enter holiday name" 
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                className="border-blue-200 focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <Select value={quickAddType} onValueChange={setQuickAddType}>
                <SelectTrigger className="border-blue-200 focus:border-blue-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Holiday</SelectItem>
                  <SelectItem value="special">Special Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Action</label>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleQuickAdd}
                disabled={createHolidayMutation.isPending}
              >
                {createHolidayMutation.isPending ? "Adding..." : "Add Holiday"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holiday List */}
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Holiday List ({selectedYear})
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant={filterType === "all" ? "default" : "outline"}
                size="sm" 
                onClick={() => setFilterType("all")}
                className={filterType === "all" ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                All ({holidays?.length || 0})
              </Button>
              <Button 
                variant={filterType === "annual" ? "default" : "outline"}
                size="sm" 
                onClick={() => setFilterType("annual")}
                className={filterType === "annual" ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                Annual ({holidayStats.annual})
              </Button>
              <Button 
                variant={filterType === "special" ? "default" : "outline"}
                size="sm" 
                onClick={() => setFilterType("special")}
                className={filterType === "special" ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                Special ({holidayStats.special})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredHolidays.length > 0 ? (
            <div className="space-y-3">
              {filteredHolidays.map((holiday: Holiday, index: number) => (
                <div key={holiday.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-medium text-gray-900">{holiday.name}</h3>
                        <Badge variant={holiday.type === "annual" ? "default" : "secondary"} className="text-xs">
                          {holiday.type === "annual" ? "Annual" : "Special"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(holiday.date).toLocaleDateString('en-GB', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-3 text-blue-600 hover:bg-blue-50"
                      onClick={() => handleEdit(holiday)}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-3 text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(holiday.id, holiday.name)}
                      disabled={deleteHolidayMutation.isPending}
                    >
                      <Users2 className="w-4 h-4 mr-1" />
                      {deleteHolidayMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-gray-900">No Holidays Added Yet</h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Get started by adding your first holiday using the quick add form above.
                  </p>
                </div>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setQuickAddDate(new Date().toISOString().split('T')[0]);
                    setQuickAddName("");
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Holiday
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
    </div>
  );
}