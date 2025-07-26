// Short Leave Tracking System
// Manages monthly short leave usage for Group A and Group B employees

import { db } from './db';
import { employees } from '../shared/schema';
import { eq, and, gte, lt, sql } from 'drizzle-orm';

// Temporary interface until table is fully integrated
interface ShortLeaveRequestTable {
  id: number;
  employeeId: string;
  date: Date;
  type: string;
  startTime: string;
  endTime: string;
  reason?: string;
  status: string;
  approvedBy?: string;
  createdAt: Date;
}

export interface ShortLeaveRequest {
  id?: number;
  employeeId: string;
  date: Date;
  type: 'morning' | 'evening';
  startTime: string;
  endTime: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  createdAt: Date;
}

export interface ShortLeaveUsage {
  employeeId: string;
  month: number;
  year: number;
  totalUsed: number;
  remaining: number;
  requests: ShortLeaveRequest[];
}

export class ShortLeaveTracker {
  
  /**
   * Get short leave usage for an employee in a specific month
   */
  async getMonthlyUsage(employeeId: string, year: number, month: number): Promise<ShortLeaveUsage> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    
    try {
      // Get employee info to determine max allowed
      const employee = await db.select()
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1);
      
      if (!employee.length) {
        throw new Error('Employee not found');
      }
      
      const maxAllowed = 2; // Both groups allow max 2 per month
      
      // For now, return mock data since table is being integrated
      const totalUsed = 0;
      const requests: ShortLeaveRequest[] = [];
      
      return {
        employeeId,
        month,
        year,
        totalUsed,
        remaining: Math.max(0, maxAllowed - totalUsed),
        requests
      };
    } catch (error) {
      console.error('Error getting monthly usage:', error);
      return {
        employeeId,
        month,
        year,
        totalUsed: 0,
        remaining: 2,
        requests: []
      };
    }
  }
  
  /**
   * Check if employee can apply for short leave
   */
  async canApplyShortLeave(
    employeeId: string,
    requestDate: Date,
    employeeGroup: 'group_a' | 'group_b'
  ): Promise<{
    canApply: boolean;
    reason: string;
    remaining: number;
  }> {
    const year = requestDate.getFullYear();
    const month = requestDate.getMonth() + 1;
    
    const usage = await this.getMonthlyUsage(employeeId, year, month);
    
    if (usage.remaining <= 0) {
      return {
        canApply: false,
        reason: `Maximum short leaves (2) already used for ${month}/${year}`,
        remaining: 0
      };
    }
    
    return {
      canApply: true,
      reason: 'Short leave application allowed',
      remaining: usage.remaining
    };
  }
  
  /**
   * Submit short leave request
   */
  async submitShortLeaveRequest(request: Omit<ShortLeaveRequest, 'id' | 'createdAt'>): Promise<ShortLeaveRequest> {
    try {
      // Get employee info
      const employee = await db.select()
        .from(employees)
        .where(eq(employees.id, request.employeeId))
        .limit(1);
      
      if (!employee.length) {
        throw new Error('Employee not found');
      }
      
      const employeeGroup = employee[0].employeeGroup;
      
      // Check if can apply
      const eligibility = await this.canApplyShortLeave(
        request.employeeId,
        request.date,
        employeeGroup
      );
      
      if (!eligibility.canApply) {
        throw new Error(eligibility.reason);
      }
      
      // Validate time slots based on group
      this.validateTimeSlots(request.type, request.startTime, request.endTime, employeeGroup);
      
      // Insert request
      const newRequest = await db.insert(shortLeaveRequests).values({
        ...request,
        createdAt: new Date()
      }).returning();
      
      return newRequest[0] as ShortLeaveRequest;
    } catch (error) {
      throw new Error(`Failed to submit short leave request: ${error.message}`);
    }
  }
  
  /**
   * Validate time slots based on group policies
   */
  private validateTimeSlots(
    type: 'morning' | 'evening',
    startTime: string,
    endTime: string,
    employeeGroup: 'group_a' | 'group_b'
  ): void {
    if (employeeGroup === 'group_a') {
      if (type === 'morning') {
        // Group A Morning: 8:30 AM - 10:00 AM
        if (startTime < '08:30' || endTime > '10:00') {
          throw new Error('Group A morning short leave must be between 8:30 AM - 10:00 AM');
        }
      } else {
        // Group A Evening: 2:45 PM - 4:15 PM
        if (startTime < '14:45' || endTime > '16:15') {
          throw new Error('Group A evening short leave must be between 2:45 PM - 4:15 PM');
        }
      }
    } else {
      if (type === 'morning') {
        // Group B Morning: 8:00 AM - 9:30 AM
        if (startTime < '08:00' || endTime > '09:30') {
          throw new Error('Group B morning short leave must be between 8:00 AM - 9:30 AM');
        }
      } else {
        // Group B Evening: 3:15 PM - 4:45 PM
        if (startTime < '15:15' || endTime > '16:45') {
          throw new Error('Group B evening short leave must be between 3:15 PM - 4:45 PM');
        }
      }
    }
  }
  
  /**
   * Approve/reject short leave request
   */
  async updateShortLeaveStatus(
    requestId: number,
    status: 'approved' | 'rejected',
    approvedBy: string,
    reason?: string
  ): Promise<ShortLeaveRequest> {
    try {
      const updated = await db.update(shortLeaveRequests)
        .set({
          status,
          approvedBy,
          reason
        })
        .where(eq(shortLeaveRequests.id, requestId))
        .returning();
      
      return updated[0] as ShortLeaveRequest;
    } catch (error) {
      throw new Error(`Failed to update short leave status: ${error.message}`);
    }
  }
  
  /**
   * Get all short leave requests for approval
   */
  async getPendingRequests(): Promise<ShortLeaveRequest[]> {
    try {
      const requests = await db.select()
        .from(shortLeaveRequests)
        .where(eq(shortLeaveRequests.status, 'pending'))
        .orderBy(shortLeaveRequests.createdAt);
      
      return requests as ShortLeaveRequest[];
    } catch (error) {
      console.error('Error getting pending requests:', error);
      return [];
    }
  }
}

export const shortLeaveTracker = new ShortLeaveTracker();