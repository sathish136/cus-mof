import { 
  employees, 
  attendance, 
  leaveRequests, 
  overtimeRequests, 
  biometricDevices,
  holidays,
  leaveTypes,
  type Employee, 
  type InsertEmployee,
  type Attendance,
  type InsertAttendance,
  type LeaveRequest,
  type InsertLeaveRequest,
  type OvertimeRequest,
  type InsertOvertimeRequest,
  type BiometricDevice,
  type InsertBiometricDevice,
  type Holiday,
  type InsertHoliday,
  type LeaveType,
  type InsertLeaveType
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count, sum } from "drizzle-orm";

export interface IStorage {
  // Employee operations
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: number): Promise<void>;
  
  // Attendance operations
  getAttendances(employeeId?: number, date?: Date): Promise<Attendance[]>;
  getAttendance(id: number): Promise<Attendance | undefined>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendance: Partial<InsertAttendance>): Promise<Attendance>;
  
  // Leave request operations
  getLeaveRequests(employeeId?: number): Promise<LeaveRequest[]>;
  getLeaveRequest(id: number): Promise<LeaveRequest | undefined>;
  createLeaveRequest(leaveRequest: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, leaveRequest: Partial<LeaveRequest>): Promise<LeaveRequest>;
  
  // Overtime request operations
  getOvertimeRequests(employeeId?: number): Promise<OvertimeRequest[]>;
  getOvertimeRequest(id: number): Promise<OvertimeRequest | undefined>;
  createOvertimeRequest(overtimeRequest: InsertOvertimeRequest): Promise<OvertimeRequest>;
  updateOvertimeRequest(id: number, overtimeRequest: Partial<OvertimeRequest>): Promise<OvertimeRequest>;
  
  // Biometric device operations
  getBiometricDevices(): Promise<BiometricDevice[]>;
  getBiometricDevice(id: number): Promise<BiometricDevice | undefined>;
  createBiometricDevice(device: InsertBiometricDevice): Promise<BiometricDevice>;
  updateBiometricDevice(id: number, device: Partial<InsertBiometricDevice>): Promise<BiometricDevice>;
  
  // Dashboard statistics
  getDashboardStats(): Promise<{
    totalEmployees: number;
    presentToday: number;
    onLeave: number;
    overtimeHours: number;
  }>;
  
  // Attendance summary
  getAttendanceSummary(startDate: Date, endDate: Date): Promise<any[]>;
  
  // Holiday operations
  getHolidays(year?: number): Promise<Holiday[]>;
  getHoliday(id: number): Promise<Holiday | undefined>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, holiday: Partial<InsertHoliday>): Promise<Holiday>;
  deleteHoliday(id: number): Promise<void>;
  
  // Leave type operations
  getLeaveTypes(): Promise<LeaveType[]>;
  getLeaveType(id: number): Promise<LeaveType | undefined>;
  createLeaveType(leaveType: InsertLeaveType): Promise<LeaveType>;
  updateLeaveType(id: number, leaveType: Partial<InsertLeaveType>): Promise<LeaveType>;
  deleteLeaveType(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(desc(employees.createdAt));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || undefined;
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.employeeId, employeeId));
    return employee || undefined;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db
      .insert(employees)
      .values({
        ...employee,
        updatedAt: new Date(),
      })
      .returning();
    return newEmployee;
  }

  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee> {
    const [updatedEmployee] = await db
      .update(employees)
      .set({
        ...employee,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();
    return updatedEmployee;
  }

  async deleteEmployee(id: number): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  async getAttendances(employeeId?: number, date?: Date): Promise<Attendance[]> {
    if (employeeId && date) {
      return await db.select().from(attendance)
        .where(and(
          eq(attendance.employeeId, employeeId),
          gte(attendance.date, date),
          lte(attendance.date, new Date(date.getTime() + 24 * 60 * 60 * 1000))
        ))
        .orderBy(desc(attendance.date));
    } else if (employeeId) {
      return await db.select().from(attendance)
        .where(eq(attendance.employeeId, employeeId))
        .orderBy(desc(attendance.date));
    } else if (date) {
      return await db.select().from(attendance)
        .where(and(
          gte(attendance.date, date),
          lte(attendance.date, new Date(date.getTime() + 24 * 60 * 60 * 1000))
        ))
        .orderBy(desc(attendance.date));
    }
    
    return await db.select().from(attendance).orderBy(desc(attendance.date));
  }

  async getAttendance(id: number): Promise<Attendance | undefined> {
    const [attendanceRecord] = await db.select().from(attendance).where(eq(attendance.id, id));
    return attendanceRecord || undefined;
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const [newAttendance] = await db
      .insert(attendance)
      .values(attendanceData)
      .returning();
    return newAttendance;
  }

  async updateAttendance(id: number, attendanceData: Partial<InsertAttendance>): Promise<Attendance> {
    const [updatedAttendance] = await db
      .update(attendance)
      .set(attendanceData)
      .where(eq(attendance.id, id))
      .returning();
    return updatedAttendance;
  }

  async getLeaveRequests(employeeId?: number): Promise<LeaveRequest[]> {
    if (employeeId) {
      return await db.select().from(leaveRequests)
        .where(eq(leaveRequests.employeeId, employeeId))
        .orderBy(desc(leaveRequests.createdAt));
    }
    
    return await db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt));
  }

  async getLeaveRequest(id: number): Promise<LeaveRequest | undefined> {
    const [leaveRequest] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return leaveRequest || undefined;
  }

  async createLeaveRequest(leaveRequest: InsertLeaveRequest): Promise<LeaveRequest> {
    const [newLeaveRequest] = await db
      .insert(leaveRequests)
      .values(leaveRequest)
      .returning();
    return newLeaveRequest;
  }

  async updateLeaveRequest(id: number, leaveRequest: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const [updatedLeaveRequest] = await db
      .update(leaveRequests)
      .set(leaveRequest)
      .where(eq(leaveRequests.id, id))
      .returning();
    return updatedLeaveRequest;
  }

  async getOvertimeRequests(employeeId?: number): Promise<OvertimeRequest[]> {
    if (employeeId) {
      return await db.select().from(overtimeRequests)
        .where(eq(overtimeRequests.employeeId, employeeId))
        .orderBy(desc(overtimeRequests.createdAt));
    }
    
    return await db.select().from(overtimeRequests).orderBy(desc(overtimeRequests.createdAt));
  }

  async getOvertimeRequest(id: number): Promise<OvertimeRequest | undefined> {
    const [overtimeRequest] = await db.select().from(overtimeRequests).where(eq(overtimeRequests.id, id));
    return overtimeRequest || undefined;
  }

  async createOvertimeRequest(overtimeRequest: InsertOvertimeRequest): Promise<OvertimeRequest> {
    const [newOvertimeRequest] = await db
      .insert(overtimeRequests)
      .values(overtimeRequest)
      .returning();
    return newOvertimeRequest;
  }

  async updateOvertimeRequest(id: number, overtimeRequest: Partial<OvertimeRequest>): Promise<OvertimeRequest> {
    const [updatedOvertimeRequest] = await db
      .update(overtimeRequests)
      .set(overtimeRequest)
      .where(eq(overtimeRequests.id, id))
      .returning();
    return updatedOvertimeRequest;
  }

  async getBiometricDevices(): Promise<BiometricDevice[]> {
    return await db.select().from(biometricDevices).orderBy(desc(biometricDevices.createdAt));
  }

  async getBiometricDevice(id: number): Promise<BiometricDevice | undefined> {
    const [device] = await db.select().from(biometricDevices).where(eq(biometricDevices.id, id));
    return device || undefined;
  }

  async getBiometricDeviceByDeviceId(deviceId: string): Promise<BiometricDevice | undefined> {
    const [device] = await db.select().from(biometricDevices).where(eq(biometricDevices.deviceId, deviceId));
    return device || undefined;
  }

  async createBiometricDevice(device: InsertBiometricDevice): Promise<BiometricDevice> {
    const [newDevice] = await db.insert(biometricDevices).values({
      ...device,
      updatedAt: new Date(),
    }).returning();
    return newDevice;
  }

  async updateBiometricDevice(id: number, device: Partial<InsertBiometricDevice>): Promise<BiometricDevice> {
    const [updatedDevice] = await db
      .update(biometricDevices)
      .set({
        ...device,
        updatedAt: new Date(),
      })
      .where(eq(biometricDevices.id, id))
      .returning();
    return updatedDevice;
  }

  async getDashboardStats(): Promise<{
    totalEmployees: number;
    presentToday: number;
    onLeave: number;
    overtimeHours: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalEmployeesResult] = await db
      .select({ count: count() })
      .from(employees)
      .where(eq(employees.status, "active"));

    const [presentTodayResult] = await db
      .select({ count: count() })
      .from(attendance)
      .where(and(
        eq(attendance.status, "present"),
        gte(attendance.date, today),
        lte(attendance.date, tomorrow)
      ));

    const [onLeaveResult] = await db
      .select({ count: count() })
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.status, "approved"),
        lte(leaveRequests.startDate, today),
        gte(leaveRequests.endDate, today)
      ));

    const [overtimeHoursResult] = await db
      .select({ total: sum(overtimeRequests.hours) })
      .from(overtimeRequests)
      .where(and(
        eq(overtimeRequests.status, "approved"),
        gte(overtimeRequests.date, new Date(today.getFullYear(), today.getMonth(), 1))
      ));

    return {
      totalEmployees: totalEmployeesResult.count,
      presentToday: presentTodayResult.count,
      onLeave: onLeaveResult.count,
      overtimeHours: Number(overtimeHoursResult.total || 0),
    };
  }

  async getAttendanceSummary(startDate: Date, endDate: Date): Promise<any[]> {
    return await db
      .select({
        date: attendance.date,
        present: count(sql`case when ${attendance.status} = 'present' then 1 end`),
        absent: count(sql`case when ${attendance.status} = 'absent' then 1 end`),
        late: count(sql`case when ${attendance.status} = 'late' then 1 end`),
      })
      .from(attendance)
      .where(and(
        gte(attendance.date, startDate),
        lte(attendance.date, endDate)
      ))
      .groupBy(attendance.date)
      .orderBy(attendance.date);
  }

  // Holiday operations
  async getHolidays(year?: number): Promise<Holiday[]> {
    let query = db.select().from(holidays);
    
    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      query = query.where(and(
        gte(holidays.date, startOfYear),
        lte(holidays.date, endOfYear)
      ));
    }
    
    return await query.orderBy(holidays.date);
  }

  async getHoliday(id: number): Promise<Holiday | undefined> {
    const result = await db.select().from(holidays).where(eq(holidays.id, id));
    return result[0];
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const result = await db.insert(holidays).values(holiday).returning();
    return result[0];
  }

  async updateHoliday(id: number, holiday: Partial<InsertHoliday>): Promise<Holiday> {
    const result = await db.update(holidays)
      .set({ ...holiday, updatedAt: new Date() })
      .where(eq(holidays.id, id))
      .returning();
    return result[0];
  }

  async deleteHoliday(id: number): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  async getLeaveTypes(): Promise<LeaveType[]> {
    const result = await db.select().from(leaveTypes).orderBy(leaveTypes.name);
    return result;
  }

  async getLeaveType(id: number): Promise<LeaveType | undefined> {
    const result = await db.select().from(leaveTypes).where(eq(leaveTypes.id, id)).limit(1);
    return result[0];
  }

  async createLeaveType(leaveType: InsertLeaveType): Promise<LeaveType> {
    const result = await db.insert(leaveTypes).values(leaveType).returning();
    return result[0];
  }

  async updateLeaveType(id: number, leaveType: Partial<InsertLeaveType>): Promise<LeaveType> {
    const result = await db.update(leaveTypes).set(leaveType).where(eq(leaveTypes.id, id)).returning();
    return result[0];
  }

  async deleteLeaveType(id: number): Promise<void> {
    await db.delete(leaveTypes).where(eq(leaveTypes.id, id));
  }
}

export const storage = new DatabaseStorage();
