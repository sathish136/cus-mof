import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Calendar, Users, Clock, TrendingUp, AlertTriangle, Settings, Eye, FileSpreadsheet, User, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function Reports() {
  const [reportType, setReportType] = useState("daily-attendance");
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [endDate, setEndDate] = useState(formatDate(new Date()));
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Automatically update date range for specific reports
  useEffect(() => {
    if (reportType === "monthly-ot") {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDate(firstDayOfMonth));
      setEndDate(formatDate(now)); // Current date for OT reports
    } else if (reportType === "monthly-attendance") {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(formatDate(firstDayOfMonth));
      setEndDate(formatDate(lastDayOfMonth)); // Full month for attendance sheet
    } else if (reportType === "individual-monthly" || reportType === "employee-punch-times" || reportType === "monthly-absence") {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDate(firstDayOfMonth));
      setEndDate(formatDate(now)); // Current date for new reports
    }
  }, [reportType]);

  // Format date to YYYY-MM-DD
  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    },
  });

  const { data: attendanceSummary } = useQuery({
    queryKey: ["/api/attendance/summary", startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/attendance/summary?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error("Failed to fetch attendance summary");
      return response.json();
    },
    enabled: reportType === "attendance",
  });

  const { data: leaveRequests } = useQuery({
    queryKey: ["/api/leave-requests"],
    queryFn: async () => {
      const response = await fetch("/api/leave-requests");
      if (!response.ok) throw new Error("Failed to fetch leave requests");
      return response.json();
    },
    enabled: reportType === "leave",
  });

  const { data: overtimeRequests } = useQuery({
    queryKey: ["/api/overtime-requests"],
    queryFn: async () => {
      const response = await fetch("/api/overtime-requests");
      if (!response.ok) throw new Error("Failed to fetch overtime requests");
      return response.json();
    },
    enabled: reportType === "overtime",
  });

  const { data: monthlyOvertimeData } = useQuery({
    queryKey: ["/api/overtime-eligible", startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/overtime-eligible?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error("Failed to fetch monthly overtime data");
      return response.json();
    },
    enabled: reportType === "monthly-ot",
  });

  const { data: employeeReportData } = useQuery({
    queryKey: ["/api/reports/employees", selectedEmployee],
    queryFn: async () => {
      const response = await fetch(`/api/reports/employees?employeeId=${selectedEmployee}`);
      if (!response.ok) throw new Error("Failed to fetch employee report");
      return response.json();
    },
    enabled: reportType === "employee",
  });

  const { data: monthlyAttendanceData, isLoading: isMonthlyAttendanceLoading } = useQuery({
    queryKey: ["/api/reports/monthly-attendance", startDate, endDate, selectedEmployee, selectedGroup],
    queryFn: async () => {
      const url = `/api/reports/monthly-attendance?startDate=${startDate}&endDate=${endDate}&employeeId=${selectedEmployee}&group=${selectedGroup}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch monthly attendance sheet");
      return response.json();
    },
    enabled: reportType === "monthly-attendance",
  });

  const { data: dailyAttendanceData, isLoading: isDailyAttendanceLoading } = useQuery({
    queryKey: ["/api/reports/daily-attendance", startDate, selectedEmployee, selectedGroup],
    queryFn: async () => {
      const params = new URLSearchParams({
        date: startDate,
        employeeId: selectedEmployee,
        group: selectedGroup,
      });
      const response = await fetch(`/api/reports/daily-attendance?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch daily attendance sheet");
      return response.json();
    },
    enabled: reportType === "daily-attendance",
  });

  const { data: dailyOtData, isLoading: isDailyOtLoading, error: dailyOtError } = useQuery({
    queryKey: ["/api/reports/daily-ot", startDate, selectedEmployee, selectedGroup],
    queryFn: async () => {
      const params = new URLSearchParams({
        date: startDate,
        employeeId: selectedEmployee,
        group: selectedGroup,
      });
      const response = await fetch(`/api/reports/daily-ot?${params.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch daily OT report: ${response.statusText}`);
      return response.json();
    },
    enabled: reportType === "daily-ot",
  });

  // New queries for additional reports
  const { data: lateArrivalData, isLoading: isLateArrivalLoading } = useQuery({
    queryKey: ["/api/reports/late-arrival", startDate, endDate, selectedEmployee, selectedGroup],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        employeeId: selectedEmployee,
        group: selectedGroup,
      });
      const response = await fetch(`/api/reports/late-arrival?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch late arrival report");
      return response.json();
    },
    enabled: reportType === "late-arrival",
  });

  const { data: halfDayData, isLoading: isHalfDayLoading } = useQuery({
    queryKey: ["/api/reports/half-day", startDate, endDate, selectedEmployee, selectedGroup],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        employeeId: selectedEmployee,
        group: selectedGroup,
      });
      const response = await fetch(`/api/reports/half-day?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch half day report");
      return response.json();
    },
    enabled: reportType === "half-day",
  });

  const { data: shortLeaveUsageData, isLoading: isShortLeaveUsageLoading } = useQuery({
    queryKey: ["/api/reports/short-leave-usage", startDate, endDate, selectedEmployee, selectedGroup],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        employeeId: selectedEmployee,
        group: selectedGroup,
      });
      const response = await fetch(`/api/reports/short-leave-usage?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch short leave usage report");
      return response.json();
    },
    enabled: reportType === "short-leave-usage",
  });

  // Fetch HR settings for displaying policy information
  const { data: groupSettings } = useQuery({
    queryKey: ["/api/group-working-hours"],
    queryFn: async () => {
      const response = await fetch("/api/group-working-hours");
      if (!response.ok) throw new Error("Failed to fetch group settings");
      return response.json();
    },
  });

  // Offer-Attendance Report query
  const { data: offerAttendanceData, isLoading: isOfferAttendanceLoading } = useQuery({
    queryKey: ["/api/reports/offer-attendance", startDate, endDate, selectedEmployee, selectedGroup],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        employeeId: selectedEmployee,
        group: selectedGroup,
      });
      const response = await fetch(`/api/reports/offer-attendance?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch offer-attendance report");
      return response.json();
    },
    enabled: reportType === "offer-attendance",
  });

  // Employee Punch Times Report query
  const { data: punchTimesData, isLoading: isPunchTimesLoading } = useQuery({
    queryKey: ["/api/reports/employee-punch-times", startDate, endDate, selectedEmployee],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        employeeId: selectedEmployee,
      });
      const response = await fetch(`/api/reports/employee-punch-times?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch punch times report");
      return response.json();
    },
    enabled: reportType === "employee-punch-times",
  });

  // Individual Employee Monthly Report query
  const { data: individualMonthlyData, isLoading: isIndividualMonthlyLoading } = useQuery({
    queryKey: ["/api/reports/individual-monthly", startDate, endDate, selectedEmployee],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        employeeId: selectedEmployee,
      });
      const response = await fetch(`/api/reports/individual-monthly?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch individual monthly report");
      return response.json();
    },
    enabled: reportType === "individual-monthly",
  });

  // Monthly Absence Report query
  const { data: monthlyAbsenceData, isLoading: isMonthlyAbsenceLoading } = useQuery({
    queryKey: ["/api/reports/monthly-absence", startDate, endDate, selectedGroup],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        group: selectedGroup,
      });
      const response = await fetch(`/api/reports/monthly-absence?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch monthly absence report");
      return response.json();
    },
    enabled: reportType === "monthly-absence",
  });

  const handlePreviewExport = () => {
    let data: any;
    let filename: string;
    
    switch (reportType) {
      case "monthly-attendance":
        data = monthlyAttendanceData;
        filename = `monthly-attendance-${startDate}-to-${endDate}`;
        break;
      case "daily-attendance":
        data = dailyAttendanceData;
        filename = `daily-attendance-${startDate}`;
        break;
      case "daily-ot":
        data = dailyOtData;
        filename = `daily-ot-${startDate}`;
        break;
      case "late-arrival":
        data = lateArrivalData;
        filename = `late-arrival-${startDate}-to-${endDate}`;
        break;
      case "half-day":
        data = halfDayData;
        filename = `half-day-${startDate}-to-${endDate}`;
        break;
      case "short-leave-usage":
        data = shortLeaveUsageData;
        filename = `short-leave-usage-${startDate}-to-${endDate}`;
        break;
      case "offer-attendance":
        data = offerAttendanceData;
        filename = `offer-attendance-${startDate}-to-${endDate}`;
        break;
      case "employee-punch-times":
        data = punchTimesData;
        filename = `employee-punch-times-${startDate}-to-${endDate}`;
        break;
      case "individual-monthly":
        data = individualMonthlyData;
        filename = `individual-monthly-${startDate}-to-${endDate}`;
        break;
      case "monthly-absence":
        data = monthlyAbsenceData;
        filename = `monthly-absence-${startDate}-to-${endDate}`;
        break;
      default:
        return;
    }

    if (!data || data.length === 0) {
      alert("No data available to export");
      return;
    }

    setPreviewData({ data, filename, reportType });
    setIsPreviewOpen(true);
  };

  const handleExportToExcel = () => {
    if (!previewData) return;
    
    const { data, filename, reportType } = previewData;
    
    try {
      // Get current date and time for report generation - same as PDF format
      const now = new Date();
      const reportGeneratedTime = now.toLocaleString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Get month and year for the report period
      const reportStartDate = new Date(startDate);
      const reportEndDate = new Date(endDate);
      const reportMonth = reportStartDate.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
      
      // Determine report title based on type
      let reportTitle = '';
      switch (reportType) {
        case 'daily-attendance':
          reportTitle = 'Daily Attendance Report';
          break;
        case 'daily-ot':
          reportTitle = 'Daily Overtime Report';
          break;
        case 'monthly-attendance':
          reportTitle = 'Monthly Attendance Sheet';
          break;
        case 'offer-attendance':
          reportTitle = '1/4 Offer-Attendance Report';
          break;
        case 'late-arrival':
          reportTitle = 'Late Arrival Report';
          break;
        case 'half-day':
          reportTitle = 'Half Day Report';
          break;
        case 'short-leave-usage':
          reportTitle = 'Short Leave Usage Report';
          break;
        case 'monthly-ot':
          reportTitle = 'Monthly Overtime Report';
          break;
        case 'employee-punch-times':
          reportTitle = 'Employee Punch Times Report';
          break;
        case 'individual-monthly':
          reportTitle = 'Individual Employee Monthly Report';
          break;
        case 'monthly-absence':
          reportTitle = 'Monthly Absence Report';
          break;
        default:
          reportTitle = 'Attendance Report';
      }

      const worksheetData = [];
      
      // Add header information - same as PDF format
      worksheetData.push(['MINISTRY OF FINANCE SRI LANKA']);
      worksheetData.push(['Human Resources Department']);
      worksheetData.push(['HR Attendance Management System']);
      worksheetData.push([]);
      worksheetData.push([reportTitle.toUpperCase()]);
      worksheetData.push([]);
      worksheetData.push([`Period: ${formatDate(new Date(startDate))} to ${formatDate(new Date(endDate))}`]);
      worksheetData.push([`Generated: ${reportGeneratedTime}`]);
      worksheetData.push([`Report Month: ${reportMonth}`, `Total Records: ${data.length}`]);
      worksheetData.push([]);
      worksheetData.push(['Applied Filters:']);
      worksheetData.push([`Employee: ${selectedEmployee === 'all' ? 'All Employees' : selectedEmployee}`, `Group: ${selectedGroup === 'all' ? 'All Groups' : selectedGroup === 'group_a' ? 'Group A' : 'Group B'}`]);
      worksheetData.push([]);
      
      let worksheet: any;
      
      if (reportType === "monthly-attendance") {
        // Special handling for monthly attendance sheet
        // Add headers
        const headers = ["S.No", "Employee ID", "Full Name", "Department", "Group"];
        const firstEmployee = data[0];
        if (firstEmployee?.dailyData) {
          const dateColumns = Object.keys(firstEmployee.dailyData).sort();
          dateColumns.forEach(date => {
            const dayNum = new Date(date).getDate();
            headers.push(dayNum.toString());
          });
          headers.push("Total Hours", "OT Hours", "Present Days");
        }
        worksheetData.push(headers);
        
        // Add data rows
        data.forEach((emp: any, index: number) => {
          const row = [
            index + 1,
            emp.employeeId,
            emp.fullName,
            emp.department || "",
            emp.employeeGroup === 'group_a' ? 'Group A' : 'Group B'
          ];
          
          if (emp.dailyData) {
            const dateColumns = Object.keys(emp.dailyData).sort();
            dateColumns.forEach(date => {
              const dayData = emp.dailyData[date];
              const status = dayData?.status || 'A';
              row.push(status);
            });
            row.push(emp.totalHours || '0.00', emp.overtimeHours || '0.00', emp.presentDays || 0);
          }
          
          worksheetData.push(row);
        });
        
        worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      } else if (reportType === "offer-attendance") {
        // Special handling for offer-attendance report
        const worksheetData = [];
        
        // Add headers
        const headers = [
          "Employee ID", "Full Name", "Group", "Total Offer Hours", "Working Days",
          "Avg Hours/Day", "Holiday Hours", "Saturday Hours",
          "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
        ];
        worksheetData.push(headers);
        
        // Add data rows
        data.forEach((record: any) => {
          const row = [
            record.employeeId,
            record.fullName,
            record.employeeGroup === 'group_a' ? 'Group A' : 'Group B',
            record.totalOfferHours,
            record.workingDays,
            record.averageOfferHoursPerDay,
            record.holidayHours,
            record.saturdayHours,
            record.weeklyBreakdown.monday,
            record.weeklyBreakdown.tuesday,
            record.weeklyBreakdown.wednesday,
            record.weeklyBreakdown.thursday,
            record.weeklyBreakdown.friday,
            record.weeklyBreakdown.saturday,
            record.weeklyBreakdown.sunday
          ];
          
          worksheetData.push(row);
        });
        
        worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      } else {
        // Standard table export
        worksheet = XLSX.utils.json_to_sheet(data);
      }
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(blob, `${filename}.xlsx`);
      setIsPreviewOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    }
  };

  const handleExportReport = async (format: string) => {
    try {
      // Get the current report data based on the selected report type
      let data: any;
      let filename: string;
      
      switch (reportType) {
        case "monthly-attendance":
          data = monthlyAttendanceData;
          filename = `monthly-attendance-${startDate}-to-${endDate}`;
          break;
        case "daily-attendance":
          data = dailyAttendanceData;
          filename = `daily-attendance-${startDate}`;
          break;
        case "daily-ot":
          data = dailyOtData;
          filename = `daily-ot-${startDate}`;
          break;
        case "late-arrival":
          data = lateArrivalData;
          filename = `late-arrival-${startDate}-to-${endDate}`;
          break;
        case "half-day":
          data = halfDayData;
          filename = `half-day-${startDate}-to-${endDate}`;
          break;
        case "short-leave-usage":
          data = shortLeaveUsageData;
          filename = `short-leave-usage-${startDate}-to-${endDate}`;
          break;
        case "offer-attendance":
          data = offerAttendanceData;
          filename = `offer-attendance-${startDate}-to-${endDate}`;
          break;
        case "monthly-ot":
          data = monthlyOvertimeData;
          filename = `monthly-overtime-${startDate}-to-${endDate}`;
          break;
        default:
          throw new Error("Unknown report type");
      }

      if (!data || data.length === 0) {
        alert("No data available to export");
        return;
      }

      if (format === "pdf") {
        exportToPDF(data, filename, reportType);
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    }
  };





  const getColumnClass = (header: string): string => {
    const lowerHeader = header.toLowerCase();
    if (lowerHeader.includes('employee') && lowerHeader.includes('id')) return 'col-employee-id';
    if (lowerHeader.includes('name') || lowerHeader.includes('full')) return 'col-name';
    if (lowerHeader.includes('department')) return 'col-department';
    if (lowerHeader.includes('group')) return 'col-group';
    if (lowerHeader.includes('date')) return 'col-date';
    if (lowerHeader.includes('time')) return 'col-time';
    if (lowerHeader.includes('hour')) return 'col-hours';
    if (lowerHeader.includes('status')) return 'col-status';
    if (lowerHeader.includes('reason')) return 'col-reason';
    return 'col-default';
  };

  const exportToPDF = (data: any[], filename: string, reportType: string) => {
    // Simple HTML to PDF conversion using browser print
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Get current date and time for report generation
    const now = new Date();
    const reportGeneratedTime = now.toLocaleString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Get month and year for the report period
    const reportStartDate = new Date(startDate);
    const reportEndDate = new Date(endDate);
    const reportMonth = reportStartDate.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    
    // Determine report title based on type
    let reportTitle = '';
    switch (reportType) {
      case 'daily-attendance':
        reportTitle = 'Daily Attendance Report';
        break;
      case 'daily-ot':
        reportTitle = 'Daily Overtime Report';
        break;
      case 'monthly-ot':
        reportTitle = 'Monthly Overtime Report';
        break;
      case 'monthly-attendance':
        reportTitle = 'Monthly Attendance Sheet';
        break;
      default:
        reportTitle = 'Attendance Report';
    }
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${filename}</title>
        <style>
          @page {
            size: A4;
            margin: 0.5in;
          }
          
          /* Enable layout options in print dialog */
          @media print {
            @page {
              size: auto;
              margin: 0.5in;
            }
            
            /* Portrait layout support */
            @page :left {
              margin-left: 0.6in;
              margin-right: 0.4in;
            }
            
            @page :right {
              margin-left: 0.4in;
              margin-right: 0.6in;
            }
          }
          
          /* Landscape support */
          @media print and (orientation: landscape) {
            @page {
              size: A4 landscape;
              margin: 0.4in;
            }
            body { font-size: 10px; }
            .company-name { font-size: 22px; }
            .department { font-size: 15px; }
            .report-title { font-size: 17px; }
            table { font-size: 9px; }
            th, td { padding: 5px 3px; }
          }
          
          /* Portrait support */
          @media print and (orientation: portrait) {
            @page {
              size: A4 portrait;
              margin: 0.5in;
            }
            body { font-size: 11px; }
            .company-name { font-size: 24px; }
            .department { font-size: 16px; }
            .report-title { font-size: 18px; }
            table { font-size: 10px; }
            th, td { padding: 6px 4px; }
          }
          
          * {
            box-sizing: border-box;
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            font-size: 11px;
            line-height: 1.4;
            width: 100%;
            max-width: 100%;
            color: black !important;
            background: white !important;
          }
          .container {
            width: 100%;
            max-width: 100%;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 20px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
            text-transform: uppercase;
          }
          .department {
            font-size: 16px;
            color: #374151;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .system-title {
            font-size: 14px;
            color: #6b7280;
            font-style: italic;
          }
          .report-details {
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            border: 2px solid #e2e8f0;
          }
          .report-title {
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 15px;
            text-align: center;
            text-transform: uppercase;
          }
          .report-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 13px;
          }
          .report-period, .generated-time {
            font-weight: bold;
            color: #4b5563;
          }
          .filters-info {
            background-color: #eff6ff;
            padding: 10px;
            border-radius: 5px;
            border-left: 4px solid #3b82f6;
            margin-top: 10px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            font-size: 11px;
          }
          th, td { 
            border: 1px solid #d1d5db; 
            padding: 8px; 
            text-align: left; 
            vertical-align: top;
          }
          th { 
            background-color: #f3f4f6; 
            font-weight: bold;
            color: #374151;
            text-align: center;
          }
          .status-present, .status-p { color: #10b981; font-weight: bold; }
          .status-absent, .status-a { color: #ef4444; font-weight: bold; }
          .status-late { color: #f59e0b; font-weight: bold; }
          .status-half-day, .status-hl { color: #8b5cf6; font-weight: bold; }
          .status-short-leave { color: #06b6d4; font-weight: bold; }
          .col-employee-id { width: 10%; text-align: center; }
          .col-name { width: 20%; text-align: left; }
          .col-department { width: 15%; text-align: left; }
          .col-group { width: 8%; text-align: center; }
          .col-date { width: 10%; text-align: center; }
          .col-time { width: 8%; text-align: center; }
          .col-hours { width: 8%; text-align: center; }
          .col-status { width: 12%; text-align: center; }
          .col-reason { width: 9%; text-align: left; }
          .col-default { width: auto; text-align: left; }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #6b7280;
            border-top: 2px solid #e5e7eb;
            padding-top: 20px;
          }
          .summary-stats {
            background-color: #fefce8;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #fbbf24;
          }
          .stats-row {
            display: flex;
            justify-content: space-around;
            font-weight: bold;
            color: #92400e;
          }
          @media print {
            body { 
              margin: 0; 
              padding: 15px;
              color: black !important;
              background: white !important;
              font-size: 10px;
            }
            .header { 
              page-break-inside: avoid;
              margin-bottom: 15px;
              padding-bottom: 10px;
            }
            .report-details { 
              page-break-inside: avoid;
              padding: 10px;
              margin-bottom: 15px;
            }
            .table-container {
              page-break-inside: auto;
              margin-top: 15px;
            }
            table { 
              font-size: 9px;
              page-break-inside: auto;
              width: 100%;
            }
            th, td { 
              padding: 4px 3px;
              font-size: 9px;
              border: 1px solid #000 !important;
            }
            th {
              background-color: #f5f5f5 !important;
              font-weight: bold !important;
            }
            tr { 
              page-break-inside: avoid; 
              page-break-after: auto; 
            }
            thead { 
              display: table-header-group; 
            }
            .footer { 
              margin-top: 20px; 
              padding-top: 15px;
              page-break-inside: avoid;
              border-top: 1px solid #000;
            }
            /* Ensure content fits on page */
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Ministry of Finance</div>
          <div class="company-name">Sri Lanka</div>
          <div class="department">Human Resources Department</div>
          <div class="system-title">Attendance Management System</div>
        </div>
        
        <div class="report-details">
          <div class="report-title">${reportTitle}</div>
          <div class="report-info">
            <span>Report Period: <span class="report-period">${reportType === 'monthly-attendance' ? reportMonth : startDate === endDate ? startDate : `${startDate} to ${endDate}`}</span></span>
            <span>Total Records: <strong>${data.length}</strong></span>
          </div>
          <div class="report-info">
            <span>Generated: <span class="generated-time">${reportGeneratedTime}</span></span>
            <span>Report Type: <strong>${reportTitle}</strong></span>
          </div>
          
          <div class="filters-info">
            <strong>Applied Filters:</strong><br>
            • Group Filter: <strong>${selectedGroup === 'all' ? 'All Groups' : selectedGroup === 'group_a' ? 'Group A' : selectedGroup === 'group_b' ? 'Group B' : selectedGroup}</strong><br>
            ${selectedEmployee !== 'all' ? `• Employee Filter: <strong>${selectedEmployee}</strong><br>` : ''}
            • Date Range: <strong>${reportType === 'monthly-attendance' ? `${startDate} to ${endDate}` : startDate}</strong>
          </div>
        </div>
        
        <div class="summary-stats">
          <div class="stats-row">
            <span>📊 Report Generated: ${reportGeneratedTime}</span>
            <span>📋 Total Entries: ${data.length}</span>
            <span>🏢 Department: Human Resources</span>
          </div>
        </div>
        
        <table>
    `;

    if (reportType === "monthly-attendance") {
      // Special handling for monthly attendance
      htmlContent += "<thead><tr><th class='col-employee-id'>Employee ID</th><th class='col-name'>Name</th><th class='col-department'>Department</th><th class='col-group'>Group</th>";
      
      const firstEmployee = data[0];
      if (firstEmployee?.dailyData) {
        const dateColumns = Object.keys(firstEmployee.dailyData).sort();
        dateColumns.forEach(date => {
          const dateObj = new Date(date);
          htmlContent += `<th class='col-date'>${dateObj.getDate()}</th>`;
        });
        htmlContent += "</tr></thead><tbody>";
        
        data.forEach(emp => {
          htmlContent += `<tr><td class='col-employee-id'>${emp.employeeId}</td><td class='col-name'>${emp.fullName}</td><td class='col-department'>${emp.department || ""}</td><td class='col-group'>${emp.employeeGroup || ""}</td>`;
          dateColumns.forEach(date => {
            const dayData = emp.dailyData[date];
            const status = dayData?.status || "A";
            const statusClass = status === "P" ? "status-p" : status === "A" ? "status-a" : "status-hl";
            htmlContent += `<td class="col-date ${statusClass}">${status}</td>`;
          });
          htmlContent += "</tr>";
        });
      }
    } else {
      // Standard table export with proper alignment
      const headers = Object.keys(data[0]);
      htmlContent += "<thead><tr>";
      headers.forEach((header, index) => {
        const columnClass = getColumnClass(header);
        htmlContent += `<th class="${columnClass}">${header.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}</th>`;
      });
      htmlContent += "</tr></thead><tbody>";
      
      data.forEach(row => {
        htmlContent += "<tr>";
        headers.forEach((header, index) => {
          const columnClass = getColumnClass(header);
          htmlContent += `<td class="${columnClass}">${row[header] || ""}</td>`;
        });
        htmlContent += "</tr>";
      });
    }

    htmlContent += `
        </tbody>
        </table>
        
        <div class="footer">
          <p><strong>Ministry of Finance - Sri Lanka</strong></p>
          <p>Human Resources Department | Attendance Management System</p>
          <p>Generated on ${reportGeneratedTime} | Confidential Document</p>
          <p><em>This report contains sensitive employee information and should be handled accordingly.</em></p>
        </div>
        
        <script>
          window.onload = function() {
            // Add CSS to show layout options
            const style = document.createElement('style');
            style.textContent = \`
              @media print {
                @page { size: auto; margin: 0.5in; }
              }
            \`;
            document.head.appendChild(style);
            
            // Delay to ensure rendering is complete
            setTimeout(() => {
              window.print();
            }, 500);
            
            // Close window after printing (optional)
            setTimeout(() => {
              if (window.opener) {
                window.close();
              }
            }, 2000);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const renderDailyAttendanceReport = () => {
    if (isDailyAttendanceLoading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">Loading daily attendance report...</div>
          </CardContent>
        </Card>
      );
    }
    
    if (!dailyAttendanceData || dailyAttendanceData.length === 0) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">No attendance data available for {new Date(startDate).toLocaleDateString()}.</div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Attendance Report - {new Date(startDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </CardTitle>
          <div className="text-sm text-gray-600">
            Total Records: {dailyAttendanceData.length}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-blue-50">
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">S.No</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Employee ID</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Name</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Group</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">In Time</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Out Time</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Total Hours</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Late</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Half Day</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Short Leave</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {dailyAttendanceData.map((record: any, index: number) => (
                  <tr key={`${record.employeeId}-${record.date}`} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-1.5 font-medium text-xs">{record.employeeId}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.fullName}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        record.employeeGroup === 'group_a' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {record.employeeGroup === 'group_a' ? 'Group A' : record.employeeGroup === 'group_b' ? 'Group B' : record.employeeGroup || 'N/A'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.inTime || '-'}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.outTime || '-'}</td>
                    <td className="border border-gray-300 px-2 py-1.5 font-medium text-xs">{record.totalHours || '0.00'}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        record.isLate ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {record.isLate ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        record.isHalfDay ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.isHalfDay ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        record.onShortLeave ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.onShortLeave ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                        record.status === 'Absent' ? 'bg-red-100 text-red-800' :
                        record.status === 'Present' ? 'bg-green-100 text-green-800' :
                        record.status === 'On Leave' ? 'bg-blue-100 text-blue-800' :
                        record.status === 'Half Day' ? 'bg-yellow-100 text-yellow-800' :
                        record.status === 'Late' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDailyOtReport = () => {
    if (isDailyOtLoading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">Loading daily overtime report...</div>
          </CardContent>
        </Card>
      );
    }
    
    if (dailyOtError) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-500">Error fetching data: {dailyOtError.message}</div>
          </CardContent>
        </Card>
      );
    }
    
    if (!dailyOtData || dailyOtData.length === 0) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">No employees eligible for overtime on {new Date(startDate).toLocaleDateString()}.</div>
          </CardContent>
        </Card>
      );
    }

    const totalOtHours = dailyOtData.reduce((sum: number, record: any) => sum + parseFloat(record.otHours || 0), 0);
    const approvedOtHours = dailyOtData.filter((r: any) => r.otApprovalStatus === 'Approved').reduce((sum: number, record: any) => sum + parseFloat(record.otHours || 0), 0);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Overtime Report - {new Date(startDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </CardTitle>
          <div className="flex gap-4 text-sm text-gray-600">
            <div>Total Records: {dailyOtData.length}</div>
            <div>Total OT Hours: {totalOtHours.toFixed(2)}</div>
            <div>Approved OT Hours: {approvedOtHours.toFixed(2)}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-orange-50">
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">S.No</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Employee ID</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Name</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Group</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Actual Hours</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Required Hours</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">OT Hours</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Remark</th>
                </tr>
              </thead>
              <tbody>
                {dailyOtData.map((record: any, index: number) => (
                  <tr key={`${record.employeeId}-${record.date}`} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-1.5 font-medium text-xs">{record.employeeId}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.fullName}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        record.employeeGroup === 'group_a' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {record.employeeGroup === 'group_a' ? 'Group A' : record.employeeGroup === 'group_b' ? 'Group B' : record.employeeGroup || 'N/A'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 font-medium text-xs">{record.actualHours || '0.00'}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.requiredHours || '0.00'}</td>
                    <td className="border border-gray-300 px-2 py-1.5 font-bold text-orange-600 text-xs">
                      {record.otHours > 0 ? record.otHours : '-'}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`text-xs ${
                        record.isWeekend ? 'text-orange-600 font-medium' : 'text-gray-600'
                      }`}>
                        {record.remark || 'Regular day overtime'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMonthlyOtReport = () => {
    if (!monthlyOvertimeData || monthlyOvertimeData.length === 0) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">No overtime records found for the selected period.</div>
          </CardContent>
        </Card>
      );
    }

    const totalOtHours = monthlyOvertimeData.reduce((sum: number, record: any) => sum + parseFloat(record.otHours || 0), 0);
    const weekendOtHours = monthlyOvertimeData.filter((r: any) => r.isWeekend).reduce((sum: number, record: any) => sum + parseFloat(record.otHours || 0), 0);
    const regularOtHours = totalOtHours - weekendOtHours;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Overtime Report - {new Date(startDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long' 
            })}
          </CardTitle>
          <div className="flex gap-4 text-sm text-gray-600">
            <div>Total Records: {monthlyOvertimeData.length}</div>
            <div>Total OT Hours: {totalOtHours.toFixed(2)}</div>
            <div>Weekend OT Hours: {weekendOtHours.toFixed(2)}</div>
            <div>Regular OT Hours: {regularOtHours.toFixed(2)}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-orange-50 to-orange-100 border-b-2 border-orange-200">
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">S.No</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Employee ID</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Name</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Group</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Actual Hours</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Required Hours</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">OT Hours</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Date</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Remark</th>
                </tr>
              </thead>
              <tbody>
                {monthlyOvertimeData.map((record: any, index: number) => (
                  <tr key={`${record.employeeId}-${record.date}`} className={`hover:bg-gray-50 ${record.isWeekend ? 'bg-orange-50' : 'bg-white'}`}>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-1.5 font-medium text-xs">{record.employeeId}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.fullName}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        record.employeeGroup === 'group_a' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {record.employeeGroup === 'group_a' ? 'Group A' : record.employeeGroup === 'group_b' ? 'Group B' : record.employeeGroup || 'N/A'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 font-medium text-xs">{record.actualHours || '0.00'}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.requiredHours || '0.00'}</td>
                    <td className="border border-gray-300 px-2 py-1.5 font-bold text-orange-600 text-xs">
                      {record.otHours > 0 ? record.otHours : '-'}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`text-xs ${
                        record.isWeekend ? 'text-orange-600 font-medium' : 'text-gray-600'
                      }`}>
                        {record.remark || 'Regular day overtime'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAttendanceReport = () => (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Attendance Summary Report</CardTitle>
      </CardHeader>
      <CardContent>
        {attendanceSummary && attendanceSummary.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceSummary.map((day: any, index: number) => {
                  const total = day.present + day.absent + day.late;
                  const rate = total > 0 ? ((day.present / total) * 100).toFixed(1) : "0.0";
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{day.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{day.present}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{day.absent}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{day.late}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No attendance data available for the selected period</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderLeaveReport = () => {
    if (leaveRequests.isLoading) return <div>Loading...</div>;
    if (leaveRequests.isError) return <div>Error fetching data</div>;
    if (!leaveRequests.data || leaveRequests.data.length === 0) {
      return <div>No leave requests found</div>;
    }

    return (
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Leave Requests Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {leaveRequests.data.filter((r: any) => r.status === "approved").length}
                </p>
                <p className="text-sm text-gray-600">Approved</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {leaveRequests.data.filter((r: any) => r.status === "pending").length}
                </p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {leaveRequests.data.filter((r: any) => r.status === "rejected").length}
                </p>
                <p className="text-sm text-gray-600">Rejected</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leave Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveRequests.data.slice(0, 10).map((request: any) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.employeeId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline">
                          {request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          className={
                            request.status === "approved" ? "bg-green-100 text-green-800" :
                            request.status === "rejected" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {request.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.days}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderOvertimeReport = () => {
    if (overtimeRequests.isLoading) return <div>Loading...</div>;
    if (overtimeRequests.isError) return <div>Error fetching data</div>;
    if (!overtimeRequests.data || overtimeRequests.data.length === 0) {
      return <div>No overtime requests found</div>;
    }

    return (
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Overtime Requests Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {overtimeRequests.data.filter((r: any) => r.status === "approved").reduce((sum: number, r: any) => sum + parseFloat(r.hours), 0).toFixed(1)}
                </p>
                <p className="text-sm text-gray-600">Approved Hours</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {overtimeRequests.data.filter((r: any) => r.status === "pending").length}
                </p>
                <p className="text-sm text-gray-600">Pending Requests</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {overtimeRequests.data.filter((r: any) => r.status === "approved").length}
                </p>
                <p className="text-sm text-gray-600">Approved Requests</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {overtimeRequests.data.slice(0, 10).map((request: any) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.employeeId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.hours}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          className={
                            request.status === "approved" ? "bg-green-100 text-green-800" :
                            request.status === "rejected" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {request.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEmployeeReport = () => {
    if (!employeeReportData || employeeReportData.isLoading) return <div>Loading...</div>;
    if (employeeReportData.error) return <div>Error: {employeeReportData.error.message}</div>;
    if (!employeeReportData.data || employeeReportData.data.length === 0) {
      return <div>No data available for the selected employee.</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-1 px-2 border-b text-left font-medium">Date</th>
              <th className="py-1 px-2 border-b text-left font-medium">In Time</th>
              <th className="py-1 px-2 border-b text-left font-medium">Out Time</th>
              <th className="py-1 px-2 border-b text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {employeeReportData.data.map((record: any) => (
              <tr key={record.date}>
                <td className="py-1 px-2 border-b">{record.date}</td>
                <td className="py-1 px-2 border-b">{record.inTime}</td>
                <td className="py-1 px-2 border-b">{record.outTime}</td>
                <td className="py-1 px-2 border-b">{record.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMonthlyAttendanceSheet = () => {
    if (isMonthlyAttendanceLoading) return <div>Loading...</div>;
    if (!monthlyAttendanceData || monthlyAttendanceData.length === 0) {
      return <div>No data available for the selected period.</div>;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    return (
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Monthly Attendance Sheet</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-800">
              {new Date(startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - Monthly Attendance Sheet
            </h2>
          </div>
          
          {monthlyAttendanceData.map((employee: any) => {
            // Calculate total hours and overtime for the employee
            const totalHours = Object.values(employee.dailyData || {}).reduce((sum: number, dayData: any) => {
              if (dayData?.workedHours) {
                const hours = parseFloat(dayData.workedHours);
                return sum + (isNaN(hours) ? 0 : hours);
              }
              return sum;
            }, 0);

            const totalOvertime = Object.values(employee.dailyData || {}).reduce((sum: number, dayData: any) => {
              if (dayData?.overtime && dayData.overtime !== '0' && dayData.overtime !== '0.00') {
                const hours = parseFloat(dayData.overtime.toString().replace('h', ''));
                return sum + (isNaN(hours) ? 0 : hours);
              }
              return sum;
            }, 0);

            const totalPresentDays = Object.values(employee.dailyData || {}).filter((dayData: any) => 
              dayData?.status === 'P'
            ).length;

            return (
              <div key={employee.id} className="mb-8">
                <div className="p-3 bg-blue-50 border border-gray-300">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div><strong>Name:</strong> {employee.fullName}</div>
                    <div><strong>EMP ID:</strong> {employee.employeeId}</div>
                    <div><strong>Department:</strong> {employee.department || 'Unassigned'}</div>
                    <div><strong>Group:</strong> {employee.employeeGroup === 'group_a' ? 'Group A' : employee.employeeGroup === 'group_b' ? 'Group B' : employee.employeeGroup}</div>
                  </div>
                </div>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-1 font-semibold text-left align-top w-28"></th>
                      {days.map(day => (
                        <th key={day.toISOString()} className="border p-1 text-center align-top">
                          <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div>{day.getDate()}</div>
                        </th>
                      ))}
                      <th className="border p-1 text-center align-top bg-blue-100">
                        <div><strong>Total</strong></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {['In Time', 'Out Time', 'Worked Hours', 'Status', 'Overtime'].map(field => (
                      <tr key={`${employee.id}-${field}`}>
                        <td className="border p-1 font-semibold">{field}</td>
                        {days.map(day => {
                          const dayData = employee.dailyData[day.getDate()];
                          let value = '';
                          if (dayData) {
                            switch (field) {
                              case 'In Time': value = dayData.inTime || ''; break;
                              case 'Out Time': value = dayData.outTime || ''; break;
                              case 'Worked Hours': value = dayData.workedHours || ''; break;
                              case 'Status': value = dayData.status || ''; break;
                              case 'Overtime': 
                                if (dayData.overtime && dayData.overtime !== '0' && dayData.overtime !== '0.00') {
                                  value = dayData.overtime.toString().replace('h', '');
                                } else {
                                  value = '-';
                                }
                                break;
                            }
                          } else if (field === 'Overtime') {
                            value = '-';
                          }
                          return (
                            <td key={`${employee.id}-${day.getDate()}-${field}`} className={`border p-1 text-center h-8 ${
                              field === 'Status' && value ? 
                                value === 'P' ? 'text-green-600 font-semibold' :
                                value === 'A' ? 'text-red-600 font-semibold' :
                                value === 'HL' ? 'text-blue-600 font-semibold' :
                                'text-gray-600'
                              : ''
                            }`}>
                              {value}
                            </td>
                          );
                        })}
                        <td className="border p-1 text-center bg-blue-100 font-semibold">
                          {field === 'Worked Hours' ? `${totalHours.toFixed(2)}h` : 
                           field === 'Status' ? `${totalPresentDays} days` :
                           field === 'Overtime' ? (totalOvertime > 0 ? totalOvertime.toFixed(2) : '-') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  // Late Arrival Report
  const renderLateArrivalReport = () => {
    if (isLateArrivalLoading) {
      return (
        <div className="p-6">
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
                <div className="text-lg text-gray-600">Loading late arrival report...</div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!lateArrivalData || lateArrivalData.length === 0) {
      return (
        <div className="p-6">
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-8">
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <div className="text-xl text-gray-500 mb-2">No Late Arrivals Found</div>
                <div className="text-gray-400">No late arrival data found for the selected period.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Calculate summary statistics
    const totalLateArrivals = lateArrivalData.length;
    const groupACount = lateArrivalData.filter((record: any) => record.employeeGroup === 'group_a').length;
    const groupBCount = lateArrivalData.filter((record: any) => record.employeeGroup === 'group_b').length;
    const halfDayCount = lateArrivalData.filter((record: any) => record.status === 'half_day').length;
    const avgMinutesLate = lateArrivalData.reduce((sum: number, record: any) => sum + (record.minutesLate || 0), 0) / totalLateArrivals;

    return (
      <div className="p-6">

        {/* Policy Settings */}
        {groupSettings && (
          <Card className="shadow-sm border border-gray-200 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Current Policy Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Badge variant="default" className="bg-blue-600">Group A</Badge>
                    Policy Rules
                  </h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    <div className="flex justify-between">
                      <span>Grace Period:</span>
                      <span className="font-medium">Until {groupSettings.groupA?.lateArrivalPolicy?.gracePeriodUntil}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Late Arrival:</span>
                      <span className="font-medium">After {groupSettings.groupA?.lateArrivalPolicy?.gracePeriodUntil}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Half Day Rule:</span>
                      <span className="font-medium">After {groupSettings.groupA?.lateArrivalPolicy?.halfDayAfter}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <Badge variant="secondary" className="bg-purple-600 text-white">Group B</Badge>
                    Policy Rules
                  </h4>
                  <div className="space-y-2 text-sm text-purple-700">
                    <div className="flex justify-between">
                      <span>Grace Period:</span>
                      <span className="font-medium">Until {groupSettings.groupB?.lateArrivalPolicy?.gracePeriodUntil}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Late Arrival:</span>
                      <span className="font-medium">After {groupSettings.groupB?.lateArrivalPolicy?.gracePeriodUntil}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Half Day Rule:</span>
                      <span className="font-medium">After {groupSettings.groupB?.lateArrivalPolicy?.halfDayAfter}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Late Arrival Records Table */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Late Arrival Records ({totalLateArrivals} entries)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">S.No</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Employee ID</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Employee Name</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Group</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Date</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Check In Time</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Status</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Minutes Late</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lateArrivalData.map((record: any, index: number) => (
                    <tr 
                      key={index} 
                      className={`hover:bg-gray-50 transition-colors duration-150 ${
                        record.status === 'half_day' ? 'bg-red-50' : 
                        record.employeeGroup === 'group_a' ? 'bg-blue-50' : 'bg-purple-50'
                      }`}
                    >
                      <td className="px-3 py-2 text-gray-700 font-medium border-r border-gray-200">{index + 1}</td>
                      <td className="px-3 py-2 text-gray-900 font-semibold border-r border-gray-200">{record.employeeId}</td>
                      <td className="px-3 py-2 text-gray-900 border-r border-gray-200">{record.fullName}</td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          record.employeeGroup === 'group_a' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}>
                          {record.employeeGroup === 'group_a' ? 'Group A' : 'Group B'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700 border-r border-gray-200">
                        {new Date(record.date).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="px-3 py-2 text-gray-700 font-mono border-r border-gray-200">
                        {record.checkInTime || 'N/A'}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          record.status === 'half_day' ? 'bg-red-100 text-red-800 border border-red-200' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          'bg-green-100 text-green-800 border border-green-200'
                        }`}>
                          {record.status === 'half_day' ? 'Half Day' : 
                           record.status === 'late' ? 'Late' : record.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-gray-900">
                          {record.minutesLate || 0} min
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Half Day Report
  const renderHalfDayReport = () => {
    if (isHalfDayLoading) {
      return (
        <div className="p-6">
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
                <div className="text-lg text-gray-600">Loading half day report...</div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!halfDayData || halfDayData.length === 0) {
      return (
        <div className="p-6">
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-8">
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <div className="text-xl text-gray-500 mb-2">No Half Day Records Found</div>
                <div className="text-gray-400">No half day records found for the selected period.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const totalHalfDayRecords = halfDayData.length;

    return (
      <div className="p-6">
        {/* Policy Settings */}
        {groupSettings && (
          <Card className="shadow-sm border border-gray-200 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Current Policy Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Badge variant="default" className="bg-blue-600">Group A</Badge>
                    Policy Rules
                  </h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    <div className="flex justify-between">
                      <span>Half Day Rule:</span>
                      <span className="font-medium">After {groupSettings.groupA?.lateArrivalPolicy?.halfDayAfter} before {groupSettings.groupA?.lateArrivalPolicy?.halfDayBefore}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <Badge variant="secondary" className="bg-purple-600 text-white">Group B</Badge>
                    Policy Rules
                  </h4>
                  <div className="space-y-2 text-sm text-purple-700">
                    <div className="flex justify-between">
                      <span>Half Day Rule:</span>
                      <span className="font-medium">After {groupSettings.groupB?.lateArrivalPolicy?.halfDayAfter} before {groupSettings.groupB?.lateArrivalPolicy?.halfDayBefore}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Half Day Records Table */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Half Day Records ({totalHalfDayRecords} entries)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">S.No</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Employee ID</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Employee Name</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Group</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Date</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Check In Time</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Check Out Time</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Reason</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Deduction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {halfDayData.map((record: any, index: number) => (
                    <tr 
                      key={index} 
                      className={`hover:bg-gray-50 transition-colors duration-150 ${
                        record.employeeGroup === 'group_a' ? 'bg-blue-50' : 'bg-purple-50'
                      }`}
                    >
                      <td className="px-3 py-2 text-gray-700 font-medium border-r border-gray-200">{index + 1}</td>
                      <td className="px-3 py-2 text-gray-900 font-semibold border-r border-gray-200">{record.employeeId}</td>
                      <td className="px-3 py-2 text-gray-900 border-r border-gray-200">{record.fullName}</td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          record.employeeGroup === 'group_a' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}>
                          {record.employeeGroup === 'group_a' ? 'Group A' : 'Group B'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700 border-r border-gray-200">
                        {new Date(record.date).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="px-3 py-2 text-gray-700 font-mono border-r border-gray-200">{record.checkInTime || 'N/A'}</td>
                      <td className="px-3 py-2 text-gray-700 font-mono border-r border-gray-200">{record.checkOutTime || 'N/A'}</td>
                      <td className="px-3 py-2 text-gray-700 border-r border-gray-200">{record.reason || 'Late Arrival'}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          Half Day
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Short Leave Usage Report
  const renderShortLeaveUsageReport = () => {
    if (isShortLeaveUsageLoading) {
      return (
        <div className="p-6">
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
                <div className="text-lg text-gray-600">Loading short leave usage report...</div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!shortLeaveUsageData || shortLeaveUsageData.length === 0) {
      return (
        <div className="p-6">
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-8">
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <div className="text-xl text-gray-500 mb-2">No Short Leave Usage Data Found</div>
                <div className="text-gray-400">No short leave usage data found for the selected period.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const totalShortLeaveRecords = shortLeaveUsageData.length;

    return (
      <div className="p-6">
        {/* Policy Settings */}
        {groupSettings && (
          <Card className="shadow-sm border border-gray-200 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Current Policy Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Badge variant="default" className="bg-blue-600">Group A</Badge>
                    Short Leave Policy
                  </h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    <div className="flex justify-between">
                      <span>Max per month:</span>
                      <span className="font-medium">{groupSettings.groupA?.shortLeavePolicy?.maxPerMonth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Morning:</span>
                      <span className="font-medium">{groupSettings.groupA?.shortLeavePolicy?.morningStart} - {groupSettings.groupA?.shortLeavePolicy?.morningEnd}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Evening:</span>
                      <span className="font-medium">{groupSettings.groupA?.shortLeavePolicy?.eveningStart} - {groupSettings.groupA?.shortLeavePolicy?.eveningEnd}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pre-approval:</span>
                      <span className="font-medium">{groupSettings.groupA?.shortLeavePolicy?.preApprovalRequired ? 'Required' : 'Not Required'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <Badge variant="secondary" className="bg-purple-600 text-white">Group B</Badge>
                    Short Leave Policy
                  </h4>
                  <div className="space-y-2 text-sm text-purple-700">
                    <div className="flex justify-between">
                      <span>Max per month:</span>
                      <span className="font-medium">{groupSettings.groupB?.shortLeavePolicy?.maxPerMonth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Morning:</span>
                      <span className="font-medium">{groupSettings.groupB?.shortLeavePolicy?.morningStart} - {groupSettings.groupB?.shortLeavePolicy?.morningEnd}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Evening:</span>
                      <span className="font-medium">{groupSettings.groupB?.shortLeavePolicy?.eveningStart} - {groupSettings.groupB?.shortLeavePolicy?.eveningEnd}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pre-approval:</span>
                      <span className="font-medium">{groupSettings.groupB?.shortLeavePolicy?.preApprovalRequired ? 'Required' : 'Not Required'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Short Leave Usage Records Table */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Short Leave Usage Records ({totalShortLeaveRecords} entries)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">S.No</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Employee ID</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Employee Name</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Group</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Month</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Used</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Remaining</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Usage %</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Last Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {shortLeaveUsageData.map((record: any, index: number) => (
                    <tr 
                      key={index} 
                      className={`hover:bg-gray-50 transition-colors duration-150 ${
                        record.employeeGroup === 'group_a' ? 'bg-blue-50' : 'bg-purple-50'
                      }`}
                    >
                      <td className="px-3 py-2 text-gray-700 font-medium border-r border-gray-200">{index + 1}</td>
                      <td className="px-3 py-2 text-gray-900 font-semibold border-r border-gray-200">{record.employeeId}</td>
                      <td className="px-3 py-2 text-gray-900 border-r border-gray-200">{record.fullName}</td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          record.employeeGroup === 'group_a' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}>
                          {record.employeeGroup === 'group_a' ? 'Group A' : 'Group B'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700 border-r border-gray-200">{record.month}</td>
                      <td className="px-3 py-2 text-center border-r border-gray-200">
                        <span className={`font-semibold ${
                          record.shortLeavesUsed >= record.maxAllowed ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {record.shortLeavesUsed} / {record.maxAllowed}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-semibold border-r border-gray-200">{record.remaining}</td>
                      <td className="px-3 py-2 text-center border-r border-gray-200">
                        <span className={`font-bold ${
                          record.usagePercentage >= 100 ? 'text-red-600' : 
                          record.usagePercentage >= 50 ? 'text-orange-600' : 
                          'text-green-600'
                        }`}>
                          {record.usagePercentage}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{record.lastUsed || 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Offer-Attendance Report
  const renderOfferAttendanceReport = () => {
    if (isOfferAttendanceLoading) {
      return (
        <div className="p-6">
          <Card className="shadow-lg border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50">
            <CardContent className="p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <div className="text-lg text-gray-600">Loading 1/4 Offer-Attendance Report...</div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!offerAttendanceData || offerAttendanceData.length === 0) {
      return (
        <div className="p-6">
          <Card className="shadow-lg border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50">
            <CardContent className="p-8">
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <div className="text-xl text-gray-500 mb-2">No Offer-Attendance Data Found</div>
                <div className="text-gray-400">No offer-attendance data available for the selected period.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const totalOfferHours = offerAttendanceData.reduce((sum: number, record: any) => sum + record.totalOfferHours, 0);
    const avgHoursPerEmployee = totalOfferHours / Math.max(offerAttendanceData.length, 1);
    const totalHolidayWeekendHours = offerAttendanceData.reduce((sum: number, record: any) => sum + record.holidayHours + record.saturdayHours, 0);

    return (
      <div className="p-6 space-y-6">
        {/* Simple Header */}
        <Card className="shadow-md border border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
              <Clock className="h-5 w-5 text-gray-600" />
              1/4 Offer-Attendance Report
            </CardTitle>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• <strong>Group A:</strong> Overtime calculated from 4:15 PM onwards</p>
              <p>• <strong>Group B:</strong> Overtime calculated from 4:45 PM onwards</p>
              <p>• Includes government holidays and Saturday work hours</p>
            </div>
          </CardHeader>
        </Card>

        {/* Simple Summary Information */}
        <Card className="shadow-md border border-gray-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span><strong className="text-gray-900">{offerAttendanceData.length}</strong> employees found</span>
                <span><strong className="text-gray-900">{totalOfferHours.toFixed(1)}h</strong> total offer hours</span>
                {totalOfferHours > 0 && (
                  <span><strong className="text-gray-900">{avgHoursPerEmployee.toFixed(1)}h</strong> average per employee</span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                Period: {formatDate(new Date(startDate))} to {formatDate(new Date(endDate))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="shadow-md border border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
              <FileText className="h-5 w-5" />
              Offer-Attendance Records ({offerAttendanceData.length} employees)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-200 border-b-2 border-gray-300">
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">S.No</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Employee ID</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Full Name</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Group</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Total Offer Hours</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Working Days</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Avg Hours/Day</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Holiday Hours</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Saturday Hours</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Mon</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Tue</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Wed</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Thu</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Fri</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r border-gray-200">Sat</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700">Sun</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {offerAttendanceData.map((record: any, index: number) => (
                    <tr 
                      key={index} 
                      className={`hover:bg-gray-50 transition-colors duration-150 ${
                        record.employeeGroup === 'group_a' ? 'bg-blue-25' : 'bg-purple-25'
                      }`}
                    >
                      <td className="px-2 py-2 text-gray-700 font-medium border-r border-gray-200">{index + 1}</td>
                      <td className="px-2 py-2 text-gray-900 font-semibold border-r border-gray-200">{record.employeeId}</td>
                      <td className="px-2 py-2 text-gray-900 border-r border-gray-200">{record.fullName}</td>
                      <td className="px-2 py-2 border-r border-gray-200">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          record.employeeGroup === 'group_a' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}>
                          {record.employeeGroup === 'group_a' ? 'Group A' : 'Group B'}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-bold text-indigo-600 border-r border-gray-200">
                        {record.totalOfferHours}h
                      </td>
                      <td className="px-2 py-2 text-gray-700 border-r border-gray-200">{record.workingDays}</td>
                      <td className="px-2 py-2 text-gray-700 border-r border-gray-200">{record.averageOfferHoursPerDay}h</td>
                      <td className="px-2 py-2 font-semibold text-green-600 border-r border-gray-200">
                        {record.holidayHours}h
                      </td>
                      <td className="px-2 py-2 font-semibold text-purple-600 border-r border-gray-200">
                        {record.saturdayHours}h
                      </td>
                      <td className="px-2 py-2 text-gray-700 border-r border-gray-200">{record.weeklyBreakdown.monday}h</td>
                      <td className="px-2 py-2 text-gray-700 border-r border-gray-200">{record.weeklyBreakdown.tuesday}h</td>
                      <td className="px-2 py-2 text-gray-700 border-r border-gray-200">{record.weeklyBreakdown.wednesday}h</td>
                      <td className="px-2 py-2 text-gray-700 border-r border-gray-200">{record.weeklyBreakdown.thursday}h</td>
                      <td className="px-2 py-2 text-gray-700 border-r border-gray-200">{record.weeklyBreakdown.friday}h</td>
                      <td className="px-2 py-2 font-semibold text-purple-600 border-r border-gray-200">{record.weeklyBreakdown.saturday}h</td>
                      <td className="px-2 py-2 font-semibold text-orange-600">{record.weeklyBreakdown.sunday}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Reports</h2>
        <div className="flex gap-3">
          <Button 
            onClick={handlePreviewExport}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition duration-200 ease-in-out flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel Export
          </Button>
          <Button 
            onClick={() => handleExportReport('pdf')}
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition duration-200 ease-in-out flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            PDF Export
          </Button>
        </div>
      </div>
      <Card className="rounded-lg shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">Reports</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-full rounded-md border-gray-300">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily-attendance">Daily Attendance Report</SelectItem>
                <SelectItem value="daily-ot">Daily OT Report</SelectItem>
                <SelectItem value="monthly-ot">Monthly OT Report</SelectItem>
                <SelectItem value="monthly-attendance">Monthly Attendance Sheet</SelectItem>
                <SelectItem value="late-arrival">Late Arrival Report</SelectItem>
                <SelectItem value="half-day">Half Day Report</SelectItem>
                <SelectItem value="short-leave-usage">Short Leave Usage Report</SelectItem>
                <SelectItem value="offer-attendance">1/4 Offer-Attendance Report</SelectItem>
                <SelectItem value="employee-punch-times">Employee Punch Times Report</SelectItem>
                <SelectItem value="individual-monthly">Individual Employee Monthly Report</SelectItem>
                <SelectItem value="monthly-absence">Monthly Absence Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(
            <>
              {reportType === "daily-attendance" || reportType === "daily-ot" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setEndDate(e.target.value);
                    }}
                  />
                </div>
              ) : reportType === "monthly-ot" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-full rounded-md border-gray-300">
                <SelectValue placeholder={reportType === "individual-monthly" ? "Select an employee (required)" : "Select employee"} />
              </SelectTrigger>
              <SelectContent>
                {reportType !== "individual-monthly" && <SelectItem value="all">All Employees</SelectItem>}
                {employees && employees.map((emp: any) => (
                  <SelectItem key={emp.employeeId} value={emp.employeeId}>
                    {emp.fullName} ({emp.employeeId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(reportType === "monthly-attendance" || reportType === "daily-ot" || reportType === "daily-attendance" || reportType === "offer-attendance" || reportType === "late-arrival" || reportType === "half-day" || reportType === "short-leave-usage" || reportType === "monthly-ot" || reportType === "employee-punch-times" || reportType === "individual-monthly" || reportType === "monthly-absence") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group</label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-full rounded-md border-gray-300">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  <SelectItem value="group_a">Group A</SelectItem>
                  <SelectItem value="group_b">Group B</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Content */}
      {reportType === "daily-attendance" && renderDailyAttendanceReport()}
      {reportType === "daily-ot" && renderDailyOtReport()}
      {reportType === "monthly-ot" && renderMonthlyOtReport()}
      {reportType === "monthly-attendance" && renderMonthlyAttendanceSheet()}
      {reportType === "late-arrival" && renderLateArrivalReport()}
      {reportType === "half-day" && renderHalfDayReport()}
      {reportType === "short-leave-usage" && renderShortLeaveUsageReport()}
      {reportType === "offer-attendance" && renderOfferAttendanceReport()}
      {reportType === "employee-punch-times" && renderEmployeePunchTimesReport()}
      {reportType === "individual-monthly" && renderIndividualMonthlyReport()}
      {reportType === "monthly-absence" && renderMonthlyAbsenceReport()}

      {/* Export Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileSpreadsheet className="h-6 w-6 text-green-600" />
              Export Preview - {previewData?.filename}
            </DialogTitle>
          </DialogHeader>
          
          {previewData && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="font-semibold text-gray-800 mb-2">Export Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Report Type:</span>
                    <span className="ml-2 text-gray-900 capitalize">{previewData.reportType.replace('-', ' ')}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Records:</span>
                    <span className="ml-2 text-gray-900">{previewData.data.length} entries</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Format:</span>
                    <span className="ml-2 text-gray-900">Excel (.xlsx)</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">File Size:</span>
                    <span className="ml-2 text-gray-900">~{Math.ceil(previewData.data.length * 0.1)}KB</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-lg">
                <div className="p-3 bg-gray-100 border-b">
                  <h4 className="font-semibold text-gray-800">Data Preview (First 5 records)</h4>
                </div>
                <div className="p-4 overflow-x-auto">
                  <table className="min-w-full text-xs border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        {previewData.reportType === 'monthly-attendance' ? (
                          <>
                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Employee ID</th>
                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Full Name</th>
                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Department</th>
                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Group</th>
                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Total Hours</th>
                          </>
                        ) : previewData.reportType === 'offer-attendance' ? (
                          <>
                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Employee ID</th>
                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Full Name</th>
                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Group</th>
                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Total Offer Hours</th>
                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Working Days</th>
                          </>
                        ) : (
                          Object.keys(previewData.data[0] || {}).slice(0, 5).map((key: string) => (
                            <th key={key} className="border border-gray-300 px-2 py-1 text-left font-semibold">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}
                            </th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.data.slice(0, 5).map((record: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {previewData.reportType === 'monthly-attendance' ? (
                            <>
                              <td className="border border-gray-300 px-2 py-1">{record.employeeId}</td>
                              <td className="border border-gray-300 px-2 py-1">{record.fullName}</td>
                              <td className="border border-gray-300 px-2 py-1">{record.department || ''}</td>
                              <td className="border border-gray-300 px-2 py-1">{record.employeeGroup || ''}</td>
                              <td className="border border-gray-300 px-2 py-1">{record.totalHours || 0}</td>
                            </>
                          ) : previewData.reportType === 'offer-attendance' ? (
                            <>
                              <td className="border border-gray-300 px-2 py-1">{record.employeeId}</td>
                              <td className="border border-gray-300 px-2 py-1">{record.fullName}</td>
                              <td className="border border-gray-300 px-2 py-1">{record.employeeGroup === 'group_a' ? 'Group A' : 'Group B'}</td>
                              <td className="border border-gray-300 px-2 py-1">{record.totalOfferHours}h</td>
                              <td className="border border-gray-300 px-2 py-1">{record.workingDays}</td>
                            </>
                          ) : (
                            Object.values(record).slice(0, 5).map((value: any, idx: number) => (
                              <td key={idx} className="border border-gray-300 px-2 py-1">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </td>
                            ))
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.data.length > 5 && (
                    <p className="text-gray-500 text-xs mt-2">... and {previewData.data.length - 5} more records</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleExportToExcel}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Excel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  // Employee Punch Times Report
  function renderEmployeePunchTimesReport() {
    if (isPunchTimesLoading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">Loading employee punch times report...</div>
          </CardContent>
        </Card>
      );
    }

    if (!punchTimesData || punchTimesData.length === 0) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">No punch time records found for the selected period.</div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Employee Punch Times Report
          </CardTitle>
          <div className="text-sm text-gray-600">
            Total Records: {punchTimesData.length}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-blue-50">
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">S.No</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Employee ID</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Name</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Date</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Punch Time</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Type</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Day</th>
                </tr>
              </thead>
              <tbody>
                {punchTimesData.map((record: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-1.5 font-medium text-xs">{record.employeeId}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.fullName}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.date}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs font-mono">{record.punchTime}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        record.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.dayOfWeek}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Individual Employee Monthly Report
  function renderIndividualMonthlyReport() {
    if (isIndividualMonthlyLoading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">Loading individual monthly report...</div>
          </CardContent>
        </Card>
      );
    }

    if (!individualMonthlyData || individualMonthlyData.length === 0) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">No monthly data found for the selected employee and period.</div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Individual Employee Monthly Report
          </CardTitle>
          <div className="text-sm text-gray-600">
            Employee: {individualMonthlyData[0]?.fullName} ({individualMonthlyData[0]?.employeeId})
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-blue-50">
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Date</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">In Time</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Out Time</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Hours</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Status</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Late</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Half Day</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Short Leave</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Notes</th>
                </tr>
              </thead>
              <tbody>
                {individualMonthlyData.map((record: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.date}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs font-mono">{record.inTime || '-'}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs font-mono">{record.outTime || '-'}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.totalHours || '0.00'}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                        record.status === 'Absent' ? 'bg-red-100 text-red-800' :
                        record.status === 'Present' ? 'bg-green-100 text-green-800' :
                        record.status === 'On Leave' ? 'bg-blue-100 text-blue-800' :
                        record.status === 'Half Day' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        record.isLate ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {record.isLate ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        record.isHalfDay ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.isHalfDay ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        record.onShortLeave ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.onShortLeave ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Monthly Absence Report
  function renderMonthlyAbsenceReport() {
    if (isMonthlyAbsenceLoading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">Loading monthly absence report...</div>
          </CardContent>
        </Card>
      );
    }

    if (!monthlyAbsenceData || monthlyAbsenceData.length === 0) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">No absence records found for the selected period.</div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Monthly Absence Report
          </CardTitle>
          <div className="text-sm text-gray-600">
            Total Absent Employees: {monthlyAbsenceData.length}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-red-50">
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">S.No</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Employee ID</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Name</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Department</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Group</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Total Absent Days</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Working Days</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-xs">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {monthlyAbsenceData.map((record: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-1.5 font-medium text-xs">{record.employeeId}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.fullName}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">{record.department || 'N/A'}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        record.employeeGroup === 'group_a' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {record.employeeGroup === 'group_a' ? 'Group A' : 'Group B'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs text-center">
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded font-bold">
                        {record.absentDays}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs text-center">{record.workingDays}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs text-center">
                      <span className={`px-2 py-1 rounded font-bold ${
                        record.attendancePercentage >= 90 ? 'bg-green-100 text-green-800' :
                        record.attendancePercentage >= 75 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.attendancePercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }
}
