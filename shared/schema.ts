import { pgTable, serial, text, varchar, timestamp, integer, boolean, decimal, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["admin", "user"]);
export const employeeGroupEnum = pgEnum("employee_group", ["group_a", "group_b"]);
export const employeeStatusEnum = pgEnum("employee_status", ["active", "inactive"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "late", "early_departure"]);
export const leaveStatusEnum = pgEnum("leave_status", ["pending", "approved", "rejected"]);
export const leaveTypeEnum = pgEnum("leave_type", ["annual", "special"]);
export const overtimeStatusEnum = pgEnum("overtime_status", ["pending", "approved", "rejected"]);
export const holidayTypeEnum = pgEnum("holiday_type", ["annual", "special", "weekend"]);

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
});

export const employees = pgTable("employees", {
  id: varchar("id", { length: 50 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 255 }),
  photoUrl: varchar("photo_url", { length: 255 }),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  position: varchar("position", { length: 255 }),
  employeeGroup: employeeGroupEnum("employee_group").notNull(),
  joinDate: timestamp("join_date").notNull(),
  status: employeeStatusEnum("status").default("active").notNull(),
  role: roleEnum("role").default("user").notNull(),
  biometricDeviceId: varchar("biometric_device_id", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id", { length: 50 }).references(() => employees.id).notNull(),
  date: timestamp("date").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  status: attendanceStatusEnum("status").notNull(),
  workingHours: decimal("working_hours", { precision: 4, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 4, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    employeeDateIdx: uniqueIndex("employee_date_idx").on(table.employeeId, table.date),
  }
});

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id", { length: 50 }).references(() => employees.id).notNull(),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  days: integer("days").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").default("pending").notNull(),
  approvedBy: varchar("approved_by", { length: 50 }).references(() => employees.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const overtimeRequests = pgTable("overtime_requests", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id", { length: 50 }).references(() => employees.id).notNull(),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  hours: decimal("hours", { precision: 4, scale: 2 }).notNull(),
  reason: text("reason"),
  status: overtimeStatusEnum("status").default("pending").notNull(),
  approvedBy: varchar("approved_by", { length: 50 }).references(() => employees.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const biometricDevices = pgTable("biometric_devices", {
  id: serial("id").primaryKey(),
  deviceId: varchar("device_id", { length: 50 }).unique().notNull(),
  location: varchar("location", { length: 100 }).notNull(),
  ip: varchar("ip", { length: 45 }).notNull(),
  port: integer("port").default(4370).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  date: timestamp("date").notNull(),
  type: holidayTypeEnum("type").notNull(),
  description: text("description"),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  applicableGroups: varchar("applicable_groups", { length: 50 }).array().default(["group_a", "group_b"]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  maxDaysPerYear: integer("max_days_per_year"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shortLeaveRequests = pgTable("short_leave_requests", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id", { length: 50 }).notNull(),
  date: timestamp("date").notNull(),
  type: varchar("type", { length: 10 }).notNull(), // 'morning' or 'evening'
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 10 }).default("pending").notNull(), // 'pending', 'approved', 'rejected'
  approvedBy: varchar("approved_by", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Adding Group Working Hours settings
export interface GroupWorkingHours {
  groupA: {
    startTime: string;
    endTime: string;
    durationMinutes: number;
    minHoursForOT?: number;
    lateArrivalPolicy: {
      gracePeriodUntil: string;
      halfDayAfter: string;
      halfDayBefore: string;
    };
    shortLeavePolicy: {
      morningStart: string;
      morningEnd: string;
      eveningStart: string;
      eveningEnd: string;
      maxPerMonth: number;
      preApprovalRequired: boolean;
      minimumWorkingHoursRequired: boolean;
    };
  };
  groupB: {
    startTime: string;
    endTime: string;
    durationMinutes: number;
    minHoursForOT?: number;
    lateArrivalPolicy: {
      gracePeriodUntil: string;
      halfDayAfter: string;
      halfDayBefore: string;
      shortLeaveAllowance: boolean;
    };
    shortLeavePolicy: {
      morningStart: string;
      morningEnd: string;
      eveningStart: string;
      eveningEnd: string;
      maxPerMonth: number;
      preApprovalRequired: boolean;
    };
  };
}

// Relations
export const departmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  attendances: many(attendance),
  leaveRequests: many(leaveRequests),
  overtimeRequests: many(overtimeRequests),
  approvedLeaves: many(leaveRequests, { relationName: "approver" }),
  approvedOvertimes: many(overtimeRequests, { relationName: "approver" }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
}));

export const leaveTypesRelations = relations(leaveTypes, ({ many }) => ({
  leaveRequests: many(leaveRequests),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  employee: one(employees, {
    fields: [attendance.employeeId],
    references: [employees.id],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveRequests.employeeId],
    references: [employees.id],
  }),
  approver: one(employees, {
    fields: [leaveRequests.approvedBy],
    references: [employees.id],
    relationName: "approver",
  }),

}));

export const overtimeRequestsRelations = relations(overtimeRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [overtimeRequests.employeeId],
    references: [employees.id],
  }),
  approver: one(employees, {
    fields: [overtimeRequests.approvedBy],
    references: [employees.id],
    relationName: "approver",
  }),
}));

export const shortLeaveRequestsRelations = relations(shortLeaveRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [shortLeaveRequests.employeeId],
    references: [employees.id],
  }),
  approver: one(employees, {
    fields: [shortLeaveRequests.approvedBy],
    references: [employees.id],
    relationName: "approver",
  }),
}));

// Insert schemas
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true });
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = InsertDepartment & { id: number };

export const insertEmployeeSchema = createInsertSchema(employees, {
    email: z.string().email({ message: "Invalid email address" }).nullable().optional(),
    joinDate: z.coerce.date(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;


export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests, {
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
  approvedBy: true,
  approvedAt: true,
});

export const insertOvertimeRequestSchema = createInsertSchema(overtimeRequests, {
  date: z.coerce.date(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
  approvedBy: true,
  approvedAt: true,
});

export const insertBiometricDeviceSchema = createInsertSchema(biometricDevices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHolidaySchema = createInsertSchema(holidays, {
  date: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShortLeaveRequestSchema = createInsertSchema(shortLeaveRequests, {
  date: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveTypeSchema = createInsertSchema(leaveTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type OvertimeRequest = typeof overtimeRequests.$inferSelect;
export type InsertOvertimeRequest = z.infer<typeof insertOvertimeRequestSchema>;
export type BiometricDevice = typeof biometricDevices.$inferSelect;
export type InsertBiometricDevice = z.infer<typeof insertBiometricDeviceSchema>;
export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type ShortLeaveRequest = typeof shortLeaveRequests.$inferSelect;
export type InsertShortLeaveRequest = z.infer<typeof insertShortLeaveRequestSchema>;
export type LeaveType = typeof leaveTypes.$inferSelect;
export type InsertLeaveType = z.infer<typeof insertLeaveTypeSchema>;
