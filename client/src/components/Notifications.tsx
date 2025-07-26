import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Users, 
  Settings,
  MoreVertical,
  Eye,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Notifications() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "attendance",
      title: "Late Arrival Alert",
      message: "John Doe arrived at 9:15 AM (15 minutes late)",
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      read: false,
      priority: "medium",
      icon: Clock
    },
    {
      id: 2,
      type: "leave",
      title: "Leave Request Submitted",
      message: "Sarah Wilson submitted a leave request for Dec 20-22",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
      priority: "high",
      icon: Calendar
    },
    {
      id: 3,
      type: "overtime",
      title: "Overtime Approved",
      message: "Your overtime request for Dec 15 has been approved",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      read: true,
      priority: "low",
      icon: CheckCircle
    },
    {
      id: 4,
      type: "system",
      title: "System Maintenance",
      message: "Scheduled maintenance on Dec 25, 2:00 AM - 4:00 AM",
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      read: false,
      priority: "high",
      icon: AlertCircle
    },
    {
      id: 5,
      type: "attendance",
      title: "Monthly Report Ready",
      message: "November attendance report is now available",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      read: true,
      priority: "medium",
      icon: Users
    }
  ]);

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "attendance": return "text-blue-600";
      case "leave": return "text-purple-600";
      case "overtime": return "text-orange-600";
      case "system": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filterNotifications = (filter: string) => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === filter);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
            Mark All Read
          </Button>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Notification Tabs */}
      <Card>
        <Tabs defaultValue="all" className="w-full">
          <CardHeader className="pb-3">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="leave">Leave</TabsTrigger>
              <TabsTrigger value="overtime">Overtime</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>
          </CardHeader>

          {["all", "unread", "attendance", "leave", "overtime", "system"].map(filter => (
            <TabsContent key={filter} value={filter}>
              <CardContent className="space-y-4">
                {filterNotifications(filter).length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No notifications found</p>
                  </div>
                ) : (
                  filterNotifications(filter).map((notification) => {
                    const IconComponent = notification.icon;
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          notification.read 
                            ? "bg-gray-50 border-gray-200" 
                            : "bg-white border-blue-200 shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className={`p-2 rounded-full ${
                              notification.read ? "bg-gray-200" : "bg-blue-100"
                            }`}>
                              <IconComponent 
                                className={`w-4 h-4 ${
                                  notification.read ? "text-gray-500" : getTypeColor(notification.type)
                                }`} 
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className={`font-medium ${
                                  notification.read ? "text-gray-700" : "text-gray-900"
                                }`}>
                                  {notification.title}
                                </h3>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getPriorityColor(notification.priority)}`}
                                >
                                  {notification.priority}
                                </Badge>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                )}
                              </div>
                              <p className={`text-sm ${
                                notification.read ? "text-gray-500" : "text-gray-700"
                              }`}>
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatTimeAgo(notification.timestamp)}
                              </p>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!notification.read && (
                                <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Mark as read
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => deleteNotification(notification.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Attendance Alerts</p>
                <p className="text-2xl font-bold text-blue-600">
                  {notifications.filter(n => n.type === "attendance").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Leave Notifications</p>
                <p className="text-2xl font-bold text-purple-600">
                  {notifications.filter(n => n.type === "leave").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Overtime Updates</p>
                <p className="text-2xl font-bold text-orange-600">
                  {notifications.filter(n => n.type === "overtime").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">System Alerts</p>
                <p className="text-2xl font-bold text-red-600">
                  {notifications.filter(n => n.type === "system").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}