import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Eye, Edit, UserX, Filter, Upload, Settings2, Users, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { insertEmployeeSchema, type Employee, type InsertEmployee, type Department } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// --- Types ---
type EmployeeWithDepartment = Employee & { department: string | null };

// --- API Functions ---
const getEmployees = async (): Promise<EmployeeWithDepartment[]> => apiRequest('GET', '/api/employees').then(res => res.json());
const getDepartments = async (): Promise<Department[]> => apiRequest('GET', '/api/departments').then(res => res.json());
const addEmployee = async (employee: InsertEmployee): Promise<Employee> => apiRequest('POST', '/api/employees', employee).then(res => res.json());
const updateEmployee = async (employee: Employee): Promise<Employee> => apiRequest('PUT', `/api/employees/${employee.id}`, employee).then(res => res.json());
const bulkUpdateEmployees = async (data: { employeeIds: string[], updates: Partial<Employee> }): Promise<void> => {
  await apiRequest('PUT', '/api/employees/bulk', data);
};
const addDepartment = async (name: string): Promise<Department> => apiRequest('POST', '/api/departments', { name }).then(res => res.json());
const deleteEmployee = async (id: number): Promise<void> => {
  await apiRequest('DELETE', `/api/employees/${id}`);
};
const uploadPhoto = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest('POST', '/api/upload', formData).then(res => res.json());
};

// --- Employee Form Component ---
interface EmployeeFormProps {
  onSubmit: (data: InsertEmployee) => void;
  onCancel: () => void;
  isPending: boolean;
  departments: Department[];
  initialData: Partial<InsertEmployee>;
}

