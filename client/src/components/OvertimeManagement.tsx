import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, CheckCircle, Users, Filter, Search, RefreshCw, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OvertimeManagement() {
  // Calculate dates fresh each time to avoid caching issues
  const getTodaysDate = () => new Date().toISOString().split('T')[0];
  const getFirstDayOfMonth = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  };
  
  const [startDate, setStartDate] = useState("2025-07-01"); // Force July 1st
  const [endDate, setEndDate] = useState(getTodaysDate());
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");

  // Force correct dates on mount - fix timezone issue
  useEffect(() => {
    const today = new Date();
    // Fix timezone issue by using UTC dates
    const monthStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
    console.log('Setting dates:', monthStart.toISOString().split('T')[0], today.toISOString().split('T')[0]);
    setStartDate(monthStart.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  const { data: eligibleEmployees = [], isLoading: isEligibleLoading } = useQuery({
    queryKey: ["/api/overtime-eligible", startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/overtime-eligible?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error("Failed to fetch eligible employees");
      return response.json();
    },
  });

  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    const newSelected = new Set(selectedEmployees);
    if (checked) {
      newSelected.add(employeeId);
    } else {
      newSelected.delete(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(new Set(filteredEmployees.map(emp => emp.id)));
    } else {
      setSelectedEmployees(new Set());
    }
  };

  // Filter employees based on search term and group
  const filteredEmployees = eligibleEmployees.filter((employee: any) => {
    const matchesSearch = employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === "all" || employee.employeeGroup === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  // Calculate stats
  const totalOTHours = filteredEmployees.reduce((sum: number, emp: any) => sum + parseFloat(emp.otHours), 0);
  const selectedOTHours = filteredEmployees
    .filter((emp: any) => selectedEmployees.has(emp.id))
    .reduce((sum: number, emp: any) => sum + parseFloat(emp.otHours), 0);

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Overtime Management</h1>
          <p className="text-gray-600 mt-1">View and manage employee overtime hours</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Employees</p>
                <p className="text-3xl font-bold text-gray-900">{filteredEmployees.length}</p>
                <p className="text-gray-500 text-xs mt-1">with OT hours</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Total OT Hours</p>
                <p className="text-3xl font-bold text-gray-900">{totalOTHours.toFixed(1)}</p>
                <p className="text-gray-500 text-xs mt-1">auto-approved</p>
              </div>
              <div className="bg-green-50 p-3 rounded-full">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Weekend OT</p>
                <p className="text-3xl font-bold text-gray-900">Auto</p>
                <p className="text-gray-500 text-xs mt-1">Sat/Sun full hours</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-full">
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Selected</p>
                <p className="text-3xl font-bold text-gray-900">{selectedEmployees.size}</p>
                <p className="text-gray-500 text-xs mt-1">{selectedOTHours.toFixed(1)}h selected</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-full">
                <CheckCircle className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Professional Action Bar */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <label className="text-sm font-medium text-gray-700">From:</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-44 border-gray-300"
                  />
                  <label className="text-sm font-medium text-gray-700">To:</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-44 border-gray-300"
                  />
                </div>
                
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <Search className="w-5 h-5 text-gray-600" />
                  <Input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48 border-gray-300"
                  />
                </div>

                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <label className="text-sm font-medium text-gray-700">Group:</label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger className="w-32 border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups</SelectItem>
                      <SelectItem value="group_a">Group A</SelectItem>
                      <SelectItem value="group_b">Group B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {selectedEmployees.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {selectedEmployees.size} Selected
                  </Badge>
                  <span className="text-sm text-blue-600">•</span>
                  <span className="text-sm font-medium text-blue-700">{selectedOTHours.toFixed(1)}h total</span>
                </div>
              )}
            </div>
            
            {selectedEmployees.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  All OT Hours Auto-Approved
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Overtime Hours Display */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <div className="w-full">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-4 rounded-t-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Overtime Hours - {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}</h3>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 ml-auto">
                {filteredEmployees.length} employees with OT hours
              </Badge>
            </div>
          </div>

          <div className="mt-0">
            <div className="space-y-4">
              
              {isEligibleLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600 font-medium">Loading eligible employees...</p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-800 mb-2">
                    {eligibleEmployees.length === 0 ? "All caught up!" : "No matches found"}
                  </h4>
                  <p className="text-gray-600">
                    {eligibleEmployees.length === 0 
                      ? `No overtime hours recorded for ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
                      : "Try adjusting your search filters"
                    }
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {eligibleEmployees.length === 0 
                      ? "Try selecting a different date range or check attendance records."
                      : `${eligibleEmployees.length} total employees available`
                    }
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-blue-200">
                      <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100">
                        <TableHead className="w-12 text-center">
                          <Checkbox
                            checked={selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="w-16 text-blue-800 font-bold text-sm text-center">S.No</TableHead>
                        <TableHead className="text-blue-800 font-bold text-sm">Employee ID</TableHead>
                        <TableHead className="text-blue-800 font-bold text-sm">Name</TableHead>
                        <TableHead className="text-blue-800 font-bold text-sm text-center">Group</TableHead>
                        <TableHead className="text-blue-800 font-bold text-sm text-center">Actual Hours</TableHead>
                        <TableHead className="text-blue-800 font-bold text-sm text-center">Required Hours</TableHead>
                        <TableHead className="text-blue-800 font-bold text-sm text-center">OT Hours</TableHead>
                        <TableHead className="text-blue-800 font-bold text-sm text-center">Date</TableHead>
                        <TableHead className="text-blue-800 font-bold text-sm">Remark</TableHead>
                        <TableHead className="text-blue-800 font-bold text-sm text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee: any, index: number) => (
                        <TableRow key={`${employee.employeeId}-${employee.date}`} className="hover:bg-blue-50 border-gray-200 transition-colors">
                          <TableCell className="text-center">
                            <Checkbox
                              checked={selectedEmployees.has(employee.id)}
                              onCheckedChange={(checked) => handleSelectEmployee(employee.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-bold text-gray-800 text-center">{index + 1}</TableCell>
                          <TableCell className="font-mono text-gray-700 font-medium">{employee.employeeId}</TableCell>
                          <TableCell className="font-semibold text-gray-800">{employee.fullName}</TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={employee.employeeGroup === 'group_a' ? 'default' : 'secondary'}
                              className={employee.employeeGroup === 'group_a' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                            >
                              {employee.employeeGroup === 'group_a' ? 'Group A' : 'Group B'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-gray-700 text-center">{employee.actualHours}h</TableCell>
                          <TableCell className="text-gray-600 text-center">{employee.requiredHours}h</TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-orange-100 text-orange-700 font-bold border border-orange-300">
                              +{employee.otHours}h
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-700 font-mono text-sm text-center">
                            {new Date(employee.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-gray-700 text-sm max-w-xs">
                            <span className={employee.isWeekend ? 'text-orange-600 font-medium' : 'text-gray-600'}>
                              {employee.remark || 'Regular day overtime'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-700 font-bold border border-green-300">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Auto-Approved
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}