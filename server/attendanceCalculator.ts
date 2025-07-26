// Comprehensive Attendance Calculation Engine
// Implements exact Group A and Group B policies as per requirements

import { GroupWorkingHours } from '../shared/schema';
import { getGroupWorkingHours } from './hrSettings';

export interface AttendanceCalculationResult {
  status: 'present' | 'absent' | 'late' | 'early_departure' | 'half_day';
  workingHours: number;
  overtimeHours: number;
  isShortLeaveApplicable: boolean;
  lateArrivalPenalty: string | null;
  notes: string[];
}

export interface HolidayInfo {
  isHoliday: boolean;
  isWeekend: boolean;
  isMercantileHoliday: boolean;
  isSpecialHoliday: boolean;
}

export class AttendanceCalculator {
  private groupSettings: GroupWorkingHours;

  constructor() {
    this.groupSettings = getGroupWorkingHours();
  }

  /**
   * Calculate attendance based on Group A or Group B policies
   */
  calculateAttendance(
    checkIn: Date,
    checkOut: Date | null,
    employeeGroup: 'group_a' | 'group_b',
    holidayInfo: HolidayInfo,
    shortLeaveUsed: boolean = false
  ): AttendanceCalculationResult {
    
    const result: AttendanceCalculationResult = {
      status: 'absent',
      workingHours: 0,
      overtimeHours: 0,
      isShortLeaveApplicable: false,
      lateArrivalPenalty: null,
      notes: []
    };

    // Get group-specific settings
    const groupConfig = employeeGroup === 'group_a' ? this.groupSettings.groupA : this.groupSettings.groupB;
    const requiredHours = groupConfig.durationMinutes / 60; // Convert minutes to hours

    if (!checkIn) {
      result.status = 'absent';
      result.notes.push('No check-in recorded');
      return result;
    }

    // Extract time components
    const checkInTime = this.getTimeString(checkIn);
    const checkOutTime = checkOut ? this.getTimeString(checkOut) : null;

    // Calculate total working hours if check-out exists
    if (checkOut) {
      const totalMs = checkOut.getTime() - checkIn.getTime();
      result.workingHours = Math.max(0, totalMs / (1000 * 60 * 60));
    }

    // Handle holiday and weekend scenarios
    if (holidayInfo.isHoliday || holidayInfo.isWeekend) {
      if (checkOut) {
        // On holidays/weekends, all working hours count as overtime
        result.overtimeHours = result.workingHours;
        result.status = 'present';
        result.notes.push(holidayInfo.isWeekend ? 'Weekend work - full OT' : 'Holiday work - full OT');
      }
      return result;
    }

    // Apply group-specific policies
    if (employeeGroup === 'group_a') {
      return this.calculateGroupAAttendance(checkInTime, checkOutTime, result, groupConfig, shortLeaveUsed);
    } else {
      return this.calculateGroupBAttendance(checkInTime, checkOutTime, result, groupConfig, shortLeaveUsed);
    }
  }

  /**
   * Group A Attendance Policy Implementation
   * Standard Time: 8:30 AM – 4:15 PM (7.75 hours)
   */
  private calculateGroupAAttendance(
    checkInTime: string,
    checkOutTime: string | null,
    result: AttendanceCalculationResult,
    groupConfig: any,
    shortLeaveUsed: boolean
  ): AttendanceCalculationResult {
    
    const requiredHours = 7.75;
    
    // Late arrival analysis
    if (checkInTime <= '09:00') {
      // Within 30-minute grace period
      result.status = 'present';
    } else if (checkInTime > '09:00' && checkInTime <= '10:00') {
      result.status = 'late';
      result.lateArrivalPenalty = 'Late arrival';
      result.notes.push('Arrived after grace period');
    } else if (checkInTime > '10:00' && checkInTime < '14:45') {
      // Half day rule
      if (shortLeaveUsed) {
        result.status = 'present';
        result.isShortLeaveApplicable = true;
        result.notes.push('Half day covered by short leave');
      } else {
        result.status = 'half_day';
        result.lateArrivalPenalty = 'Half day';
        result.notes.push('Arrival after 10:00 AM - marked as half day');
      }
    } else {
      result.status = 'absent';
      result.notes.push('Arrival too late - marked absent');
    }

    // Check short leave eligibility
    if ((checkInTime >= '08:30' && checkInTime <= '10:00') || 
        (checkOutTime && checkOutTime >= '14:45' && checkOutTime <= '16:15')) {
      result.isShortLeaveApplicable = true;
    }

    // Calculate overtime (only if meeting minimum working hours)
    if (result.workingHours > requiredHours && result.status !== 'half_day') {
      result.overtimeHours = result.workingHours - requiredHours;
      result.notes.push(`Overtime: ${result.overtimeHours.toFixed(2)} hours beyond 7.75 hours`);
    }

    return result;
  }

