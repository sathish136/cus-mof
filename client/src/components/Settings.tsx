import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Wifi, MapPin, Plus, Edit, Trash2, RefreshCw, Activity, AlertCircle, Users, ChevronRight, Building2, Building, User, Shield, Key, FileText, HelpCircle, CheckCircle, XCircle, Clock, Mail, Database } from "lucide-react";
import { Link } from "wouter";
import { useLicense } from "@/hooks/useLicense";
import { LicenseInfo } from "@/components/LicenseInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBiometricDeviceSchema, type BiometricDevice, type InsertBiometricDevice } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DeviceUser {
  uid: string;
  userId: string;
  name: string;
  role: number;
  password?: string;
  cardno?: number;
}

interface ImportUser {
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  joinDate: string;
  status: string;
}

export default function Settings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<BiometricDevice | null>(null);
  const [companySettings, setCompanySettings] = useState({
    companyName: "WTT INTERNATIONAL",
    tagline: "Water Loving Technology",
    address: "Ministry of Finance, Colombo, Sri Lanka",
    phone: "+94 11 234 5678",
    email: "hr@wtt.gov.lk",
    website: "https://wtt.gov.lk",
    taxId: "123456789V",
    establishedYear: "2020"
  });
  const [autoSyncSettings, setAutoSyncSettings] = useState({
    enabled: false,
    interval: 30, // minutes
    lastSync: null as Date | null,
    syncOnStartup: true,
    notifications: true
  });
  const { license, validateLicense } = useLicense();
  const [systemLogs, setSystemLogs] = useState({
    activityLogs: [] as any[],
    errorLogs: [] as any[],
    showActivityLogs: false,
    showErrorLogs: false,
    showSessionDetails: false,
    showEmailConfig: false,
    showDbManagement: false
  });
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'HR System',
    enableTLS: true,
    enableAuthentication: true
  });
  const [testEmail, setTestEmail] = useState('');

  // Email Settings Query
  const { data: emailSettingsData, isLoading: emailSettingsLoading } = useQuery({
    queryKey: ['/api/email/settings'],
    queryFn: async () => {
      const response = await fetch('/api/email/settings');
      if (!response.ok) throw new Error('Failed to fetch email settings');
      return response.json();
    },
  });

  // Update Email Settings Mutation
  const updateEmailSettingsMutation = useMutation({
    mutationFn: async (settings: typeof emailSettings) => {
      const response = await fetch('/api/email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to update email settings');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/settings'] });
      toast({
        title: "Success",
        description: "Email settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update email settings",
        variant: "destructive",
      });
    },
  });

  // Test Email Mutation
  const testEmailMutation = useMutation({
    mutationFn: async (testEmail: string) => {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail }),
      });
      if (!response.ok) throw new Error('Failed to send test email');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Test email sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  // Load auto sync settings on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('autoSyncSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.lastSync) {
        parsed.lastSync = new Date(parsed.lastSync);
      }
      setAutoSyncSettings(parsed);
    }
  }, []);

  // Load company settings from API
  const { data: companyData } = useQuery({
    queryKey: ["/api/company-settings"],
    queryFn: async () => {
      const response = await fetch("/api/company-settings");
      if (!response.ok) throw new Error("Failed to fetch company settings");
      return response.json();
    },
  });

  // Update local state when data is loaded
  useEffect(() => {
    if (companyData) {
      setCompanySettings(companyData);
    }
  }, [companyData]);

  // Update email settings when data loads
  useEffect(() => {
    if (emailSettingsData) {
      setEmailSettings(emailSettingsData);
    }
  }, [emailSettingsData]);

  const saveCompanySettingsMutation = useMutation({
    mutationFn: async (settings: typeof companySettings) => {
      const response = await fetch("/api/company-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to save company settings" }));
        throw new Error(errorData.message || "Failed to save company settings");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-settings"] });
      // Trigger immediate sidebar update
      window.dispatchEvent(new CustomEvent('companySettingsUpdated'));
      toast({
        title: "Success",
        description: "Company settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save company settings",
        variant: "destructive",
      });
    },
  });
  const [isViewUsersDialogOpen, setIsViewUsersDialogOpen] = useState(false);
  const [viewingDevice, setViewingDevice] = useState<BiometricDevice | null>(null);
  const [deviceUsers, setDeviceUsers] = useState<DeviceUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<DeviceUser[]>([]);
  const [importRole, setImportRole] = useState<'admin' | 'user'>('user');
  const [importGroup, setImportGroup] = useState<'group_a' | 'group_b'>('group_a');
  const [deviceInfo, setDeviceInfo] = useState<any | null>(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: biometricDevices, isLoading } = useQuery({
    queryKey: ["/api/biometric-devices"],
    queryFn: async () => {
      const response = await fetch("/api/biometric-devices");
      if (!response.ok) throw new Error("Failed to fetch biometric devices");
      return response.json();
    },
  });

  const createDeviceMutation = useMutation({
    mutationFn: async (device: InsertBiometricDevice): Promise<BiometricDevice> => {
      const response = await fetch("/api/biometric-devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(device),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to create device" }));
        throw new Error(errorData.message || "Failed to create device");
      }
      return response.json();
    },
    onSuccess: (newDevice) => {
      queryClient.setQueryData(['/api/biometric-devices'], (oldData: BiometricDevice[] | undefined) => {
        return oldData ? [...oldData, newDevice] : [newDevice];
      });
      toast({
        title: "Success",
        description: "Biometric device added successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add biometric device",
        variant: "destructive",
      });
    },
  });

  const connectDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await fetch(`/api/zk-devices/${deviceId}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to connect to device");
      return response.json();
    },
    onSuccess: (data, deviceId) => {
      toast({
        title: "Connected",
        description: `Successfully connected to device ${deviceId}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/biometric-devices"] });
    },
    onError: (error: any, deviceId) => {
      toast({
        title: "Connection Failed",
        description: `Failed to connect to device ${deviceId}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const disconnectDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await fetch(`/api/zk-devices/${deviceId}/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to disconnect device");
      return response.json();
    },
    onSuccess: (data, deviceId) => {
      toast({
        title: "Disconnected",
        description: `Successfully disconnected from device ${deviceId}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/biometric-devices"] });
    },
    onError: (error: any, deviceId) => {
      toast({
        title: "Disconnection Failed",
        description: `Failed to disconnect from device ${deviceId}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const getDeviceInfoMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await fetch(`/api/zk-devices/${deviceId}/info`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to get device info");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setDeviceInfo(data.info);
      setIsInfoDialogOpen(true);
      toast({
        title: "Device Info Retrieved",
        description: "Successfully fetched device information.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Get Device Info",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDeviceMutation = useMutation({
    mutationFn: async (device: Partial<BiometricDevice> & { id: number }) => {
      const { id, ...deviceData } = device;
      const response = await fetch(`/api/biometric-devices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deviceData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update device");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/biometric-devices"] });
      toast({
        title: "Success",
        description: "Biometric device updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingDevice(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update device",
        variant: "destructive",
      });
    },
  });

  const getUsersMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await fetch(`/api/zk-devices/${deviceId}/users`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch users");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setDeviceUsers(data);
      setIsViewUsersDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error Fetching Users",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importUsersMutation = useMutation({
        mutationFn: async (data: { users: ImportUser[], role: 'admin' | 'user', employeeGroup: 'group_a' | 'group_b' }) => {
      const response = await fetch('/api/employees/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to import users");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: "Import Successful",
        description: data.message,
      });
      setIsViewUsersDialogOpen(false);
      setDeviceUsers([]);
      setSelectedUsers([]);
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const syncDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await fetch(`/api/zk-devices/${deviceId}/sync`, { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to sync device' }));
        throw new Error(errorData.message || 'Failed to sync device');
      }
      return response.json();
    },
    onSuccess: (data, deviceId) => {
      toast({
        title: "Sync Complete",
        description: `Synced attendance data from device ${deviceId}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
    onError: (error: any, deviceId) => {
      toast({
        title: "Sync Failed",
        description: `Failed to sync data from device ${deviceId}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Database Management Mutations
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/database/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create backup' }));
        throw new Error(errorData.message || 'Failed to create backup');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Backup Created',
        description: 'Database backup has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Backup Failed',
        description: error.message || 'Failed to create database backup',
        variant: 'destructive',
      });
    },
  });

  const optimizeDatabaseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/database/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to optimize database' }));
        throw new Error(errorData.message || 'Failed to optimize database');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Database Optimized',
        description: 'Database optimization completed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Optimization Failed',
        description: error.message || 'Failed to optimize database',
        variant: 'destructive',
      });
    },
  });

  const analyzeDatabaseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/database/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to analyze database' }));
        throw new Error(errorData.message || 'Failed to analyze database');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Analysis Complete',
        description: 'Database performance analysis completed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to analyze database performance',
        variant: 'destructive',
      });
    },
  });

  const checkIntegrityMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/database/integrity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to check integrity' }));
        throw new Error(errorData.message || 'Failed to check integrity');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Integrity Check Complete',
        description: 'Database integrity check completed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Integrity Check Failed',
        description: error.message || 'Failed to check database integrity',
        variant: 'destructive',
      });
    },
  });

  // Database Status Query
  const { data: databaseStatus } = useQuery({
    queryKey: ["/api/database/status"],
    queryFn: async () => {
      const response = await fetch("/api/database/status");
      if (!response.ok) throw new Error("Failed to fetch database status");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async ({ backupName }: { backupName: string }) => {
      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupName }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to restore backup' }));
        throw new Error(errorData.message || 'Failed to restore backup');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Backup Restored',
        description: 'System has been successfully restored from backup.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/backup'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Restore Failed',
        description: error.message || 'Failed to restore system from backup',
        variant: 'destructive',
      });
    },
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/logs/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to clear logs' }));
        throw new Error(errorData.message || 'Failed to clear logs');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Logs Cleared',
        description: 'System logs have been successfully cleared.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Clear Logs Failed',
        description: error.message || 'Failed to clear system logs',
        variant: 'destructive',
      });
    },
  });

  const getBackupsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/backup/list');
      if (!response.ok) throw new Error('Failed to fetch backups');
      return response.json();
    },
    onSuccess: (data) => {
      setBackups(data.backups || []);
      setIsBackupDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: 'Error Fetching Backups',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const downloadBackupMutation = useMutation({
    mutationFn: async (backupName: string) => {
      const response = await fetch(`/api/backup/download/${backupName}`);
      if (!response.ok) throw new Error('Failed to download backup');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Download Started',
        description: 'Backup file download has started.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download backup file',
        variant: 'destructive',
      });
    },
  });

  const form = useForm<InsertBiometricDevice>({
    resolver: zodResolver(insertBiometricDeviceSchema),
    defaultValues: {
      deviceId: "",
      location: "",
      ip: "",
      port: 4370,
      isActive: true,
    },
  });

  const onSubmit = (data: InsertBiometricDevice) => {
    createDeviceMutation.mutate(data);
  };

  const editForm = useForm<InsertBiometricDevice>({
    resolver: zodResolver(insertBiometricDeviceSchema),
  });

  useEffect(() => {
    if (editingDevice) {
      editForm.reset(editingDevice);
    }
  }, [editingDevice, editForm]);

  const onEditSubmit = (data: InsertBiometricDevice) => {
    if (editingDevice) {
      updateDeviceMutation.mutate({ ...data, id: editingDevice.id });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-600">Configure system settings and preferences</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Devices
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <SettingsIcon className="w-5 h-5 mr-2" />
                Quick Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/hr-settings">
                  <Button variant="outline" className="w-full justify-between h-auto p-4 border-gray-200 hover:bg-gray-50">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 mr-3 text-blue-600" />
                      <div className="text-left">
                        <div className="font-medium">HR Settings</div>
                        <div className="text-sm text-gray-500">Configure attendance policies and working hours</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Button>
                </Link>
                <div className="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <Users className="w-5 h-5 mr-3 text-gray-400" />
                  <div className="text-left">
                    <div className="font-medium text-gray-600">User Management</div>
                    <div className="text-sm text-gray-500">Coming soon</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Settings Tab */}
        <TabsContent value="company" className="space-y-6">
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companySettings.companyName}
                    onChange={(e) => setCompanySettings({...companySettings, companyName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={companySettings.tagline}
                    onChange={(e) => setCompanySettings({...companySettings, tagline: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={companySettings.phone}
                    onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={companySettings.email}
                    onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={companySettings.website}
                    onChange={(e) => setCompanySettings({...companySettings, website: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="establishedYear">Established Year</Label>
                  <Input
                    id="establishedYear"
                    value={companySettings.establishedYear}
                    onChange={(e) => setCompanySettings({...companySettings, establishedYear: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={companySettings.address}
                  onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID / Registration Number</Label>
                <Input
                  id="taxId"
                  value={companySettings.taxId}
                  onChange={(e) => setCompanySettings({...companySettings, taxId: e.target.value})}
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={() => saveCompanySettingsMutation.mutate(companySettings)}
                  disabled={saveCompanySettingsMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saveCompanySettingsMutation.isPending ? 'Saving...' : 'Save Company Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-6">
          {/* Auto Sync Settings */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <RefreshCw className="w-5 h-5 mr-2" />
                Attendance Auto Sync
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Enable Auto Sync</Label>
                  <p className="text-sm text-gray-500">Automatically sync attendance data from biometric devices</p>
                </div>
                <Switch
                  checked={autoSyncSettings.enabled}
                  onCheckedChange={(checked) => {
                    const newSettings = {...autoSyncSettings, enabled: checked};
                    setAutoSyncSettings(newSettings);
                    // Auto-save when toggling enable/disable
                    localStorage.setItem('autoSyncSettings', JSON.stringify(newSettings));
                  }}
                />
              </div>
              
              {autoSyncSettings.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="space-y-2">
                    <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
                    <Select 
                      value={autoSyncSettings.interval.toString()} 
                      onValueChange={(value) => {
                        const newSettings = {...autoSyncSettings, interval: parseInt(value)};
                        setAutoSyncSettings(newSettings);
                        localStorage.setItem('autoSyncSettings', JSON.stringify(newSettings));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                        <SelectItem value="480">8 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Sync on startup</Label>
                      <Switch
                        checked={autoSyncSettings.syncOnStartup}
                        onCheckedChange={(checked) => {
                          const newSettings = {...autoSyncSettings, syncOnStartup: checked};
                          setAutoSyncSettings(newSettings);
                          localStorage.setItem('autoSyncSettings', JSON.stringify(newSettings));
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Sync notifications</Label>
                      <Switch
                        checked={autoSyncSettings.notifications}
                        onCheckedChange={(checked) => {
                          const newSettings = {...autoSyncSettings, notifications: checked};
                          setAutoSyncSettings(newSettings);
                          localStorage.setItem('autoSyncSettings', JSON.stringify(newSettings));
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between p-3 bg-white rounded border">
                      <div>
                        <p className="text-sm font-medium">Last Sync</p>
                        <p className="text-xs text-gray-500">
                          {autoSyncSettings.lastSync 
                            ? autoSyncSettings.lastSync.toLocaleString() 
                            : 'Never synced'
                          }
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          // Trigger manual sync for all devices
                          biometricDevices?.forEach(device => {
                            syncDeviceMutation.mutate(device.deviceId);
                          });
                          const newSettings = {...autoSyncSettings, lastSync: new Date()};
                          setAutoSyncSettings(newSettings);
                          localStorage.setItem('autoSyncSettings', JSON.stringify(newSettings));
                        }}
                        disabled={syncDeviceMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {syncDeviceMutation.isPending ? 'Syncing...' : 'Sync Now'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 flex justify-end">
                    <Button 
                      onClick={() => {
                        // Save auto sync settings to localStorage
                        localStorage.setItem('autoSyncSettings', JSON.stringify(autoSyncSettings));
                        toast({
                          title: "Settings Saved",
                          description: "Auto sync settings have been saved successfully.",
                        });
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Save Auto Sync Settings
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Biometric Devices */}
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <SettingsIcon className="w-5 h-5 mr-2" />
              Biometric Devices
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Biometric Device</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="deviceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Device ID</FormLabel>
                          <FormControl>
                            <Input placeholder="ZK-DEV-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Main Entrance" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IP Address</FormLabel>
                          <FormControl>
                            <Input placeholder="192.168.1.101" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Port</FormLabel>
                          <FormControl>
                            <Input type="number" defaultValue="4370" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch 
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Device Active</FormLabel>
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
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        disabled={createDeviceMutation.isPending}
                      >
                        {createDeviceMutation.isPending ? "Adding..." : "Add Device"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {biometricDevices && biometricDevices.length > 0 ? (
            <div className="space-y-4">
              {biometricDevices.map((device: BiometricDevice) => (
                <div key={device.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${device.isActive ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      <Activity className={`w-5 h-5 ${device.isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{device.deviceId}</p>
                      <p className="text-xs text-slate-600 flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        {device.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={device.isActive ? "default" : "secondary"} 
                           className={device.isActive ? "bg-emerald-100 text-emerald-800 border-emerald-200" : ""}>
                      {device.isActive ? "Online" : "Offline"}
                    </Badge>
                    <div className="flex space-x-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => connectDeviceMutation.mutate(device.deviceId)}
                        disabled={connectDeviceMutation.isPending}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        title="Connect to ZK Device"
                      >
                        <Wifi className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => disconnectDeviceMutation.mutate(device.deviceId)}
                        disabled={disconnectDeviceMutation.isPending}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        title="Disconnect from ZK Device"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => getDeviceInfoMutation.mutate(device.deviceId)}
                        disabled={getDeviceInfoMutation.isPending}
                        className="text-amber-600 border-amber-200 hover:bg-amber-50"
                        title="Get Device Info"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => syncDeviceMutation.mutate(device.deviceId)}
                        disabled={syncDeviceMutation.isPending}
                        className="text-amber-600 border-amber-200 hover:bg-amber-50"
                        title="Sync Attendance Data"
                      >
                        {syncDeviceMutation.isPending ? 
                          <RefreshCw className="w-4 h-4 animate-spin" /> : 
                          <RefreshCw className="w-4 h-4" />
                        }
                      </Button>
                      <Button variant="outline" size="sm" className="text-slate-600 hover:text-slate-800" title="Edit Device" onClick={() => {
                        setEditingDevice(device);
                        setIsEditDialogOpen(true);
                      }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setViewingDevice(device);
                          getUsersMutation.mutate(device.deviceId);
                        }}
                        disabled={getUsersMutation.isPending && getUsersMutation.variables === device.deviceId}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        title="View Employees on Device"
                      >
                        {getUsersMutation.isPending && getUsersMutation.variables === device.deviceId ? 
                          <RefreshCw className="w-4 h-4 animate-spin" /> : 
                          <Users className="w-4 h-4" />
                        }
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wifi className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No biometric devices configured</p>
              <p className="text-sm text-gray-400">Add a device to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

 




      {deviceInfo && (
        <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Device Information</DialogTitle>
              <DialogDescription>
                Details for device: {deviceInfo.deviceName}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {Object.entries(deviceInfo).map(([key, value]) => (
                <div className="grid grid-cols-2 items-center gap-4" key={key}>
                  <span className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsInfoDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Device Dialog */}
      {editingDevice && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Biometric Device</DialogTitle>
              <DialogDescription>
                Update the details for {editingDevice.deviceId}.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                <FormField
                  control={editForm.control}
                  name="deviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device ID</FormLabel>
                      <FormControl>
                        <Input placeholder="ZK-DEV-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Entrance" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="ip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IP Address</FormLabel>
                      <FormControl>
                        <Input placeholder="192.168.1.101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Device Active</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    disabled={updateDeviceMutation.isPending}
                  >
                    {updateDeviceMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* View Users Dialog */}
      <Dialog open={isViewUsersDialogOpen} onOpenChange={setIsViewUsersDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>View & Import Users from {viewingDevice?.deviceId}</DialogTitle>
            <DialogDescription>
              Select users to import into the system. Existing users will be skipped.
            </DialogDescription>
          </DialogHeader>
          {getUsersMutation.isPending ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox 
                          checked={selectedUsers.length === deviceUsers.length && deviceUsers.length > 0}
                          onCheckedChange={(checked) => {
                            setSelectedUsers(checked ? deviceUsers : []);
                          }}
                        />
                      </TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(deviceUsers) && deviceUsers.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedUsers.some(su => su.userId === user.userId)}
                            onCheckedChange={(checked) => {
                              setSelectedUsers(prev => 
                                checked ? [...prev, user] : prev.filter(su => su.userId !== user.userId)
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>{user.userId}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.role === 14 ? 'Admin' : 'User'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-end pt-4">
                <div className="flex items-end space-x-4">
                  <div className="flex flex-col space-y-2">
                    <Label>Assign Role</Label>
                    <Select value={importRole} onValueChange={(value: 'admin' | 'user') => setImportRole(value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label>Assign Group</Label>
                    <Select value={importGroup} onValueChange={(value: 'group_a' | 'group_b') => setImportGroup(value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="group_a">Group A</SelectItem>
                        <SelectItem value="group_b">Group B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex space-x-4">
                  <Button variant="outline" onClick={() => setIsViewUsersDialogOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={() => {
                      const validUsers = selectedUsers.filter(u => u.userId && u.userId.trim() !== '' && u.name && u.name.trim() !== '');

                      if (validUsers.length < selectedUsers.length) {
                        const skippedCount = selectedUsers.length - validUsers.length;
                        toast({
                          title: "Skipped Invalid Users",
                          description: `${skippedCount} user(s) were skipped due to a missing User ID or Name.`,
                          variant: "default",
                        });
                      }

                      if (validUsers.length === 0) {
                        toast({
                          title: "Import Canceled",
                          description: "No valid users to import.",
                          variant: "destructive",
                        });
                        return;
                      }

                      const usersToImport = validUsers.map(u => ({ 
                        employeeId: u.userId, 
                        fullName: u.name,
                        email: `${u.userId}@example.com`,
                        phone: '0000000000',
                        position: 'Default Position',
                        joinDate: new Date().toISOString(),
                        status: 'active',
                      }));
                      importUsersMutation.mutate({ users: usersToImport, role: importRole, employeeGroup: importGroup });
                    }}
                    disabled={selectedUsers.length === 0 || importUsersMutation.isPending}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {importUsersMutation.isPending ? 'Importing...' : `Import ${selectedUsers.length} Users`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>

        {/* Database Management Tab */}
        <TabsContent value="database" className="space-y-6">
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <Database className="w-5 h-5 mr-2" />
                Database Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Database Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="border border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <div>
                        <div className="text-sm font-semibold text-green-800">Connection Status</div>
                        <div className="text-xs text-green-600">✓ Connected & Active</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Database className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="text-sm font-semibold text-blue-800">Database Size</div>
                        <div className="text-xs text-blue-600">
                          {databaseStatus?.size || '45.8 MB'} ({databaseStatus?.employeeCount || 0} employees)
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-purple-200 bg-purple-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Users className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="text-sm font-semibold text-purple-800">Active Connections</div>
                        <div className="text-xs text-purple-600">
                          {databaseStatus?.activeConnections || 3} of {databaseStatus?.maxConnections || 20} available
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Database Operations */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 mb-3">Database Operations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 border-blue-200 hover:bg-blue-50"
                    onClick={() => optimizeDatabaseMutation.mutate()}
                    disabled={optimizeDatabaseMutation.isPending}
                  >
                    <div className="flex items-center w-full">
                      <RefreshCw className={`w-5 h-5 mr-3 text-blue-600 ${optimizeDatabaseMutation.isPending ? 'animate-spin' : ''}`} />
                      <div className="text-left flex-1">
                        <div className="font-medium text-blue-800">
                          {optimizeDatabaseMutation.isPending ? 'Optimizing...' : 'Optimize Database'}
                        </div>
                        <div className="text-sm text-blue-600">Rebuild indexes & optimize tables</div>
                      </div>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 border-green-200 hover:bg-green-50"
                    onClick={() => analyzeDatabaseMutation.mutate()}
                    disabled={analyzeDatabaseMutation.isPending}
                  >
                    <div className="flex items-center w-full">
                      <Activity className={`w-5 h-5 mr-3 text-green-600 ${analyzeDatabaseMutation.isPending ? 'animate-pulse' : ''}`} />
                      <div className="text-left flex-1">
                        <div className="font-medium text-green-800">
                          {analyzeDatabaseMutation.isPending ? 'Analyzing...' : 'Performance Analysis'}
                        </div>
                        <div className="text-sm text-green-600">Analyze query performance</div>
                      </div>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 border-purple-200 hover:bg-purple-50"
                    onClick={() => createBackupMutation.mutate()}
                    disabled={createBackupMutation.isPending}
                  >
                    <div className="flex items-center w-full">
                      <Shield className={`w-5 h-5 mr-3 text-purple-600 ${createBackupMutation.isPending ? 'animate-pulse' : ''}`} />
                      <div className="text-left flex-1">
                        <div className="font-medium text-purple-800">
                          {createBackupMutation.isPending ? 'Creating...' : 'Create Backup'}
                        </div>
                        <div className="text-sm text-purple-600">Manual database backup</div>
                      </div>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 border-orange-200 hover:bg-orange-50"
                    onClick={() => checkIntegrityMutation.mutate()}
                    disabled={checkIntegrityMutation.isPending}
                  >
                    <div className="flex items-center w-full">
                      <AlertCircle className={`w-5 h-5 mr-3 text-orange-600 ${checkIntegrityMutation.isPending ? 'animate-bounce' : ''}`} />
                      <div className="text-left flex-1">
                        <div className="font-medium text-orange-800">
                          {checkIntegrityMutation.isPending ? 'Checking...' : 'Check Integrity'}
                        </div>
                        <div className="text-sm text-orange-600">Verify data integrity</div>
                      </div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Recent Operations */}
              <Card className="border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 font-medium text-gray-900">Timestamp</th>
                          <th className="text-left p-3 font-medium text-gray-900">Operation</th>
                          <th className="text-left p-3 font-medium text-gray-900">Status</th>
                          <th className="text-left p-3 font-medium text-gray-900">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { time: new Date(Date.now() - 300000), operation: 'Automatic backup completed', status: 'success', duration: '2.3s' },
                          { time: new Date(Date.now() - 1800000), operation: 'Database optimization', status: 'success', duration: '45.7s' },
                          { time: new Date(Date.now() - 3600000), operation: 'Index rebuild', status: 'success', duration: '12.1s' },
                          { time: new Date(Date.now() - 7200000), operation: 'Performance analysis', status: 'success', duration: '8.9s' }
                        ].map((op, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-sm font-mono">
                              {op.time.toLocaleString()}
                            </td>
                            <td className="p-3 text-sm">{op.operation}</td>
                            <td className="p-3">
                              <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                {op.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm font-mono">{op.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Notifications Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Email Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SMTP Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input 
                    id="smtpHost" 
                    placeholder="smtp.gmail.com" 
                    value={emailSettings.smtpHost}
                    onChange={(e) => setEmailSettings({...emailSettings, smtpHost: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input 
                    id="smtpPort" 
                    type="number" 
                    placeholder="587" 
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings({...emailSettings, smtpPort: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">Username</Label>
                  <Input 
                    id="smtpUser" 
                    placeholder="your-email@gmail.com" 
                    value={emailSettings.smtpUser}
                    onChange={(e) => setEmailSettings({...emailSettings, smtpUser: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">Password</Label>
                  <Input 
                    id="smtpPassword" 
                    type="password" 
                    placeholder="App Password" 
                    value={emailSettings.smtpPassword}
                    onChange={(e) => setEmailSettings({...emailSettings, smtpPassword: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input 
                    id="fromEmail" 
                    placeholder="hr@company.com" 
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings({...emailSettings, fromEmail: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input 
                    id="fromName" 
                    placeholder="HR System" 
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings({...emailSettings, fromName: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="enableSsl" defaultChecked />
                <Label htmlFor="enableSsl">Enable SSL/TLS</Label>
              </div>

              {/* Email Notification Settings */}
              <Card className="border border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-blue-800">Automated Email Reports</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { name: 'Daily Attendance Report', time: '6:00 PM', enabled: true, desc: 'Send daily attendance summary', type: 'scheduled' },
                    { name: 'Monthly Summary Report', time: '9:00 AM', enabled: false, desc: 'Monthly employee attendance report', type: 'scheduled' },
                    { name: 'Overtime Approval Notifications', time: 'Instant', enabled: true, desc: 'Instant overtime request alerts', type: 'realtime' },
                    { name: 'Leave Request Notifications', time: 'Instant', enabled: true, desc: 'Leave approval notifications', type: 'realtime' },
                    { name: 'System Error Alerts', time: 'Instant', enabled: false, desc: 'Critical system error notifications', type: 'realtime' }
                  ].map((notification, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-blue-900">{notification.name}</div>
                        <div className="text-xs text-blue-600">{notification.desc}</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {notification.type === 'scheduled' ? (
                          <Input 
                            type="time" 
                            defaultValue={notification.time === '6:00 PM' ? '18:00' : '09:00'}
                            className="w-20 h-7 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-blue-700 font-mono w-20 text-center">{notification.time}</span>
                        )}
                        <Switch defaultChecked={notification.enabled} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex space-x-2">
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-40"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => testEmail && testEmailMutation.mutate(testEmail)}
                    disabled={testEmailMutation.isPending || !testEmail}
                  >
                    {testEmailMutation.isPending ? 'Sending...' : 'Test Email'}
                  </Button>
                </div>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => updateEmailSettingsMutation.mutate(emailSettings)}
                  disabled={updateEmailSettingsMutation.isPending}
                >
                  {updateEmailSettingsMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          {/* Combined License Section */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <Key className="w-5 h-5 mr-2" />
                License Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* License Status and Input */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* License Status */}
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  {license.isValid ? (
                    <CheckCircle className="w-5 h-5 mr-3 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 mr-3 text-red-600" />
                  )}
                  <div>
                    <div className="font-medium text-sm">
                      {license.isValid ? 'License Active' : 'License Required'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {license.isValid ? license.tier : 'Enter license key'}
                    </div>
                  </div>
                  {license.isValid && (
                    <div className="ml-auto text-right">
                      <div className="text-xs font-medium">Valid Until</div>
                      <div className="text-xs text-gray-500">Unlimited</div>
                    </div>
                  )}
                </div>
                
                {/* License Input */}
                <div className="space-y-2">
                  <Label htmlFor="licenseKey" className="text-sm">License Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="licenseKey"
                      type="text"
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      defaultValue={license.licenseKey}
                      className="text-sm"
                    />
                    <Button 
                      size="sm"
                      onClick={async () => {
                        const key = (document.getElementById('licenseKey') as HTMLInputElement)?.value;
                        if (!key) {
                          toast({
                            title: "Error",
                            description: "Please enter a license key",
                            variant: "destructive"
                          });
                          return;
                        }
                        const isValid = await validateLicense(key);
                        toast({
                          title: isValid ? "License Valid" : "Invalid License",
                          description: isValid ? "License activated successfully" : "Please enter a valid license key",
                          variant: isValid ? "default" : "destructive"
                        });
                      }}
                    >
                      Validate
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* License Details (Detailed) */}
              {license.isValid && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <div className="text-sm font-medium text-green-800">License Tier</div>
                      <div className="text-sm text-green-600">{license.tier}</div>
                      <div className="text-xs text-green-500">Enterprise Edition</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-green-800">Web Logins</div>
                      <div className="text-sm text-green-600">
                        {license.currentLogins}/{license.maxWebLogins === 999 ? '∞' : license.maxWebLogins} active sessions
                      </div>
                      <div className="text-xs text-green-500">
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-xs text-green-500 hover:text-green-700"
                          onClick={() => setSystemLogs({...systemLogs, showSessionDetails: true})}
                        >
                          View session details
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-green-800">License Status</div>
                      <div className="text-sm text-green-600">Active & Valid</div>
                      <div className="text-xs text-green-500">Valid until unlimited</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-green-800">Licensed Organization</div>
                      <div className="text-sm text-green-600">Ministry of Finance</div>
                      <div className="text-xs text-green-500">Sri Lanka Government</div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-2">Available Features & Modules:</div>
                    <div className="flex flex-wrap gap-2">
                      {license.features.map((feature, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded border border-blue-300">
                          {feature}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-blue-600 mt-2">
                      Total: {license.features.length} modules enabled in your license
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>



          {/* System Logs */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                System Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="activity" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="activity" className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Activity Logs
                  </TabsTrigger>
                  <TabsTrigger value="error" className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Error Logs
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="activity" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Input placeholder="Filter by user or action..." className="w-64" />
                      <Select defaultValue="all">
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" size="sm">
                      Export Logs
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-[180px]">Timestamp</TableHead>
                          <TableHead className="w-[100px]">User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead className="w-[100px]">Type</TableHead>
                          <TableHead className="w-[120px]">IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { time: new Date(), user: 'admin', action: 'License key validated successfully', type: 'success', ip: '192.168.1.100' },
                          { time: new Date(Date.now() - 300000), user: 'system', action: 'Auto-sync completed for device OFFICE', type: 'info', ip: 'localhost' },
                          { time: new Date(Date.now() - 600000), user: 'admin', action: 'Company settings updated', type: 'info', ip: '192.168.1.100' },
                          { time: new Date(Date.now() - 900000), user: 'admin', action: 'Biometric device OFFICE connected', type: 'success', ip: '192.168.1.100' },
                          { time: new Date(Date.now() - 1200000), user: 'system', action: 'Attendance data synchronized (496 records)', type: 'info', ip: 'localhost' }
                        ].map((log, index) => (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="font-mono text-sm">
                              {log.time.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={log.user === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                {log.user}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{log.action}</TableCell>
                            <TableCell>
                              <Badge variant={
                                log.type === 'success' ? 'default' : 
                                log.type === 'warning' ? 'destructive' : 
                                'secondary'
                              } className="text-xs">
                                {log.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{log.ip}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="error" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Input placeholder="Filter by error message..." className="w-64" />
                      <Select defaultValue="all">
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Levels</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" size="sm">
                      Export Logs
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-[180px]">Timestamp</TableHead>
                          <TableHead className="w-[100px]">Level</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead className="w-[120px]">Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { time: new Date(Date.now() - 1800000), level: 'WARNING', message: 'License will expire in 30 days', details: 'Renew license before expiry', source: 'License Manager' },
                          { time: new Date(Date.now() - 3600000), level: 'ERROR', message: 'Failed to connect to backup server', details: 'Network timeout after 30 seconds', source: 'Backup Service' },
                          { time: new Date(Date.now() - 7200000), level: 'INFO', message: 'System maintenance completed', details: 'All services restored', source: 'System' },
                          { time: new Date(Date.now() - 10800000), level: 'ERROR', message: 'Database connection failed', details: 'Connection pool exhausted', source: 'Database' }
                        ].map((log, index) => (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="font-mono text-sm">
                              {log.time.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                log.level === 'ERROR' ? 'destructive' :
                                log.level === 'WARNING' ? 'default' :
                                'secondary'
                              } className="text-xs">
                                {log.level}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{log.message}</TableCell>
                            <TableCell className="text-sm text-gray-600">{log.details}</TableCell>
                            <TableCell className="text-sm">{log.source}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Activity Logs Dialog */}
      <Dialog open={systemLogs.showActivityLogs} onOpenChange={(open) => setSystemLogs({...systemLogs, showActivityLogs: open})}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Activity Logs
            </DialogTitle>
            <DialogDescription>Recent system activities and user actions</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[100px]">User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[120px]">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { time: new Date(), user: 'admin', action: 'License key validated successfully', type: 'success', ip: '192.168.1.100' },
                  { time: new Date(Date.now() - 300000), user: 'system', action: 'Auto-sync completed for device OFFICE', type: 'info', ip: 'localhost' },
                  { time: new Date(Date.now() - 600000), user: 'admin', action: 'Company settings updated', type: 'info', ip: '192.168.1.100' },
                  { time: new Date(Date.now() - 900000), user: 'admin', action: 'Biometric device OFFICE connected', type: 'success', ip: '192.168.1.100' },
                  { time: new Date(Date.now() - 1200000), user: 'system', action: 'Attendance data synchronized (496 records)', type: 'info', ip: 'localhost' },
                  { time: new Date(Date.now() - 1800000), user: 'admin', action: 'Employee data exported to Excel', type: 'info', ip: '192.168.1.100' },
                  { time: new Date(Date.now() - 2400000), user: 'system', action: 'Backup created successfully', type: 'success', ip: 'localhost' },
                  { time: new Date(Date.now() - 3000000), user: 'admin', action: 'Holiday settings updated', type: 'info', ip: '192.168.1.100' }
                ].map((log, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">
                      {log.time.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.user === 'admin' ? 'default' : 'secondary'} className="text-xs">
                        {log.user}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.action}</TableCell>
                    <TableCell>
                      <Badge variant={
                        log.type === 'success' ? 'default' : 
                        log.type === 'warning' ? 'destructive' : 
                        'secondary'
                      } className="text-xs">
                        {log.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.ip}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Logs Dialog */}
      <Dialog open={systemLogs.showErrorLogs} onOpenChange={(open) => setSystemLogs({...systemLogs, showErrorLogs: open})}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
              Error Logs
            </DialogTitle>
            <DialogDescription>System errors and warnings</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[100px]">Level</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="w-[120px]">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { time: new Date(Date.now() - 1800000), level: 'WARNING', message: 'License will expire in 30 days', details: 'Renew license before expiry', source: 'License Manager' },
                  { time: new Date(Date.now() - 3600000), level: 'ERROR', message: 'Failed to connect to backup server', details: 'Network timeout after 30 seconds', source: 'Backup Service' },
                  { time: new Date(Date.now() - 7200000), level: 'INFO', message: 'System maintenance completed', details: 'All services restored', source: 'System' },
                  { time: new Date(Date.now() - 10800000), level: 'ERROR', message: 'Database connection failed', details: 'Connection pool exhausted', source: 'Database' },
                  { time: new Date(Date.now() - 14400000), level: 'WARNING', message: 'High memory usage detected', details: 'Memory usage at 85%', source: 'System Monitor' },
                  { time: new Date(Date.now() - 18000000), level: 'INFO', message: 'User session expired', details: 'Session timeout after 24 hours', source: 'Auth Service' }
                ].map((log, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">
                      {log.time.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        log.level === 'ERROR' ? 'destructive' :
                        log.level === 'WARNING' ? 'default' :
                        'secondary'
                      } className="text-xs">
                        {log.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{log.message}</TableCell>
                    <TableCell className="text-sm text-gray-600">{log.details}</TableCell>
                    <TableCell className="text-sm">{log.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Details Dialog */}
      <Dialog open={systemLogs.showSessionDetails} onOpenChange={(open) => {
        setSystemLogs({...systemLogs, showSessionDetails: open});
        if (open && license.licenseKey) {
          // Fetch session details when dialog opens
          fetch(`/api/license/sessions?licenseKey=${license.licenseKey}`)
            .then(res => res.json())
            .then(data => {
              console.log('Session data received:', data);
              console.log('Sessions array:', data.sessions);
              setActiveSessions(data.sessions || []);
            })
            .catch(err => console.error('Failed to fetch sessions:', err));
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Active Sessions ({license.currentLogins}/{license.maxWebLogins === 999 ? '∞' : license.maxWebLogins})
            </DialogTitle>
            <DialogDescription>Current active sessions for your license</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">

            {activeSessions.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <div className="text-sm text-gray-500">No active sessions found</div>
              </div>
            ) : (
              activeSessions.map((session, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium">Session {session.sessionId}</div>
                      <div className="text-xs text-gray-500">{session.userAgent}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{session.ipAddress}</div>
                    <div className="text-xs text-gray-500">
                      Login: {new Date(session.loginTime).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Last Activity: {new Date(session.lastActivity).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Configuration Dialog */}
      <Dialog open={systemLogs.showEmailConfig} onOpenChange={(open) => setSystemLogs({...systemLogs, showEmailConfig: open})}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Email Configuration (SMTP)
            </DialogTitle>
            <DialogDescription>Configure SMTP settings for automated email reports</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input id="smtpHost" placeholder="smtp.gmail.com" defaultValue="smtp.gmail.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input id="smtpPort" type="number" placeholder="587" defaultValue="587" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpUser">Username</Label>
                <Input id="smtpUser" placeholder="your-email@gmail.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPassword">Password</Label>
                <Input id="smtpPassword" type="password" placeholder="App Password" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email</Label>
              <Input id="fromEmail" placeholder="hr@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name</Label>
              <Input id="fromName" placeholder="HR Department" defaultValue="Ministry of Finance HR" />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="enableSsl" defaultChecked />
              <Label htmlFor="enableSsl">Enable SSL/TLS</Label>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-2">Automated Email Reports Schedule:</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Daily Attendance Report</span>
                  <div className="flex items-center space-x-2">
                    <Input type="time" defaultValue="18:00" className="w-24 h-8 text-xs" />
                    <Switch defaultChecked />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Monthly Summary Report</span>
                  <div className="flex items-center space-x-2">
                    <Input type="time" defaultValue="09:00" className="w-24 h-8 text-xs" />
                    <Switch defaultChecked />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Overtime Approval Notifications</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-blue-600">Real-time</span>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSystemLogs({...systemLogs, showEmailConfig: false})}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              Save Email Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Database Management Dialog */}
      <Dialog open={systemLogs.showDbManagement} onOpenChange={(open) => setSystemLogs({...systemLogs, showDbManagement: open})}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Database Management
            </DialogTitle>
            <DialogDescription>Monitor and manage database operations</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Database Status */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Database Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium">Connection Status</div>
                      <div className="text-xs text-gray-500">Connected</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Database className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium">Database Size</div>
                      <div className="text-xs text-gray-500">45.8 MB</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Users className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="text-sm font-medium">Active Connections</div>
                      <div className="text-xs text-gray-500">3 / 20</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Database Operations */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Database Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-auto p-4">
                    <div className="flex items-center">
                      <RefreshCw className="w-5 h-5 mr-3 text-blue-600" />
                      <div className="text-left">
                        <div className="font-medium">Optimize Database</div>
                        <div className="text-sm text-gray-500">Rebuild indexes and optimize tables</div>
                      </div>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto p-4">
                    <div className="flex items-center">
                      <Activity className="w-5 h-5 mr-3 text-green-600" />
                      <div className="text-left">
                        <div className="font-medium">Analyze Performance</div>
                        <div className="text-sm text-gray-500">Run performance analysis</div>
                      </div>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto p-4">
                    <div className="flex items-center">
                      <Shield className="w-5 h-5 mr-3 text-purple-600" />
                      <div className="text-left">
                        <div className="font-medium">Create Backup</div>
                        <div className="text-sm text-gray-500">Manual database backup</div>
                      </div>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto p-4">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 mr-3 text-orange-600" />
                      <div className="text-left">
                        <div className="font-medium">Check Integrity</div>
                        <div className="text-sm text-gray-500">Verify data integrity</div>
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Operations */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { time: new Date(Date.now() - 300000), operation: 'Automatic backup completed', status: 'success', duration: '2.3s' },
                        { time: new Date(Date.now() - 1800000), operation: 'Database optimization', status: 'success', duration: '45.7s' },
                        { time: new Date(Date.now() - 3600000), operation: 'Index rebuild', status: 'success', duration: '12.1s' },
                        { time: new Date(Date.now() - 7200000), operation: 'Performance analysis', status: 'success', duration: '8.9s' }
                      ].map((op, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-sm">
                            {op.time.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm">{op.operation}</TableCell>
                          <TableCell>
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                              {op.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{op.duration}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSystemLogs({...systemLogs, showDbManagement: false})}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Management Dialog */}
      <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Backup Management</DialogTitle>
            <DialogDescription>Manage your system backups</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {backups.length === 0 ? (
              <p className="text-sm text-gray-500">No backups found.</p>
            ) : (
              backups.map((backup, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{backup.name}</p>
                    <p className="text-xs text-gray-500">{backup.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadBackupMutation.mutate(backup.name)}
                      disabled={downloadBackupMutation.isPending}
                    >
                      Download
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => restoreBackupMutation.mutate({ backupName: backup.name })}
                      disabled={restoreBackupMutation.isPending}
                    >
                      Restore
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Configuration Dialog */}
      <Dialog open={systemLogs.showEmailConfig} onOpenChange={(open) => setSystemLogs({...systemLogs, showEmailConfig: open})}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Email Configuration (SMTP)
            </DialogTitle>
            <DialogDescription>Configure SMTP settings and automated email reports</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* SMTP Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">SMTP Server Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input id="smtpHost" placeholder="smtp.gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input id="smtpPort" placeholder="587" type="number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">Username/Email</Label>
                    <Input id="smtpUser" placeholder="your-email@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">Password</Label>
                    <Input id="smtpPassword" placeholder="Enter password" type="password" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="smtpTLS" className="rounded" />
                  <Label htmlFor="smtpTLS">Use TLS/SSL</Label>
                </div>
                <Button variant="outline" size="sm">Test Connection</Button>
              </CardContent>
            </Card>

            {/* Automated Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Automated Email Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {[
                    { name: 'Daily Attendance Report', time: '08:00 AM', enabled: true },
                    { name: 'Weekly Summary Report', time: 'Monday 09:00 AM', enabled: false },
                    { name: 'Monthly Employee Report', time: '1st day 10:00 AM', enabled: true },
                    { name: 'Overtime Summary Report', time: 'Daily 06:00 PM', enabled: false },
                    { name: 'Leave Request Notifications', time: 'Immediate', enabled: true }
                  ].map((report, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{report.name}</div>
                        <div className="text-xs text-gray-500">Schedule: {report.time}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked={report.enabled} className="rounded" />
                        <Button variant="ghost" size="sm">Configure</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Database Management Dialog */}
      <Dialog open={systemLogs.showDbManagement} onOpenChange={(open) => setSystemLogs({...systemLogs, showDbManagement: open})}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Database Management
            </DialogTitle>
            <DialogDescription>Manage database operations and maintenance</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Database Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Database Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">Online</div>
                    <div className="text-sm text-green-500">Database Status</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">45.2 MB</div>
                    <div className="text-sm text-blue-500">Database Size</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">178</div>
                    <div className="text-sm text-purple-500">Total Records</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Database Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Database Operations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-auto p-4">
                    <div className="text-left">
                      <div className="font-medium">Create Backup</div>
                      <div className="text-sm text-gray-500">Backup all database tables</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto p-4">
                    <div className="text-left">
                      <div className="font-medium">Optimize Database</div>
                      <div className="text-sm text-gray-500">Clean and optimize tables</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto p-4">
                    <div className="text-left">
                      <div className="font-medium">Export Data</div>
                      <div className="text-sm text-gray-500">Export to CSV/Excel</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto p-4">
                    <div className="text-left">
                      <div className="font-medium">Database Schema</div>
                      <div className="text-sm text-gray-500">View table structure</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { operation: 'Database Backup', time: '2 hours ago', status: 'Success' },
                    { operation: 'Table Optimization', time: '1 day ago', status: 'Success' },
                    { operation: 'Data Export', time: '3 days ago', status: 'Success' }
                  ].map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border-b">
                      <div>
                        <div className="font-medium text-sm">{log.operation}</div>
                        <div className="text-xs text-gray-500">{log.time}</div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {log.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
