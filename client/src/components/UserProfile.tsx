import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Phone, MapPin, Calendar, Shield, Settings, Bell, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UserProfile() {
  const [user, setUser] = useState({
    id: "USR001",
    username: "admin",
    fullName: "System Administrator",
    email: "admin@mof.gov.lk",
    phone: "+94 11 234 5678",
    department: "IT Department",
    position: "System Administrator",
    role: "admin",
    joinDate: "2024-01-01",
    lastLogin: new Date().toISOString(),
    status: "active"
  });

  const [isEditing, setIsEditing] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    desktop: true,
    attendance: true,
    overtime: true,
    leaves: true
  });

  const { toast } = useToast();

  const handleSaveProfile = () => {
    // In a real app, this would make an API call
    toast({
      title: "Success",
      description: "Profile updated successfully",
    });
    setIsEditing(false);
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "outline" : "default"}
        >
          <Settings className="w-4 h-4 mr-2" />
          {isEditing ? "Cancel" : "Edit Profile"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Profile Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarFallback className="bg-blue-600 text-white text-lg">
                  {getInitials(user.fullName)}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg">{user.fullName}</h3>
              <p className="text-gray-600">{user.position}</p>
              <Badge variant={user.status === "active" ? "default" : "secondary"} className="mt-2">
                {user.status}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{user.phone}</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{user.department}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Joined {formatDate(user.joinDate)}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-500" />
                <span className="text-sm capitalize">{user.role} Access</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="lg:col-span-2">
          <Tabs defaultValue="personal" className="w-full">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={user.fullName}
                      onChange={(e) => setUser(prev => ({ ...prev, fullName: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={user.username}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email}
                      onChange={(e) => setUser(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={user.phone}
                      onChange={(e) => setUser(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={user.department}
                      onChange={(e) => setUser(prev => ({ ...prev, department: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={user.position}
                      onChange={(e) => setUser(prev => ({ ...prev, position: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                
                {isEditing && (
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveProfile}>
                      Save Changes
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-gray-600">Receive notifications via email</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.email}
                      onChange={(e) => handleNotificationChange('email', e.target.checked)}
                      className="rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">SMS Notifications</h4>
                      <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.sms}
                      onChange={(e) => handleNotificationChange('sms', e.target.checked)}
                      className="rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Desktop Notifications</h4>
                      <p className="text-sm text-gray-600">Show browser notifications</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.desktop}
                      onChange={(e) => handleNotificationChange('desktop', e.target.checked)}
                      className="rounded"
                    />
                  </div>

                  <hr className="my-4" />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Attendance Alerts</h4>
                      <p className="text-sm text-gray-600">Late arrivals and absences</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.attendance}
                      onChange={(e) => handleNotificationChange('attendance', e.target.checked)}
                      className="rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Overtime Notifications</h4>
                      <p className="text-sm text-gray-600">Overtime requests and approvals</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.overtime}
                      onChange={(e) => handleNotificationChange('overtime', e.target.checked)}
                      className="rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Leave Management</h4>
                      <p className="text-sm text-gray-600">Leave requests and approvals</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.leaves}
                      onChange={(e) => handleNotificationChange('leaves', e.target.checked)}
                      className="rounded"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Key className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Password Security</h4>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      Last changed: {formatDate(user.lastLogin)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <Button className="w-full">
                    Change Password
                  </Button>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900">Session Information</h4>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>Last Login: {formatDate(user.lastLogin)}</p>
                      <p>User ID: {user.id}</p>
                      <p>Role: {user.role}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}