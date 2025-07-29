import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Calendar, Users, Clock, TrendingUp, AlertTriangle, Settings, Eye, FileSpreadsheet, User, UserX, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

  // Individual 1/4 Offer Report query
  const { data: individualOfferData, isLoading: isIndividualOfferLoading } = useQuery({
    queryKey: ["/api/reports/individual-offer-attendance", startDate, endDate, selectedEmployee],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        employeeId: selectedEmployee,
      });
      const response = await fetch(`/api/reports/individual-offer-attendance?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch individual offer report");
      return response.json();
    },
    enabled: reportType === "individual-offer" && selectedEmployee !== "all",
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
      case "monthly-ot":
        data = monthlyOvertimeData;
        filename = `monthly-ot-${startDate}-to-${endDate}`;
        break;
      default:
        return;
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      alert("No data available to export");
      return;
    }

    setPreviewData({ data, filename, reportType });
    setIsPreviewOpen(true);
  };

  const handleExportToExcel = () => {
    if (!previewData) {
      console.error('No preview data available');
      alert("No preview data available for export");
      return;
    }
    
    const { data, filename, reportType } = previewData;
    
    try {
      // Additional validation
      if (!data) {
        console.error('Export data is null or undefined');
        alert("Export data is not available");
        return;
      }
      
      if (Array.isArray(data) && data.length === 0) {
        console.error('Export data array is empty');
        alert("No data records found to export");
        return;
      }
      
      console.log(`Exporting ${reportType} with ${Array.isArray(data) ? data.length : 'non-array'} records`);
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
        case 'individual-offer':
          reportTitle = 'Individual 1/4 Offer Report';
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
        // Create detailed monthly attendance sheet matching your exact format
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days: Date[] = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          days.push(new Date(d));
        }

        // Create a professional table format for each employee
        data.forEach((emp: any, empIndex: number) => {
          // Employee header section with borders
          worksheetData.push([]);
          worksheetData.push([]);
          
          // Main employee info header
          const empHeaderRow = [`EMPLOYEE: ${emp.fullName} | ID: ${emp.employeeId} | DEPT: ${emp.department || 'N/A'} | GROUP: ${emp.employeeGroup === 'group_a' ? 'A' : 'B'}`];
          for (let i = 1; i < days.length + 1; i++) {
            empHeaderRow.push('');
          }
          worksheetData.push(empHeaderRow);
          
          // Create table structure with proper headers
          worksheetData.push([]);
          
          // Day names header
          const dayNamesRow = [''];
          days.forEach(day => {
            const dayName = day.toLocaleDateString('en-GB', { weekday: 'short' });
            dayNamesRow.push(dayName.toUpperCase());
          });
          worksheetData.push(dayNamesRow);
          
          // Date numbers header  
          const dateNumbersRow = [''];
          days.forEach(day => {
            dateNumbersRow.push(day.getDate().toString().padStart(2, '0'));
          });
          worksheetData.push(dateNumbersRow);
          
          // Separator row
          const separatorRow = Array(days.length + 1).fill('═══════');
          worksheetData.push(separatorRow);
          
          // Data rows with proper structure
          const timeRows = [
            { label: 'IN TIME', key: 'inTime' },
            { label: 'OUT TIME', key: 'outTime' }, 
            { label: 'WORKED HRS', key: 'workedHours' },
            { label: 'STATUS', key: 'status' },
            { label: 'OVERTIME', key: 'overtimeHours' }
          ];
          
          timeRows.forEach(timeRow => {
            const row = [timeRow.label];
            days.forEach(day => {
              const dayKey = day.getDate();
              const dayData = emp.dailyData?.[dayKey];
              
              let value = '-';
              if (dayData) {
                switch (timeRow.key) {
                  case 'inTime':
                    value = dayData.inTime || '-';
                    break;
                  case 'outTime':
                    value = dayData.outTime || '-';
                    break;
                  case 'workedHours':
                    value = dayData.workedHours || '00:00';
                    break;
                  case 'status':
                    value = dayData.status || 'A';
                    break;
                  case 'overtimeHours':
                    if (dayData.overtimeHours && parseFloat(dayData.overtimeHours) > 0) {
                      value = parseFloat(dayData.overtimeHours).toFixed(2) + 'h';
                    } else {
                      value = '-';
                    }
                    break;
                }
              }
              row.push(value);
            });
            worksheetData.push(row);
          });
          
          // Bottom border
          const bottomBorderRow = Array(days.length + 1).fill('═══════');
          worksheetData.push(bottomBorderRow);
          
          // Add spacing between employees
          worksheetData.push([]);
          worksheetData.push([]);
        });
        
        worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // Set optimal column widths
        const columnWidths = [
          { wch: 12 }, // First column for labels
        ];
        
        // Set consistent width for day columns
        days.forEach(() => {
          columnWidths.push({ wch: 10 }); // Day columns - wider for better readability
        });
        
        worksheet['!cols'] = columnWidths;
        
        // Enhanced cell styling with borders and colors
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z200');
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
            if (!worksheet[cellAddress]) continue;
            
            const cellValue = worksheet[cellAddress].v?.toString() || '';
            
            // Style employee header rows
            if (cellValue.includes('EMPLOYEE:')) {
              worksheet[cellAddress].s = {
                font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: '1E3A8A' } },
                border: {
                  top: { style: 'thick', color: { rgb: '000000' } },
                  bottom: { style: 'thick', color: { rgb: '000000' } },
                  left: { style: 'thick', color: { rgb: '000000' } },
                  right: { style: 'thick', color: { rgb: '000000' } }
                }
              };
            }
            
            // Style day names and date headers
            else if (['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].includes(cellValue) ||
                     /^\d{2}$/.test(cellValue)) {
              worksheet[cellAddress].s = {
                font: { bold: true, sz: 11 },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: 'E5E7EB' } },
                border: {
                  top: { style: 'medium', color: { rgb: '000000' } },
                  bottom: { style: 'medium', color: { rgb: '000000' } },
                  left: { style: 'medium', color: { rgb: '000000' } },
                  right: { style: 'medium', color: { rgb: '000000' } }
                }
              };
            }
            
            // Style time row labels
            else if (['IN TIME', 'OUT TIME', 'WORKED HRS', 'STATUS', 'OVERTIME'].includes(cellValue)) {
              const bgColors = {
                'IN TIME': 'FEF3C7',
                'OUT TIME': 'D1FAE5', 
                'WORKED HRS': 'DBEAFE',
                'STATUS': 'F3F4F6',
                'OVERTIME': 'FED7AA'
              };
              worksheet[cellAddress].s = {
                font: { bold: true, sz: 10 },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: bgColors[cellValue as keyof typeof bgColors] } },
                border: {
                  top: { style: 'medium', color: { rgb: '000000' } },
                  bottom: { style: 'medium', color: { rgb: '000000' } },
                  left: { style: 'thick', color: { rgb: '000000' } },
                  right: { style: 'medium', color: { rgb: '000000' } }
                }
              };
            }
            
            // Style separator rows
            else if (cellValue.includes('═══')) {
              worksheet[cellAddress].s = {
                font: { bold: true },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: '6B7280' } },
                border: {
                  top: { style: 'thick', color: { rgb: '000000' } },
                  bottom: { style: 'thick', color: { rgb: '000000' } },
                  left: { style: 'thick', color: { rgb: '000000' } },
                  right: { style: 'thick', color: { rgb: '000000' } }
                }
              };
            }
            
            // Style data cells
            else if (C > 0 && cellValue && cellValue !== '') {
              worksheet[cellAddress].s = {
                font: { sz: 10 },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: 'FFFFFF' } },
                border: {
                  top: { style: 'thin', color: { rgb: '9CA3AF' } },
                  bottom: { style: 'thin', color: { rgb: '9CA3AF' } },
                  left: { style: 'thin', color: { rgb: '9CA3AF' } },
                  right: { style: 'thin', color: { rgb: '9CA3AF' } }
                }
              };
            }
          }
        }
      } else if (reportType === "offer-attendance") {
        // Special handling for offer-attendance report
        worksheetData.length = 0; // Clear previous data
        
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
      console.error("Excel export failed:", error);
      console.error("Report type:", reportType);
      console.error("Data structure:", data);
      alert(`Excel export failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
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
        case "individual-offer":
          data = individualOfferData;
          filename = `individual-offer-${startDate}-to-${endDate}`;
          break;
        default:
          throw new Error("Unknown report type");
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        alert("No data available to export");
        return;
      }

      if (format === "pdf") {
        exportToPDF(data, filename, reportType);
      }
    } catch (error) {
      console.error("PDF export failed:", error);
      alert(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
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
      case 'employee-punch-times':
        reportTitle = 'Employee Punch Times Report';
        break;
      case 'individual-monthly':
        reportTitle = 'Individual Employee Monthly Report';
        break;
      case 'monthly-absence':
        reportTitle = 'Monthly Absence Report';
        break;
      case 'individual-offer':
        reportTitle = 'Individual 1/4 Offer Report';
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
            <span>Total Records: <strong>${reportType === 'individual-offer' ? (data && typeof data === 'object' && !Array.isArray(data) && data.dailyData ? data.dailyData.length : 0) : Array.isArray(data) ? data.length : 0}</strong></span>
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
            <span>📋 Total Entries: ${reportType === 'individual-offer' ? (data && typeof data === 'object' && !Array.isArray(data) && data.dailyData ? data.dailyData.length : 0) : Array.isArray(data) ? data.length : 0}</span>
            <span>🏢 Department: Human Resources</span>
          </div>
        </div>
        
        <table>
    `;

    if (reportType === "individual-offer") {
      // Special handling for Individual 1/4 Offer Report - Treasury Format
      // Type guard for individual offer data
      const isIndividualOfferData = (data: any): data is { employee: any; period: any; dailyData: any[]; summary: any } => {
        return data && typeof data === 'object' && !Array.isArray(data) && 
               data.employee && data.period && data.dailyData && data.summary;
      };

      if (!isIndividualOfferData(data)) {
        console.error('Invalid data structure for individual offer report');
        alert('Invalid data structure for PDF export');
        return;
      }

      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      };

      const formatDateLong = (dateStr: string) => {
        const date = new Date(dateStr);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `${formatDate(dateStr)} ${days[date.getDay()]}`;
      };

      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${filename}</title>
          <style>
            @page { size: A4; margin: 0.5in; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 12px; 
              line-height: 1.4; 
              margin: 0; 
              padding: 20px; 
              color: black;
            }
            .treasury-header {
              text-align: center;
              border: 2px solid black;
              margin-bottom: 20px;
            }
            .header-section {
              padding: 10px;
              border-bottom: 1px solid black;
            }
            .employee-info {
              padding: 15px;
              border-bottom: 1px solid black;
            }
            .attendance-table {
              padding: 15px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid black;
              padding: 6px;
              text-align: center;
              font-size: 11px;
            }
            th {
              background-color: #e9ecef;
              font-weight: bold;
            }
            .summary-section {
              margin-top: 15px;
              padding: 10px;
              border: 1px solid black;
              background-color: #f8f9fa;
              float: right;
              width: 300px;
            }
            .signature-section {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              text-align: center;
              width: 250px;
            }
            .signature-line {
              border-top: 1px solid black;
              padding-top: 5px;
              margin-top: 40px;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              @page { margin: 0.4in; }
            }
          </style>
        </head>
        <body>
          <div class="treasury-header">
            <div class="header-section">
              <div style="font-size: 10px; margin-bottom: 5px;">gADG</div>
              <div style="font-weight: bold; font-size: 13px;">Project Management and Monitoring</div>
              <div style="font-size: 16px; font-weight: bold; margin-top: 10px; text-decoration: underline;">
                Applying for 1/4 allowance of Treasury Officers
              </div>
            </div>

            <div class="employee-info">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="text-align: left;">
                  <div style="margin-bottom: 5px;">
                    <strong>Emp Id :</strong> ${data.employee.employeeId}
                  </div>
                  <div style="margin-bottom: 5px;">
                    <strong>Name :</strong> ${data.employee.fullName}
                  </div>
                  <div style="margin-bottom: 15px;">
                    <strong>Period :</strong> ${formatDate(data.period.startDate)} to ${formatDate(data.period.endDate)}
                  </div>
                </div>
                <div style="border: 1px solid black; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
                  <strong style="font-size: 12px;">1/4</strong>
                </div>
              </div>

              <div style="text-align: left; font-size: 11px; margin-bottom: 10px;">
                I, _________________________________ who serve as a ___________________________ at the Department of _______________________________, 
                Object Management and Monitoring have completed an additional time period of ________ hours in the month of ${data.period.startDate ? new Date(data.period.startDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : ''}.
              </div>
              <div style="text-align: left; font-size: 11px;">
                Therefore, I kindly request you to grant me Rs. _____________ as the 1/4 allowance of Treasury Officers according to the proposal.
              </div>
            </div>

            <div class="attendance-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>In Time</th>
                    <th>Out Time</th>
                    <th>Status 1</th>
                    <th>Status 2</th>
                    <th style="background-color: #d1ecf1;">1/4 Hours</th>
                  </tr>
                </thead>
                <tbody>`;

      // Add daily data rows
      if (data.dailyData && Array.isArray(data.dailyData)) {
        data.dailyData.forEach((day: any, index: number) => {
          htmlContent += `
                  <tr style="${index % 2 === 0 ? 'background-color: #f8f9fa;' : ''}">
                    <td>${formatDateLong(day.date)}</td>
                    <td>${day.inTime || '-'}</td>
                    <td>${day.outTime || '-'}</td>
                    <td>${day.status1 || '-'}</td>
                    <td>${day.status2 || '-'}</td>
                    <td style="font-weight: bold; background-color: #e7f3ff;">${day.offerHours || '0.00'}</td>
                  </tr>`;
        });
      }

      htmlContent += `
                </tbody>
              </table>

              <div class="summary-section">
                <div style="font-weight: bold; margin-bottom: 10px;">
                  Total: ${parseFloat(data.summary?.totalOfferHours || 0).toFixed(1)} hours
                </div>
                <div style="font-size: 10px; margin-bottom: 5px;">
                  Basic salary: ___________________
                </div>
                <div style="font-size: 10px; margin-bottom: 5px;">
                  Hour rate for 1/4 hours: ___________________
                </div>
                <div style="font-size: 10px;">
                  Total allowances for month of ${data.period.startDate ? new Date(data.period.startDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : ''}: ___________________
                </div>
              </div>

              <div style="clear: both;"></div>

              <div class="signature-section">
                <div class="signature-box">
                  <div class="signature-line">
                    <div style="font-weight: bold; font-size: 11px;">Signature of the requesting officer</div>
                    <div style="font-size: 10px; margin-top: 10px;">Date: ___________________</div>
                  </div>
                </div>
                <div class="signature-box">
                  <div class="signature-line">
                    <div style="font-weight: bold; font-size: 11px;">Signature of the checked officer</div>
                    <div style="font-size: 10px; margin-top: 10px;">Date: ___________________</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>`;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
      return;
    } else if (reportType === "monthly-attendance") {
      // Special handling for monthly attendance with timing details
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days: Date[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
      }

      // Create professional PDF format 
      data.forEach((emp: any, empIndex: number) => {
        // Calculate totals for this employee
        const totalWorkedHours = Object.values(emp.dailyData || {}).reduce((sum: number, day: any) => {
          return sum + (parseFloat(day.workingHours) || 0);
        }, 0);
        
        const totalOvertimeHours = Object.values(emp.dailyData || {}).reduce((sum: number, day: any) => {
          return sum + (parseFloat(day.overtimeHours) || 0);
        }, 0);
        
        htmlContent += `
          <div style="margin-bottom: 40px; page-break-inside: avoid; border: 2px solid #000000; background: #ffffff;">
            
            <!-- Professional Employee Header -->
            <div style="background: #f8f9fa; border-bottom: 2px solid #000000; padding: 15px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: left; font-weight: bold; font-size: 14px; color: #000000;">
                    MONTHLY ATTENDANCE RECORD
                  </td>
                  <td style="text-align: right; font-size: 12px; color: #000000;">
                    Period: ${new Date(startDate).toLocaleDateString('en-GB')} - ${new Date(endDate).toLocaleDateString('en-GB')}
                  </td>
                </tr>
              </table>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr>
                  <td style="padding: 5px; font-size: 12px; font-weight: bold; width: 25%;">Employee Name: ${emp.fullName}</td>
                  <td style="padding: 5px; font-size: 12px; font-weight: bold; width: 25%;">Employee ID: ${emp.employeeId}</td>
                  <td style="padding: 5px; font-size: 12px; font-weight: bold; width: 25%;">Department: ${emp.department || 'N/A'}</td>
                  <td style="padding: 5px; font-size: 12px; font-weight: bold; width: 25%;">Group: ${emp.employeeGroup === 'group_a' ? 'A' : 'B'}</td>
                </tr>
              </table>
            </div>
            
            <!-- Professional Attendance Data Table -->
            <div style="padding: 15px;">
              <table style="width: 100%; border-collapse: collapse; font-family: 'Arial', sans-serif; font-size: 9px;">
                
                <!-- Professional Header -->
                <thead>
                  <tr style="background: #e9ecef;">
                    <th style="border: 1px solid #000000; padding: 8px; text-align: center; font-weight: bold; font-size: 10px; background: #e9ecef; color: #000000; width: 100px;">
                      TIME DETAILS
                    </th>`;
        
        days.forEach(day => {
          const dayName = day.toLocaleDateString('en-GB', { weekday: 'short' });
          htmlContent += `
                  <th style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; font-size: 9px; background: #e9ecef; color: #000000; min-width: 50px;">
                    ${dayName.toUpperCase()}
                  </th>`;
        });
        
        htmlContent += `
                </tr>
                
                <!-- Date Numbers Row -->
                <tr style="background: #f8f9fa;">
                  <th style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; background: #f8f9fa; color: #000000; font-size: 9px;">
                    DATE
                  </th>`;
        
        days.forEach(day => {
          htmlContent += `
                  <th style="border: 1px solid #000000; padding: 4px; text-align: center; font-weight: bold; font-size: 9px; background: #f8f9fa; color: #000000;">
                    ${day.getDate().toString().padStart(2, '0')}
                  </th>`;
        });
        
        htmlContent += `
                </tr>
              </thead>
              
              <tbody>`;
        
        // Time rows with distinct styling
        const timeRowConfigs = [
          { 
            label: 'IN TIME', 
            key: 'inTime', 
            bgColor: '#fef3c7', 
            labelBg: '#f59e0b', 
            textColor: '#92400e' 
          },
          { 
            label: 'OUT TIME', 
            key: 'outTime', 
            bgColor: '#d1fae5', 
            labelBg: '#10b981', 
            textColor: '#065f46' 
          },
          { 
            label: 'WORKED HRS', 
            key: 'workedHours', 
            bgColor: '#dbeafe', 
            labelBg: '#3b82f6', 
            textColor: '#1e40af' 
          },
          { 
            label: 'STATUS', 
            key: 'status', 
            bgColor: '#f3f4f6', 
            labelBg: '#6b7280', 
            textColor: '#374151' 
          },
          { 
            label: 'OVERTIME', 
            key: 'overtimeHours', 
            bgColor: '#fed7aa', 
            labelBg: '#f97316', 
            textColor: '#c2410c' 
          }
        ];
        
        timeRowConfigs.forEach(config => {
          htmlContent += `
                <tr style="background-color: ${config.bgColor};">
                  <td style="border: 1px solid #000000; padding: 8px; font-weight: bold; text-align: center; background-color: ${config.labelBg}; color: white; font-size: 10px;">
                    ${config.label}
                  </td>`;
          
          days.forEach(day => {
            const dayKey = day.getDate();
            const dayData = emp.dailyData?.[dayKey];
            
            let value = '-';
            let cellStyle = `border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; font-size: 9px; font-family: 'Arial', sans-serif; color: ${config.textColor}; background: #ffffff;`;
            
            if (dayData) {
              switch (config.key) {
                case 'inTime':
                  value = dayData.inTime || '-';
                  break;
                case 'outTime':
                  value = dayData.outTime || '-';
                  break;
                case 'workedHours':
                  value = dayData.workedHours || '00:00';
                  break;
                case 'status':
                  value = dayData.status || 'A';
                  const statusColors = { 'P': '#059669', 'A': '#dc2626', 'HL': '#f59e0b' };
                  cellStyle = `border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold; font-size: 10px; color: ${statusColors[value as keyof typeof statusColors] || '#374151'}; background: #ffffff;`;
                  break;
                case 'overtimeHours':
                  if (dayData.overtimeHours && parseFloat(dayData.overtimeHours) > 0) {
                    value = parseFloat(dayData.overtimeHours).toFixed(2) + 'h';
                  } else {
                    value = '-';
                  }
                  break;
              }
            }
            
            htmlContent += `<td style="${cellStyle}">${value}</td>`;
          });
          
          htmlContent += `</tr>`;
        });
        
        htmlContent += `
              </tbody>
              </table>
            </div>
            
            <!-- Summary Footer with Totals -->
            <div style="background: #f8f9fa; padding: 15px; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="font-size: 12px; font-weight: bold; color: #000000; width: 50%;">
                    MONTHLY SUMMARY - ${emp.fullName} (${emp.employeeId})
                  </td>
                  <td style="font-size: 12px; font-weight: bold; color: #000000; text-align: right;">
                    Total Working Hours: ${totalWorkedHours.toFixed(2)} | Total Overtime Hours: ${totalOvertimeHours.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="text-align: center; font-size: 10px; color: #000000; padding-top: 10px;">
                    Generated: ${new Date().toLocaleDateString('en-GB')} | Ministry of Finance - Sri Lanka | Confidential Document
                  </td>
                </tr>
              </table>
            </div>
          </div>`;
        
        // Page break between employees
        if (empIndex < data.length - 1) {
          htmlContent += '<div style="page-break-before: always; height: 30px;"></div>';
        }
      });
      
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

    // Only add closing table tags for non-monthly attendance reports
    if (reportType !== "monthly-attendance") {
      htmlContent += `
        </tbody>
        </table>`;
    }
    
    htmlContent += `
        <div class="footer">
          <p><strong>Ministry of Finance - Sri Lanka</strong></p>
          <p>Human Resources Department | Attendance Management System</p>
          <p>Generated on ${reportGeneratedTime} | Confidential Document</p>
          <p><em>This report contains sensitive employee information and should be handled accordingly.</em></p>
        </div>
        
        <script>
          window.onload = function() {
            // Add enhanced CSS for better PDF layout
            const style = document.createElement('style');
            style.textContent = \`
              @media screen {
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  margin: 20px;
                  background: #f5f5f5;
                }
                .employee-section {
                  margin-bottom: 30px !important;
                  box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
                  border-radius: 8px !important;
                  overflow: hidden;
                }
              }
              @media print {
                @page { 
                  size: A4 landscape; 
                  margin: 15mm; 
                }
                body {
                  font-family: 'Arial', sans-serif;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .employee-section {
                  page-break-inside: avoid;
                  margin-bottom: 40px !important;
                }
              }
            \`;
            document.head.appendChild(style);
            
            // Show preview and automatically trigger print dialog after a short delay
            setTimeout(() => {
              window.print();
            }, 1000);
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
              <p>• <strong>1/4 Hour Logic:</strong> OT rounded down to nearest 15-minute block (1 hr, 1 hr 15 mins, 1 hr 30 mins, 1 hr 45 mins, etc.)</p>
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

  // Individual 1/4 Offer Report (matching Treasury format)
  const renderIndividualOfferReport = () => {
    if (isIndividualOfferLoading) {
      return (
        <div className="p-6">
          <Card className="shadow-lg border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50">
            <CardContent className="p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <div className="text-lg text-gray-600">Loading Individual 1/4 Offer Report...</div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!individualOfferData) {
      return (
        <div className="p-6">
          <Card className="shadow-lg border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50">
            <CardContent className="p-8">
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <div className="text-xl text-gray-500 mb-2">Select Employee Required</div>
                <div className="text-gray-400">Please select a specific employee to generate the individual 1/4 offer report.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };

    const formatDateLong = (dateStr: string) => {
      const date = new Date(dateStr);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${formatDate(dateStr)} ${days[date.getDay()]}`;
    };

    return (
      <div className="p-4 space-y-4 bg-white">
        {/* Print Format Header */}
        <div className="border-2 border-black print:border-black">
          <div className="text-center p-4 border-b border-black">
            <div className="text-xs mb-2">gADG</div>
            <div className="text-sm font-semibold">Project Management and Monitoring</div>
            <div className="text-lg font-bold mt-2 underline">
              Applying for 1/4 allowance of Treasury Officers
            </div>
          </div>

          {/* Employee Information */}
          <div className="p-4 border-b border-black">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-sm mb-1">
                  <span className="font-semibold">Emp Id :</span> {individualOfferData.employee.employeeId}
                </div>
                <div className="text-sm mb-1">
                  <span className="font-semibold">Name :</span> {individualOfferData.employee.fullName}
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Period :</span> {formatDate(individualOfferData.period.startDate)} to {formatDate(individualOfferData.period.endDate)}
                </div>
              </div>
              <div className="border border-black rounded-full w-12 h-12 flex items-center justify-center">
                <div className="text-xs font-bold">1/4</div>
              </div>
            </div>

            <div className="text-sm mb-2">
              I, _________________________________ who serve as a ___________________________ at the Department of _______________________________, 
              Object Management and Monitoring have completed an additional time period of ________ hours in the month of {individualOfferData.period.month}.
            </div>
            <div className="text-sm">
              Therefore, I kindly request you to grant me Rs. _____________ as the 1/4 allowance of Treasury Officers according to the proposal.
            </div>
          </div>

          {/* Attendance Table */}
          <div className="p-4">
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border border-black p-1 text-center font-semibold">Date</th>
                  <th className="border border-black p-1 text-center font-semibold">In Time</th>
                  <th className="border border-black p-1 text-center font-semibold">Out Time</th>
                  <th className="border border-black p-1 text-center font-semibold">Status 1</th>
                  <th className="border border-black p-1 text-center font-semibold">Status 2</th>
                  <th className="border border-black p-1 text-center font-semibold bg-blue-200">1/4 Hours</th>
                </tr>
              </thead>
              <tbody>
                {individualOfferData.dailyData.map((day: any, index: number) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="border border-black p-1 text-center">
                      {formatDateLong(day.date)}
                    </td>
                    <td className="border border-black p-1 text-center">{day.inTime}</td>
                    <td className="border border-black p-1 text-center">{day.outTime}</td>
                    <td className="border border-black p-1 text-center">{day.status1}</td>
                    <td className="border border-black p-1 text-center">{day.status2}</td>
                    <td className="border border-black p-1 text-center bg-blue-50 font-semibold">
                      {parseFloat(day.offerHours) > 0 ? day.offerHours : '00:00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary */}
            <div className="mt-4 flex justify-end">
              <div className="border border-black p-2 bg-blue-100">
                <div className="text-sm font-semibold">Total: {individualOfferData.summary.totalOfferHours}</div>
                <div className="text-xs">Basic salary: ___________________</div>
                <div className="text-xs">Hour rate for 1/4 hours: ___________________</div>
                <div className="text-xs">Total allowances for month of {individualOfferData.period.month}: ___________________</div>
              </div>
            </div>

            {/* Signatures */}
            <div className="mt-6 flex justify-between">
              <div className="text-center">
                <div className="border-t border-black pt-2 w-48">
                  <div className="text-sm font-semibold">Signature of the requesting officer</div>
                  <div className="text-xs mt-2">Date: ___________________</div>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-black pt-2 w-48">
                  <div className="text-sm font-semibold">Signature of the checked officer</div>
                  <div className="text-xs mt-2">Date: ___________________</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Print Button */}
        <div className="text-center mt-4 print:hidden">
          <Button 
            onClick={() => window.print()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            <FileText className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Reports</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition duration-200 ease-in-out flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Report
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem 
              onClick={handlePreviewExport}
              className="flex items-center gap-3 py-3 px-4 cursor-pointer hover:bg-green-50 focus:bg-green-50"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <div className="flex flex-col">
                <span className="font-medium text-green-700">Excel Format</span>
                <span className="text-xs text-gray-500">Download as .xlsx file</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleExportReport('pdf')}
              className="flex items-center gap-3 py-3 px-4 cursor-pointer hover:bg-red-50 focus:bg-red-50"
            >
              <FileText className="h-4 w-4 text-red-600" />
              <div className="flex flex-col">
                <span className="font-medium text-red-700">PDF Format</span>
                <span className="text-xs text-gray-500">Download as .pdf file</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
                <SelectItem value="individual-offer">Individual 1/4 Offer Report</SelectItem>
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
                <SelectValue placeholder={(reportType === "individual-monthly" || reportType === "individual-offer") ? "Select an employee (required)" : "Select employee"} />
              </SelectTrigger>
              <SelectContent>
                {(reportType !== "individual-monthly" && reportType !== "individual-offer") && <SelectItem value="all">All Employees</SelectItem>}
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
      {reportType === "individual-offer" && renderIndividualOfferReport()}
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