  /**
   * Group B Attendance Policy Implementation  
   * Standard Time: 8:00 AM – 4:45 PM (8.75 hours)
   */
  private calculateGroupBAttendance(
    checkInTime: string,
    checkOutTime: string | null,
    result: AttendanceCalculationResult,
    groupConfig: any,
    shortLeaveUsed: boolean
  ): AttendanceCalculationResult {
    
    const requiredHours = 8.75;
    
    // Late arrival analysis
    if (checkInTime <= '08:15') {
      // Within 15-minute grace period
      result.status = 'present';
    } else if (checkInTime > '08:15' && checkInTime <= '09:30') {
      result.status = 'late';
      result.lateArrivalPenalty = 'Late arrival';
      result.notes.push('Arrived after 15-minute grace period');
    } else if (checkInTime > '09:30' && checkInTime < '15:15') {
      // Half day rule (unless covered by short leave)
      if (shortLeaveUsed) {
        result.status = 'present';
        result.isShortLeaveApplicable = true;
        result.notes.push('Half day covered by short leave');
      } else {
        result.status = 'half_day';
        result.lateArrivalPenalty = 'Half day';
        result.notes.push('Arrival after 9:30 AM - marked as half day');
      }
    } else {
      result.status = 'absent';
      result.notes.push('Arrival too late - marked absent');
    }

    // Check short leave eligibility
    if ((checkInTime >= '08:00' && checkInTime <= '09:30') || 
        (checkOutTime && checkOutTime >= '15:15' && checkOutTime <= '16:45')) {
      result.isShortLeaveApplicable = true;
    }

    // Calculate overtime (only if meeting minimum working hours)
    if (result.workingHours > requiredHours && result.status !== 'half_day') {
      result.overtimeHours = result.workingHours - requiredHours;
      result.notes.push(`Overtime: ${result.overtimeHours.toFixed(2)} hours beyond 8.75 hours`);
    }

    return result;
  }

  /**
   * Calculate 1/4 Offer (overtime calculation for quarter system)
   * Category A: Work hours calculated from 4:15 PM (16:15)
   * Category B: Work hours calculated from 4:45 PM (16:45)
   */
  calculateOfferHours(
    checkIn: Date,
    checkOut: Date,
    employeeGroup: 'group_a' | 'group_b',
    holidayInfo: HolidayInfo
  ): number {
    
    if (!checkOut) return 0;

    const overtimeStartTime = employeeGroup === 'group_a' ? '16:15' : '16:45';
    const [hour, minute] = overtimeStartTime.split(':').map(Number);
    
    // Create overtime start time for the same date
    const overtimeStart = new Date(checkIn);
    overtimeStart.setHours(hour, minute, 0, 0);
    
    let offerHours = 0;

    // Calculate offer hours based on category
    if (holidayInfo.isWeekend || holidayInfo.isHoliday) {
      // On weekends and holidays, all working hours count as offer hours
      const totalMs = checkOut.getTime() - checkIn.getTime();
      offerHours = totalMs / (1000 * 60 * 60);
    } else if (checkOut > overtimeStart) {
      // Regular days: only hours after specified time count
      const overtimeMs = checkOut.getTime() - overtimeStart.getTime();
      offerHours = Math.max(0, overtimeMs / (1000 * 60 * 60));
    }

    return offerHours;
  }

  /**
   * Check if employee can apply for short leave based on monthly usage
   */
  canApplyShortLeave(
    employeeGroup: 'group_a' | 'group_b',
    currentMonthUsage: number
  ): boolean {
    const groupConfig = employeeGroup === 'group_a' ? this.groupSettings.groupA : this.groupSettings.groupB;
    return currentMonthUsage < groupConfig.shortLeavePolicy.maxPerMonth;
  }

  /**
   * Get time string in HH:MM format
   */
  private getTimeString(date: Date): string {
    return date.toTimeString().substring(0, 5);
  }

  /**
   * Check if a date falls on a government holiday
   */
  async isGovernmentHoliday(date: Date): Promise<HolidayInfo> {
    // This would integrate with your holidays table
    // For now, returning basic weekend detection
    const dayOfWeek = date.getDay();
    
    return {
      isHoliday: false, // You would check against holidays table
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6, // Sunday or Saturday
      isMercantileHoliday: false, // Check against special holidays
      isSpecialHoliday: false // Check against special holidays
    };
  }
}

export const attendanceCalculator = new AttendanceCalculator();