function EmployeeForm({ onSubmit, onCancel, isPending, departments, initialData }: EmployeeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [photoPreview, setPhotoPreview] = useState(initialData.photoUrl || null);
  const [isAddDeptDialogOpen, setIsAddDeptDialogOpen] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");

  const form = useForm<InsertEmployee>({
    resolver: zodResolver(insertEmployeeSchema),
    defaultValues: initialData,
  });

  const photoUploadMutation = useMutation({
    mutationFn: uploadPhoto,
    onSuccess: (data) => {
      setPhotoPreview(data.url);
      form.setValue("photoUrl", data.url);
      toast({ title: "Photo uploaded successfully!" });
    },
    onError: (error) => {
      toast({ title: "Photo upload failed", description: error.message, variant: "destructive" });
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: addDepartment,
    onSuccess: (newDepartment) => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast({ title: "Department created successfully!" });
      form.setValue("departmentId", newDepartment.id);
      setIsAddDeptDialogOpen(false);
      setNewDepartmentName("");
    },
    onError: (error) => {
      toast({ title: "Error creating department", description: error.message, variant: "destructive" });
    },
  });

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      photoUploadMutation.mutate(file);
    }
  };

  const handleCreateDepartment = () => {
    if (newDepartmentName.trim()) {
      createDepartmentMutation.mutate(newDepartmentName.trim());
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={photoPreview || undefined} alt="Employee Photo" />
              <AvatarFallback>{initialData.fullName?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label htmlFor="photo-upload">Employee Photo</Label>
              <Input id="photo-upload" type="file" onChange={handlePhotoChange} className="max-w-xs" />
              {photoUploadMutation.isPending && <p className="text-sm text-muted-foreground">Uploading...</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem> <FormLabel>Full Name</FormLabel> <FormControl><Input placeholder="Enter full name" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="employeeId" render={({ field }) => ( <FormItem> <FormLabel>Employee ID</FormLabel> <FormControl><Input placeholder="Enter employee ID" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input type="email" placeholder="Enter email" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem> <FormLabel>Phone</FormLabel> <FormControl><Input placeholder="Enter phone number" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="position" render={({ field }) => ( <FormItem> <FormLabel>Position</FormLabel> <FormControl><Input placeholder="Enter position" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select
                    onValueChange={(val) => {
                      if (val === "add_new_department") {
                        setIsAddDeptDialogOpen(true);
                      } else {
                        field.onChange(parseInt(val));
                      }
                    }}
                    value={field.value ? String(field.value) : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="add_new_department">
                        <span className="flex items-center">
                          <Plus className="mr-2 h-4 w-4" /> Create new...
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="employeeGroup" render={({ field }) => ( <FormItem> <FormLabel>Employee Group</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger></FormControl> <SelectContent> {[{value: 'group_a', label: 'Group A'}, {value: 'group_b', label: 'Group B'}].map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="status" render={({ field }) => ( <FormItem> <FormLabel>Status</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl> <SelectContent> {['active', 'on_leave', 'terminated'].map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="role" render={({ field }) => ( <FormItem> <FormLabel>Role</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl> <SelectContent> {['admin', 'user'].map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || photoUploadMutation.isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </Form>

      <Dialog open={isAddDeptDialogOpen} onOpenChange={setIsAddDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="new-dept-name">Department Name</Label>
            <Input
              id="new-dept-name"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              placeholder="e.g., Marketing"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDeptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDepartment} disabled={createDepartmentMutation.isPending}>
              {createDepartmentMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Bulk Operations Component ---
interface BulkOperationsProps {
  selectedEmployees: string[];
  onBulkUpdate: (updates: Partial<Employee>) => void;
  onClose: () => void;
  departments: Department[];
  isPending: boolean;
}

function BulkOperations({ selectedEmployees, onBulkUpdate, onClose, departments, isPending }: BulkOperationsProps) {
  const [operation, setOperation] = useState("");
  const [bulkDepartmentId, setBulkDepartmentId] = useState<number | undefined>(undefined);
  const [bulkGroup, setBulkGroup] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");

  const resetForm = () => {
    setOperation("");
    setBulkDepartmentId(undefined);
    setBulkGroup("");
    setBulkStatus("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBulkUpdate = () => {
    const updates: any = {};
    
    if (operation === "department" && bulkDepartmentId) {
      updates.departmentId = bulkDepartmentId; // Send as number, backend will parse
    } else if (operation === "group" && bulkGroup) {
      updates.employeeGroup = bulkGroup;
    } else if (operation === "status" && bulkStatus) {
      updates.status = bulkStatus;
    }

    console.log("Frontend sending bulk updates:", updates);

    if (Object.keys(updates).length > 0) {
      onBulkUpdate(updates);
      resetForm();
    }
  };

  return (
    <Dialog open={selectedEmployees.length > 0} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Operations ({selectedEmployees.length} selected)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="operation">Select Operation</Label>
            <Select value={operation} onValueChange={setOperation}>
              <SelectTrigger>
                <SelectValue placeholder="Choose operation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="department">Change Department</SelectItem>
                <SelectItem value="group">Change Group</SelectItem>
                <SelectItem value="status">Change Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {operation === "department" && (
            <div>
              <Label htmlFor="department">New Department</Label>
              <Select value={bulkDepartmentId?.toString()} onValueChange={(value) => setBulkDepartmentId(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {operation === "group" && (
            <div>
              <Label htmlFor="group">New Group</Label>
              <Select value={bulkGroup} onValueChange={setBulkGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group_a">Group A</SelectItem>
                  <SelectItem value="group_b">Group B</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {operation === "status" && (
            <div>
              <Label htmlFor="status">New Status</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleBulkUpdate} disabled={isPending || !operation}>
            {isPending ? "Updating..." : "Update Selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Employee Management Component ---
export default function EmployeeManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ group: "all", status: "all" });
  const [dialogs, setDialogs] = useState({ add: false, edit: false, view: false });
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithDepartment | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [showBulkOperations, setShowBulkOperations] = useState(false);

  const groupDisplay: Record<string, { name: string; className: string }> = {
    'group_a': { name: 'Group A', className: 'bg-blue-100 text-blue-800' },
    'group_b': { name: 'Group B', className: 'bg-green-100 text-green-800' },
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({ queryKey: ['employees'], queryFn: getEmployees });
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({ queryKey: ['departments'], queryFn: getDepartments });

  const createEmployeeMutation = useMutation({ mutationFn: addEmployee, 
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: "Employee created successfully!" });
      setDialogs({ ...dialogs, add: false });
    },
    onError: (error) => toast({ title: "Error creating employee", description: error.message, variant: "destructive" })
  });

  const updateEmployeeMutation = useMutation({ mutationFn: updateEmployee, 
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: "Employee updated successfully!" });
      setDialogs({ ...dialogs, edit: false });
    },
    onError: (error) => toast({ title: "Error updating employee", description: error.message, variant: "destructive" })
  });

  const bulkUpdateMutation = useMutation({ 
    mutationFn: bulkUpdateEmployees, 
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: "Employees updated successfully!" });
      setSelectedEmployees([]);
      setShowBulkOperations(false);
    },
    onError: (error) => toast({ title: "Error updating employees", description: error.message, variant: "destructive" })
  });

  const deleteEmployeeMutation = useMutation({ mutationFn: deleteEmployee, 
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: "Employee deleted successfully!" });
    },
    onError: (error) => toast({ title: "Error deleting employee", description: error.message, variant: "destructive" })
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => 
      (emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
       emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filters.status === 'all' || emp.status === filters.status) &&
      (filters.group === 'all' || emp.employeeGroup === filters.group)
    );
  }, [employees, searchTerm, filters]);

  const handleAddSubmit = (data: InsertEmployee) => createEmployeeMutation.mutate(data);
  const handleEditSubmit = (data: InsertEmployee) => updateEmployeeMutation.mutate({ ...selectedEmployee!, ...data });

  const handleBulkUpdate = (updates: Partial<Employee>) => {
    bulkUpdateMutation.mutate({ employeeIds: selectedEmployees, updates });
  };

  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(filteredEmployees.map(emp => emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const openDialog = (type: 'add' | 'edit' | 'view', employee: EmployeeWithDepartment | null = null) => {
    setSelectedEmployee(employee);
    setDialogs(prev => ({ ...prev, [type]: true }));
  };

  const closeDialogs = () => {
    setDialogs({ add: false, edit: false, view: false });
    setSelectedEmployee(null);
  };

  if (isLoadingEmployees || isLoadingDepartments) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Employee Management</h1>
        <div className="flex items-center gap-2">
          {selectedEmployees.length > 0 && (
            <Button variant="outline" onClick={() => setShowBulkOperations(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Bulk Operations ({selectedEmployees.length})
            </Button>
          )}
          <Button onClick={() => openDialog('add')}><Plus className="mr-2 h-4 w-4" /> Add Employee</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input placeholder="Search by name, email, or ID..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <Select value={filters.group} onValueChange={(value) => setFilters(f => ({...f, group: value}))}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by group" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  <SelectItem value="group_a">Group A</SelectItem>
                  <SelectItem value="group_b">Group B</SelectItem>

                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(value) => setFilters(f => ({...f, status: value}))}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingEmployees ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading employees...
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                    <UserX className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-semibold">No Employees Found</h3>
                    <p>Your search or filter criteria did not match any employees.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee, index) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={(checked) => handleSelectEmployee(employee.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={employee.photoUrl || undefined} />
                          <AvatarFallback>{employee.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{employee.fullName}</p>
                          <p className="text-sm text-muted-foreground">ID: {employee.employeeId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department || "Unassigned"}</TableCell>
                    <TableCell>
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', employee.employeeGroup && groupDisplay[employee.employeeGroup]?.className)}>
                        {groupDisplay[employee.employeeGroup]?.name ?? employee.employeeGroup}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDialog('view', employee)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDialog('edit', employee)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteEmployeeMutation.mutate(employee.id)}>
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogs.add || dialogs.edit} onOpenChange={(isOpen) => !isOpen && closeDialogs()}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{dialogs.add ? 'Add New Employee' : 'Edit Employee'}</DialogTitle>
          </DialogHeader>
          <EmployeeForm 
            onSubmit={dialogs.add ? handleAddSubmit : handleEditSubmit}
            onCancel={closeDialogs}
            isPending={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
            departments={departments}
            initialData={dialogs.add ? { employeeId: '', fullName: '', email: null, phone: null, departmentId: undefined, position: null, employeeGroup: 'group_a', status: 'active', role: 'user', photoUrl: null } : selectedEmployee!}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={dialogs.view} onOpenChange={(isOpen) => !isOpen && closeDialogs()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Employee Details</DialogTitle></DialogHeader>
          {selectedEmployee ? (
            <div className="space-y-4 pt-4">
              <div className="flex items-center space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={selectedEmployee.photoUrl || undefined} />
                  <AvatarFallback>{selectedEmployee.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedEmployee.fullName}</h3>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.position}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <p><strong>Employee ID:</strong> {selectedEmployee.employeeId}</p>
                <p><strong>Email:</strong> {selectedEmployee.email}</p>
                <p><strong>Phone:</strong> {selectedEmployee.phone ?? 'N/A'}</p>
                <p><strong>Department:</strong> {selectedEmployee.department}</p>
                <p><strong>Position:</strong> {selectedEmployee.position ?? 'N/A'}</p>
                <p><strong>Group:</strong> {selectedEmployee.employeeGroup}</p>
                <p><strong>Status:</strong> <Badge variant={selectedEmployee.status === 'active' ? 'default' : 'secondary'}>{selectedEmployee.status}</Badge></p>
                <p><strong>Role:</strong> {selectedEmployee.role}</p>
                <p><strong>Join Date:</strong> {new Date(selectedEmployee.joinDate).toLocaleDateString()}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No employee details to display.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Operations Dialog */}
      {showBulkOperations && (
        <BulkOperations
          selectedEmployees={selectedEmployees}
          onBulkUpdate={handleBulkUpdate}
          onClose={() => setShowBulkOperations(false)}
          departments={departments}
          isPending={bulkUpdateMutation.isPending}
        />
      )}
    </div>
  );
}
