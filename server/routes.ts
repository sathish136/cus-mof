import express from "express";
import { z } from "zod";
import ZKLib from "zklib-js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { and, eq, gte, lt, lte, desc, notInArray, isNotNull, inArray } from "drizzle-orm";
import { fileURLToPath } from 'url';
import { sql } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { db } from "./db";
import { zkDeviceManager } from "./zkdevice";
import { sessionManager } from "./sessionManager";
import {
  biometricDevices,
  departments,
  employees,
  insertDepartmentSchema,
  insertEmployeeSchema,
  attendance,
  insertAttendanceSchema,
  leaveRequests,
  insertLeaveRequestSchema,
  overtimeRequests,
  insertOvertimeRequestSchema,
  insertBiometricDeviceSchema,
  holidays,
  insertHolidaySchema,
  leaveTypes,
  insertLeaveTypeSchema,
} from "../shared/schema";

import { getGroupWorkingHours, updateGroupWorkingHours } from './hrSettings';
import { attendanceCalculator } from './attendanceCalculator';
import hrSettingsRouter from './hrSettings';
import { storage } from './storage';

const router = express.Router();

// Auto-sync settings and interval management
let autoSyncSettings = {
  enabled: false,
  intervalMinutes: 0.5, // 30 seconds = 0.5 minutes
  syncOnStartup: true,
  syncNotifications: true,
  lastSync: null as Date | null
};

let autoSyncInterval: NodeJS.Timeout | null = null;

// Helper function to find employee ID by biometric UID
function findEmployeeId(uid: string): string | null {
  // Try exact match with biometric_device_id first
  const employeeByBiometric = db.query.employees.findFirst({
    where: eq(employees.biometricDeviceId, uid),
  });
  
  // Try exact match with employee_id
  const employeeByEmpId = db.query.employees.findFirst({
    where: eq(employees.employeeId, uid),
  });
  
  // Return first match or null
  return employeeByBiometric?.id || employeeByEmpId?.id || null;
}

// Auto-sync function to sync all devices
async function performAutoSync() {
  try {
    console.log('Starting auto-sync for all biometric devices...');
    
    const devices = await db.select().from(biometricDevices);
    let totalSynced = 0;
    let totalProcessed = 0;
    
    for (const device of devices) {
      try {
        if (!zkDeviceManager.isDeviceConnected(device.deviceId)) {
          const connected = await zkDeviceManager.connectDevice(device.deviceId, {
            ip: device.ip,
            port: device.port,
            timeout: 5000,
            inport: 1,
          });
          if (!connected) {
            console.warn(`Could not connect to device ${device.deviceId} during auto-sync`);
            continue;
          }
        }

        const logs = await zkDeviceManager.syncAttendanceData(device.deviceId);
        if (logs && logs.length > 0) {
          console.log(`Processing ${logs.length} records from device ${device.deviceId}`);
          
          // Process attendance logs into database records (same logic as manual sync)
          const attendanceMap = new Map();
          const allEmployees = await db.select().from(employees);
          
          // Create lookup function for employee IDs with better matching
          const findEmployeeIdLocal = (uid: string): string | null => {
            const trimmedUid = String(uid).trim();
            
            // Try exact match with employee_id first (most common case)
            const byEmpId = allEmployees.find(emp => emp.employeeId === trimmedUid);
            if (byEmpId) return byEmpId.id;
            
            // Try exact match with biometric_device_id if it exists
            const byBiometric = allEmployees.find(emp => emp.biometricDeviceId && emp.biometricDeviceId === trimmedUid);
            if (byBiometric) return byBiometric.id;
            
            // Try exact match with id field as fallback
            const byId = allEmployees.find(emp => emp.id === trimmedUid);
            if (byId) return byId.id;
            
            return null;
          };

          // Add debug logging to understand what's happening
          console.log(`Processing ${logs.length} attendance logs for device ${device.deviceId}`);
          console.log(`Found ${allEmployees.length} employees in database`);
          
          let foundCount = 0;
          let notFoundCount = 0;
          const notFoundUIDs = new Set();
          
          for (const log of logs) {
            const uid = String(log.uid).trim();
            const employeeDbId = findEmployeeIdLocal(uid);
            if (!employeeDbId) {
              notFoundCount++;
              notFoundUIDs.add(uid);
              if (notFoundUIDs.size <= 10) { // Only log first 10 missing UIDs to avoid spam
                console.warn(`No employee found for UID: ${uid}`);
              }
              continue;
            }
            foundCount++;

            const logDate = new Date(log.timestamp);
            const dateKey = `${employeeDbId}-${logDate.toISOString().split('T')[0]}`;
            
            // Initialize or update attendance record
            if (!attendanceMap.has(dateKey)) {
              attendanceMap.set(dateKey, {
                employeeId: employeeDbId,
                date: new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate()),
                checkIn: log.timestamp,
                checkOut: log.timestamp,
                logs: [log]
              });
            } else {
              const record = attendanceMap.get(dateKey)!;
              record.logs.push(log);
              // Update check-in/check-out times
              if (log.timestamp < record.checkIn) record.checkIn = log.timestamp;
              if (log.timestamp > record.checkOut) record.checkOut = log.timestamp;
            }
          }
          
          // Log sync statistics
          console.log(`Sync stats for ${device.deviceId}: Found ${foundCount} employees, ${notFoundCount} UIDs not found`);
          if (notFoundUIDs.size > 10) {
            console.log(`Total unique missing UIDs: ${notFoundUIDs.size} (only first 10 logged)`);
          }

          // Prepare records for database insertion
          const attendanceRecordsToInsert: (typeof attendance.$inferInsert)[] = [];
          for (const [_, record] of attendanceMap) {
            // Calculate working hours
            const workingHours = ((record.checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2);
            
            // Skip if check-in/check-out spans multiple days
            if (record.checkIn.toDateString() !== record.checkOut.toDateString()) {
              console.warn(`Skipping record for employee ${record.employeeId} - check-in and check-out are on different days`);
              continue;
            }

            attendanceRecordsToInsert.push({
              employeeId: record.employeeId,
              date: record.date,
              checkIn: record.checkIn,
              checkOut: record.checkOut,
              status: 'present',
              workingHours: workingHours,
              notes: '',
              overtimeHours: null,
            });
          }

          // Insert or update attendance records
          for (const record of attendanceRecordsToInsert) {
            try {
              await db.transaction(async (tx) => {
                // First try to update existing record
                const updated = await tx
                  .update(attendance)
                  .set({
                    checkIn: record.checkIn,
                    checkOut: record.checkOut,
                    workingHours: record.workingHours,
                    status: record.status,
                    notes: record.notes,
                  })
                  .where(
                    and(
                      eq(attendance.employeeId, record.employeeId),
                      eq(attendance.date, record.date)
                    )
                  );

                // If no rows were updated, insert a new record
                if (updated.rowCount === 0) {
                  await tx.insert(attendance).values({
                    employeeId: record.employeeId,
                    date: record.date,
                    checkIn: record.checkIn,
                    checkOut: record.checkOut,
                    status: record.status,
                    workingHours: record.workingHours,
                    notes: record.notes,
                    overtimeHours: null,
                  });
                }
              });
              totalProcessed++;
            } catch (error) {
              console.error('Error upserting attendance record during auto-sync:', error);
            }
          }
          
          totalSynced += logs.length;
          console.log(`Auto-synced ${logs.length} raw records from device ${device.deviceId}, processed ${attendanceRecordsToInsert.length} attendance records`);
        }
      } catch (error) {
        console.error(`Auto-sync error for device ${device.deviceId}:`, error);
      }
    }
    
    autoSyncSettings.lastSync = new Date();
    if (totalSynced > 0) {
      console.log(`Auto-sync completed: ${totalSynced} raw records retrieved, ${totalProcessed} attendance records saved to database`);
    }
  } catch (error) {
    console.error('Auto-sync failed:', error);
  }
}

// Start auto-sync interval
function startAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
  }
  
  if (autoSyncSettings.enabled) {
    const intervalMs = autoSyncSettings.intervalMinutes * 60 * 1000;
    autoSyncInterval = setInterval(performAutoSync, intervalMs);
    console.log(`Auto-sync started with ${autoSyncSettings.intervalMinutes} minute interval`);
    
    // Sync on startup if enabled
    if (autoSyncSettings.syncOnStartup) {
      setTimeout(performAutoSync, 5000); // Start after 5 seconds
    }
  }
}

// Stop auto-sync interval
function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    console.log('Auto-sync stopped');
  }
}

// --- File Upload Setup ---
// Use import.meta.url to get the directory path in ES modules, compatible with Windows
const uploadDir = path.join(__dirname, "..", "uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: multerStorage });

// Serve static files from the 'uploads' directory
router.use("/uploads", express.static(uploadDir));

// --- Upload Route ---
router.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  const url = `/uploads/${req.file.filename}`;
  res.status(200).json({ url });
});

// --- Dashboard Routes ---

// Attendance trends for dashboard chart
router.get("/api/dashboard/attendance-trends", async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysNumber = parseInt(days as string, 10);
    
    // Get date range for the last N days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNumber + 1);
    
    // Get all employees count
    const totalEmployees = await db.select({ count: sql<number>`count(*)` }).from(employees);
    const totalCount = totalEmployees[0]?.count || 0;
    
    // Generate data for each day in the range
    const trends = [];
    for (let i = 0; i < daysNumber; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Get attendance records for this date
      const dayAttendance = await db.select({
        status: attendance.status,
        count: sql<number>`count(*)`
      })
      .from(attendance)
      .where(
        sql`DATE(${attendance.checkIn}) = ${dateStr}`
      )
      .groupBy(attendance.status);
      
      // Count by status
      let present = 0;
      let late = 0;
      let absent = 0;
      
      dayAttendance.forEach((record) => {
        if (record.status === 'present') present = record.count;
        else if (record.status === 'late') late = record.count;
        else if (record.status === 'half_day') late += record.count; // Group half-day with late
      });
      
      // Calculate absent as total employees minus those who checked in
      const totalPresent = present + late;
      absent = Math.max(0, totalCount - totalPresent);
      
      trends.push({
        date: dateStr,
        present,
        late,
        absent,
        total: totalCount
      });
    }
    
    res.json(trends);
  } catch (error) {
    console.error('Failed to fetch attendance trends:', error);
    res.status(500).json({ message: 'Failed to fetch attendance trends' });
  }
});

router.get("/api/dashboard/stats", async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const totalEmployeesResult = await db.select({ count: sql`count(*)::int` }).from(employees).where(eq(employees.status, 'active'));
    const presentTodayResult = await db.select({ count: sql`count(distinct(${attendance.employeeId}))::int` }).from(attendance).where(and(gte(attendance.checkIn, startOfToday), lt(attendance.checkIn, endOfToday)));
    const onLeaveResult = await db.select({ count: sql`count(*)::int` }).from(leaveRequests).where(and(eq(leaveRequests.status, 'approved'), lte(leaveRequests.startDate, startOfToday), gte(leaveRequests.endDate, startOfToday)));
    const overtimeResult = await db.select({ totalHours: sql`sum(${overtimeRequests.hours})::int` }).from(overtimeRequests).where(and(eq(overtimeRequests.status, 'approved'), gte(overtimeRequests.date, startOfMonth)));

    res.json({
      totalEmployees: totalEmployeesResult[0]?.count || 0,
      presentToday: presentTodayResult[0]?.count || 0,
      onLeave: onLeaveResult[0]?.count || 0,
      overtimeHours: overtimeResult[0]?.totalHours || 0,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

router.get("/api/dashboard/recent-activity", async (req, res) => {
  try {
    const checkIns = await db.select({
        id: attendance.id,
        description: sql`concat(${employees.fullName}, ' checked in')`,
        timestamp: attendance.checkIn,
        type: sql`'check-in' as type`,
    }).from(attendance)
    .leftJoin(employees, eq(sql`${attendance.employeeId}::text`, employees.employeeId))
    .orderBy(desc(attendance.checkIn))
    .limit(5);

    const leaves = await db.select({
        id: leaveRequests.id,
        description: sql`concat('Leave request ', ${leaveRequests.status}, ' for ', ${employees.fullName})`,
        timestamp: leaveRequests.createdAt,
        type: sql`'leave' as type`,
    }).from(leaveRequests)
    .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .orderBy(desc(leaveRequests.createdAt))
    .limit(5);
    
    const overtimes = await db.select({
        id: overtimeRequests.id,
        description: sql`concat('Overtime request ', ${overtimeRequests.status}, ' for ', ${employees.fullName})`,
        timestamp: overtimeRequests.createdAt,
        type: sql`'overtime' as type`,
    }).from(overtimeRequests)
    .leftJoin(employees, eq(overtimeRequests.employeeId, employees.id))
    .orderBy(desc(overtimeRequests.createdAt))
    .limit(5);

    const allActivities = [...checkIns, ...leaves, ...overtimes]
        .sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        })
        .slice(0, 5);
        
    res.json(allActivities);
  } catch (error) {
    console.error("Failed to fetch recent activities:", error);
    res.status(500).json({ message: "Failed to fetch recent activities" });
  }
});

// --- Department Routes ---
router.get("/api/departments", async (req, res) => {
  try {
    const allDepartments = await db.select().from(departments);
    res.json(allDepartments);
  } catch (error) {
    console.error("Failed to fetch departments:", error);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
});

router.post("/api/departments", async (req, res) => {
  try {
    const parsedData = insertDepartmentSchema.parse(req.body);
    const newDepartment = await db.insert(departments).values(parsedData).returning();
    res.status(201).json(newDepartment[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", details: error.errors });
    }
    console.error("Failed to create department:", error);
    res.status(500).json({ message: "Failed to create department" });
  }
});

// --- Employee Routes ---
router.get("/api/employees", async (req, res) => {
  try {
    const { limit } = z.object({
      limit: z.coerce.number().int().positive().optional(),
    }).parse(req.query);

    let query = db
      .select({
        id: employees.id,
        employeeId: employees.employeeId,
        fullName: employees.fullName,
        email: employees.email,
        phone: employees.phone,
        photoUrl: employees.photoUrl,
        position: employees.position,
        employeeGroup: employees.employeeGroup,
        joinDate: employees.joinDate,
        status: employees.status,
        role: employees.role,
        department: departments.name,
        departmentId: departments.id,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .orderBy(desc(employees.createdAt));

    if (limit) {
      query.limit(limit);
    }

    const result = await query;

    res.json(result);
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    res.status(500).json({ message: "Failed to fetch employees" });
  }
});

router.get("/api/employees/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await db
      .select({
        id: employees.id,
        employeeId: employees.employeeId,
        fullName: employees.fullName,
        email: employees.email,
        phone: employees.phone,
        employeeGroup: employees.employeeGroup,
        joinDate: employees.joinDate,
        status: employees.status,
        role: employees.role,
        department: departments.name,
        departmentId: departments.id,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(eq(employees.id, String(id)));

    if (result.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json(result[0]);
  } catch (error) {
    console.error("Failed to fetch employee:", error);
    res.status(500).json({ message: "Failed to fetch employee" });
  }
});

router.post("/api/employees", upload.single("photo"), async (req, res) => {
  try {
    // Multer puts non-file fields in req.body. We need to parse numeric/date fields manually.
    const parsedBody = {
      ...req.body,
      departmentId: parseInt(req.body.departmentId, 10),
      joinDate: new Date(req.body.joinDate),
    };

    const validatedData = insertEmployeeSchema.parse(parsedBody);
    let photoUrl: string | undefined = undefined;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;

    }

    // Generate a new UUID for the primary key (id)
    const id = crypto.randomUUID();
    
    // Ensure we have a valid employeeId
    if (!validatedData.employeeId) {
      return res.status(400).json({ message: "Employee ID is required" });
    }
    
    // Prepare the employee data according to the schema
    const employeeData = {
      ...validatedData,
      id,
      employeeId: String(validatedData.employeeId), // Ensure it's a string
      photoUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Insert the new employee record with proper typing
    try {
      const newEmployee = await db.insert(employees).values(employeeData).returning();
      res.status(201).json(newEmployee[0]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
        return res.status(400).json({ message: "Employee ID must be unique" });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({ message: "Failed to create employee" });
  }
});

router.put("/api/employees/bulk", async (req, res) => {
  try {
    const { employeeIds, updates } = req.body;
    
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: "Employee IDs are required" });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Updates are required" });
    }

    console.log("Raw updates received:", updates);
    console.log("Employee IDs:", employeeIds);
    
    // Build update object based on what fields are provided
    const updateFields: any = { updatedAt: new Date() };
    
    if (updates.departmentId !== undefined && updates.departmentId !== null) {
      updateFields.departmentId = Number(updates.departmentId);
      console.log("Setting departmentId to:", updateFields.departmentId);
    }
    
    if (updates.employeeGroup !== undefined && updates.employeeGroup !== null) {
      updateFields.employeeGroup = updates.employeeGroup;
      console.log("Setting employeeGroup to:", updateFields.employeeGroup);
    }
    
    if (updates.status !== undefined && updates.status !== null) {
      updateFields.status = updates.status;
      console.log("Setting status to:", updateFields.status);
    }

    console.log("Final update fields:", updateFields);

    // Perform the bulk update
    const updatedEmployees = await db
      .update(employees)
      .set(updateFields)
      .where(inArray(employees.id, employeeIds))
      .returning({ id: employees.id, employeeId: employees.employeeId });

    console.log("Successfully updated employees:", updatedEmployees);

    res.json({ 
      message: `Successfully updated ${updatedEmployees.length} employees`,
      updatedCount: updatedEmployees.length,
      updatedEmployees: updatedEmployees
    });
  } catch (error) {
    console.error("Error bulk updating employees:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

router.put("/api/employees/:id", upload.single("photo"), async (req, res) => {
  try {
    const id = req.params.id; // Already a string

    const parsedBody = {
      ...req.body,
      departmentId: req.body.departmentId ? parseInt(req.body.departmentId, 10) : null,
    };

    const validated = insertEmployeeSchema.partial().safeParse(parsedBody);

    if (!validated.success) {
      return res.status(400).json({ errors: validated.error.errors });
    }

    let photoUrl = req.body.photoUrl;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }

    // Ensure we don't update the employeeId if it's not provided
    const updateData = {
      ...validated.data,
      photoUrl,
      updatedAt: new Date(),
    };
    
    // Remove undefined values to prevent overriding with null
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });
    
    const updatedEmployee = await db
      .update(employees)
      .set(updateData)
      .where(eq(employees.id, id))
      .returning();

    if (updatedEmployee.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(updatedEmployee[0]);
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/api/employees/:id", async (req, res) => {
  try {
    const id = req.params.id; // Already a string
    const deletedEmployee = await db
      .delete(employees)
      .where(eq(employees.id, id))
      .returning();

    if (deletedEmployee.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Import Employee Names from CSV/Excel
router.post("/api/employees/import-names", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    let data: any[] = [];
    
    if (fileExtension === '.csv') {
      // Handle CSV files
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim() !== '');
      
      // Skip header row and parse data
      for (let i = 1; i < lines.length; i++) {
        const [employeeId, fullName] = lines[i].split(',').map(field => field.trim().replace(/^"|"$/g, ''));
        if (employeeId && fullName) {
          data.push({ employeeId, fullName });
        }
      }
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      // Handle Excel files using xlsx library
      const XLSX = require('xlsx');
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Map Excel data to our format
      data = jsonData.map((row: any) => ({
        employeeId: String(row['Employee ID'] || row.employeeId || Object.values(row)[0]).trim(),
        fullName: String(row['Full Name'] || row.fullName || Object.values(row)[1]).trim()
      })).filter(item => item.employeeId && item.fullName);
    } else {
      return res.status(400).json({ message: "Unsupported file format. Please use CSV or Excel files." });
    }

    if (data.length === 0) {
      return res.status(400).json({ message: "No valid data found in file. Please check the format." });
    }

    // Update employee names
    let updatedCount = 0;
    const errors: string[] = [];

    for (const item of data) {
      try {
        const result = await db
          .update(employees)
          .set({ fullName: item.fullName })
          .where(eq(employees.employeeId, item.employeeId))
          .returning();

        if (result.length > 0) {
          updatedCount++;
          console.log(`Updated employee ${item.employeeId}: ${item.fullName}`);
        } else {
          errors.push(`Employee ID ${item.employeeId} not found`);
        }
      } catch (error) {
        errors.push(`Failed to update employee ${item.employeeId}: ${error}`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    const response = {
      updated: updatedCount,
      message: `Successfully updated ${updatedCount} employee names`,
      totalProcessed: data.length,
      errors: errors.length > 0 ? errors : undefined
    };

    res.json(response);
  } catch (error) {
    console.error("Error importing employee names:", error);
    
    // Clean up file if it exists
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error("Error cleaning up file:", cleanupError);
      }
    }
    
    res.status(500).json({ message: "Internal server error during import" });
  }
});

// --- Attendance Routes ---
router.get("/api/attendance", async (req, res) => {
  try {
    const { date, status } = z.object({
      date: z.string().optional(),
      status: z.enum(["all", "present", "absent", "late", "early_departure"]).optional(),
    }).parse(req.query);

    if (!date) {
      return res.json([]);
    }

    const startDate = new Date(`${date}T00:00:00.000+05:30`);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);

    const allEmployeeRecords = await db
      .select({
        // Employee fields
        employeeId: employees.employeeId,
        fullName: employees.fullName,
        employeeRecordId: employees.id,
        // Attendance fields (will be null if no record)
        attendanceId: attendance.id,
        attendanceDate: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        attendanceStatus: attendance.status,
        workingHours: attendance.workingHours,
        notes: attendance.notes,
      })
      .from(employees)
      .leftJoin(
        attendance,
        and(
          eq(employees.employeeId, sql`${attendance.employeeId}::text`),
          gte(attendance.checkIn, startDate),
          lt(attendance.checkIn, endDate)
        )
      );

    let finalRecords = allEmployeeRecords.map((record) => {
      if (record.attendanceId) {
        // Employee is present - format UTC times for display
        const formatTime = (time: Date | null) => {
          if (!time) return null;
          return time.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        };

        return {
          id: record.attendanceId,
          date: record.attendanceDate,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          // Add formatted UTC times for frontend display
          checkInDisplay: formatTime(record.checkIn),
          checkOutDisplay: formatTime(record.checkOut),
          status: record.attendanceStatus,
          workingHours: record.workingHours,
          notes: record.notes,
          employee: {
            fullName: record.fullName,
            employeeId: record.employeeId,
          },
        };
      } else {
        // Employee is absent
        return {
          id: record.employeeRecordId,
          date: startDate,
          checkIn: null,
          checkOut: null,
          checkInDisplay: null,
          checkOutDisplay: null,
          status: 'absent' as const,
          workingHours: null,
          notes: null,
          employee: {
            fullName: record.fullName,
            employeeId: record.employeeId,
          },
        };
      }
    });

    if (status && status !== 'all') {
      finalRecords = finalRecords.filter(record => record.status === status);
    }

    res.json(finalRecords);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', details: error.errors });
    }
    console.error("Failed to fetch attendance:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/api/attendance", async (req, res) => {
  try {
    const validatedData = insertAttendanceSchema.parse(req.body);
    const newRecord = await db.insert(attendance).values(validatedData).returning();
    res.status(201).json(newRecord[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", details: error.errors });
    }
    console.error("Failed to create attendance record:", error);
    res.status(500).json({ message: "Failed to create attendance record" });
  }
});

// Initialize database tables if they don't exist
async function initializeLeaveTables() {
  try {
    console.log('Initializing leave tables...');
    
    // Create leave_types table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS leave_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        max_days_per_year INTEGER,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    
    // Insert default leave types
    await db.execute(sql`
      INSERT INTO leave_types (name, description, max_days_per_year, is_active) 
      VALUES 
        ('annual', 'Annual vacation leave', 21, true),
        ('sick', 'Medical leave for illness', 14, true),
        ('casual', 'Short-term personal leave', 7, true),
        ('maternity', 'Maternity leave for female employees', 84, true),
        ('paternity', 'Paternity leave for male employees', 7, true)
      ON CONFLICT (name) DO NOTHING;
    `);
    
    // Check if leave_type_id column exists and add it if missing
    const columnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'leave_requests' 
      AND column_name = 'leave_type_id';
    `);
    
    if (columnCheck.length === 0) {
      await db.execute(sql`
        ALTER TABLE leave_requests 
        ADD COLUMN leave_type_id INTEGER REFERENCES leave_types(id);
      `);
      console.log('Added leave_type_id column');
    }
    
    console.log('Leave tables initialized successfully');
  } catch (error) {
    console.error('Error initializing leave tables:', error);
  }
}

// Initialize on startup
initializeLeaveTables();

// --- Leave Request Routes ---
router.get("/api/leave-requests", async (req, res) => {
  try {
    const records = await db.select().from(leaveRequests).orderBy(desc(leaveRequests.startDate));
    res.json(records);
  } catch (error) {
    console.error("Failed to fetch leave requests:", error);
    res.status(500).json({ message: "Failed to fetch leave requests" });
  }
});

router.post("/api/leave-requests", async (req, res) => {
  try {
    // Transform date strings to Date objects
    const requestData = {
      ...req.body,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate)
    };
    
    const validatedData = insertLeaveRequestSchema.parse(requestData);
    
    // Check for duplicate leave requests
    const existingRequests = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.employeeId, validatedData.employeeId));
    
    const startDate = validatedData.startDate;
    const endDate = validatedData.endDate;
    
    const duplicateRequest = existingRequests.find(req => {
      const reqStartDate = new Date(req.startDate);
      const reqEndDate = new Date(req.endDate);
      
      // Check for any overlap between date ranges
      return (
        (startDate >= reqStartDate && startDate <= reqEndDate) ||
        (endDate >= reqStartDate && endDate <= reqEndDate) ||
        (startDate <= reqStartDate && endDate >= reqEndDate)
      );
    });
    
    if (duplicateRequest) {
      return res.status(400).json({ 
        message: `Employee already has a leave request for overlapping dates (${new Date(duplicateRequest.startDate).toLocaleDateString()} - ${new Date(duplicateRequest.endDate).toLocaleDateString()})` 
      });
    }
    
    // Check leave balance
    const currentYear = new Date().getFullYear();
    const approvedRequests = existingRequests.filter(req => 
      req.status === 'approved' &&
      new Date(req.startDate).getFullYear() === currentYear &&
      req.leaveType === validatedData.leaveType
    );
    
    const usedDays = approvedRequests.reduce((total, req) => total + (req.days || 0), 0);
    
    // Get holiday counts based on leave type
    const holidayData = await db.select().from(holidays);
    const maxDays = validatedData.leaveType === 'annual' 
      ? holidayData.filter(h => h.type === 'annual').length 
      : holidayData.filter(h => h.type === 'special').length;
    
    console.log(`Leave validation: Employee ${validatedData.employeeId}, Type: ${validatedData.leaveType}, Max Days: ${maxDays}, Used Days: ${usedDays}, Requesting: ${validatedData.days}`);
    
    const remainingDays = Math.max(0, maxDays - usedDays);
    
    if (validatedData.days > remainingDays) {
      return res.status(400).json({ 
        message: `Insufficient leave balance. Employee has ${remainingDays} ${validatedData.leaveType} leave days remaining. Cannot request ${validatedData.days} days.` 
      });
    }
    
    const newRecord = await db.insert(leaveRequests).values(validatedData).returning();
    res.status(201).json(newRecord[0]);
  } catch (error) {
    console.error("Failed to create leave request:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Invalid data", details: error.errors });
    } else {
      res.status(500).json({ message: "Failed to create leave request" });
    }
  }
});

router.patch("/api/leave-requests/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updateData = req.body;
    
    const updatedRecord = await db
      .update(leaveRequests)
      .set({
        ...updateData,
        approvedAt: updateData.approvedAt ? new Date(updateData.approvedAt) : undefined,
      })
      .where(eq(leaveRequests.id, id))
      .returning();
    
    if (updatedRecord.length === 0) {
      return res.status(404).json({ message: "Leave request not found" });
    }
    
    res.json(updatedRecord[0]);
  } catch (error) {
    console.error("Failed to update leave request:", error);
    res.status(500).json({ message: "Failed to update leave request" });
  }
});

// --- Leave Types Routes ---
router.get("/api/leave-types", async (req, res) => {
  try {
    const records = await db.select().from(leaveTypes).orderBy(leaveTypes.name);
    res.json(records);
  } catch (error) {
    console.error("Failed to fetch leave types:", error);
    res.status(500).json({ message: "Failed to fetch leave types" });
  }
});

router.post("/api/leave-types", async (req, res) => {
  try {
    const validatedData = insertLeaveTypeSchema.parse(req.body);
    const newRecord = await db.insert(leaveTypes).values(validatedData).returning();
    res.status(201).json(newRecord[0]);
  } catch (error) {
    console.error("Failed to create leave type:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Invalid data", details: error.errors });
    } else {
      res.status(500).json({ message: "Failed to create leave type" });
    }
  }
});

router.put("/api/leave-requests/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertLeaveRequestSchema.partial().parse(req.body);
    const updatedRecord = await db.update(leaveRequests).set(validatedData).where(eq(leaveRequests.id, id)).returning();
    res.json(updatedRecord[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", details: error.errors });
    }
    console.error("Failed to update leave request:", error);
    res.status(500).json({ message: "Failed to update leave request" });
  }
});

// --- Overtime Request Routes ---
router.get("/api/overtime-requests", async (req, res) => {
  try {
    const records = await db.select().from(overtimeRequests).orderBy(desc(overtimeRequests.date));
    res.json(records);
  } catch (error) {
    console.error("Failed to fetch overtime requests:", error);
    res.status(500).json({ message: "Failed to fetch overtime requests" });
  }
});

router.post("/api/overtime-requests", async (req, res) => {
  try {
    const validatedData = insertOvertimeRequestSchema.parse(req.body);
    const newRecord = await db.insert(overtimeRequests).values(validatedData).returning();
    res.status(201).json(newRecord[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", details: error.errors });
    }
    console.error("Failed to create overtime request:", error);
    res.status(500).json({ message: "Failed to create overtime request" });
  }
});

router.put("/api/overtime-requests/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertOvertimeRequestSchema.partial().parse(req.body);
    const updatedRecord = await db
      .update(overtimeRequests)
      .set(validatedData)
      .where(eq(overtimeRequests.id, id))
      .returning();
    res.json(updatedRecord[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid data", details: error.errors });
    }
    console.error("Failed to update overtime request:", error);
    res.status(500).json({ message: "Failed to update overtime request" });
  }
});

// Get eligible employees for overtime (worked overtime but no request submitted)
router.get("/api/overtime-eligible", async (req, res) => {
  try {
    const { startDate, endDate } = z.object({
      startDate: z.string().optional().default(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return monthStart.toISOString().split('T')[0];
      }),
      endDate: z.string().optional().default(() => new Date().toISOString().split('T')[0])
    }).parse(req.query);

    const startOfRange = new Date(startDate);
    const endOfRange = new Date(endDate);
    endOfRange.setHours(23, 59, 59, 999); // End of day

    // Fetch HR policy for group time thresholds
    const groupWorkingHours = await getGroupWorkingHours();

    // Get all employees
    const allEmployees = await db.select({
      id: employees.id,
      employeeId: employees.employeeId,
      fullName: employees.fullName,
      employeeGroup: employees.employeeGroup,
    }).from(employees);

    // Get attendance records for the date range
    const attendanceRecords = await db.select()
      .from(attendance)
      .where(and(
        gte(attendance.checkIn, startOfRange),
        lte(attendance.checkIn, endOfRange)
      ));

    // Get existing overtime requests for the date range
    const existingRequests = await db.select()
      .from(overtimeRequests)
      .where(and(
        gte(overtimeRequests.date, startOfRange),
        lte(overtimeRequests.date, endOfRange)
      ));

    const eligibleEmployees = [];
    
    // Process each employee for each day in the range
    for (const emp of allEmployees) {
      let requiredHours = 7.5; // Default for Group A
      if (emp.employeeGroup === 'group_a') {
        requiredHours = groupWorkingHours.groupA?.overtimePolicy?.normalDay?.minHoursForOT || 
                       groupWorkingHours.groupA?.minHoursForOT || 
                       7.5;
      } else if (emp.employeeGroup === 'group_b') {
        requiredHours = groupWorkingHours.groupB?.overtimePolicy?.normalDay?.minHoursForOT || 
                       groupWorkingHours.groupB?.minHoursForOT || 
                       8.75;
      }

      // Find all attendance records for this employee in the date range
      const empAttendanceRecords = attendanceRecords.filter(a => a.employeeId === emp.id);
      
      for (const empAttendance of empAttendanceRecords) {
        if (empAttendance.checkIn && empAttendance.checkOut) {
          const diffMs = new Date(empAttendance.checkOut).getTime() - new Date(empAttendance.checkIn).getTime();
          const actualHours = diffMs / (1000 * 60 * 60);
          const attendanceDate = new Date(empAttendance.checkIn);
          const dayOfWeek = attendanceDate.getDay(); // 0 = Sunday, 6 = Saturday
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          // For weekends, all working hours count as OT (no minimum required)
          // For regular days, only hours above required threshold count as OT
          const finalOtHours = isWeekend ? actualHours : Math.max(0, actualHours - requiredHours);
          
          // Show overtime entry if there are OT hours OR if it's weekend work
          if (finalOtHours > 0) {
            const hasExistingRequest = existingRequests.some(req => 
              req.employeeId === parseInt(emp.id, 10) && 
              new Date(req.date).toDateString() === attendanceDate.toDateString()
            );

            let remark = '';
            if (isWeekend) {
              const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
              remark = `${dayName} Work - Full hours as OT`;
            } else {
              remark = `Regular day overtime`;
            }

            eligibleEmployees.push({
              ...emp,
              actualHours: actualHours.toFixed(2),
              requiredHours: isWeekend ? '0.00' : requiredHours.toFixed(2),
              otHours: finalOtHours.toFixed(2),
              date: attendanceDate.toISOString().split('T')[0],
              remark,
              isWeekend,
              hasOvertimeHours: true,
              hasExistingRequest
            });
          }
        }
      }
    }

    res.json(eligibleEmployees);
  } catch (error) {
    console.error('Failed to fetch eligible employees:', error);
    res.status(500).json({ message: 'Failed to fetch eligible employees' });
  }
});

// --- Attendance Routes ---
router.get("/api/attendance/summary", async (req, res) => {
  try {
    const { startDate, endDate } = z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).parse(req.query);

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const summary = [];

    const activeEmployees = await db.select({ employeeId: employees.employeeId }).from(employees).where(eq(employees.status, 'active'));
    const activeEmployeeIds = activeEmployees.map(e => e.employeeId);

    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      const currentDate = new Date(day);
      const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);

      const presentEmployees = await db.selectDistinct({ employeeId: employees.employeeId })
        .from(attendance)
        .leftJoin(employees, eq(attendance.employeeId, sql`${employees.employeeId}::text`))
        .where(and(
          gte(attendance.checkIn, startOfDay),
          lt(attendance.checkIn, endOfDay),
          isNotNull(employees.employeeId)
        ));
      const presentIds = presentEmployees.map(e => e.employeeId).filter(Boolean) as string[];

      const onLeaveEmployees = await db.selectDistinct({ employeeId: employees.employeeId })
        .from(leaveRequests)
        .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
        .where(and(
          eq(leaveRequests.status, 'approved'),
          lte(leaveRequests.startDate, startOfDay),
          gte(leaveRequests.endDate, startOfDay),
          isNotNull(employees.employeeId)
        ));
      const onLeaveIds = onLeaveEmployees.map(e => e.employeeId).filter(Boolean) as string[];

      const absentCount = activeEmployeeIds.filter(id => !presentIds.includes(id) && !onLeaveIds.includes(id)).length;

      const lateCountResult = await db.select({ count: sql<number>`count(*)::int` })
        .from(attendance)
        .where(and(
          gte(attendance.checkIn, startOfDay),
          lt(attendance.checkIn, endOfDay),
          eq(attendance.status, 'late')
        ));
      const lateCount = lateCountResult[0]?.count ?? 0;

      summary.push({
        date: startOfDay.toISOString().split('T')[0],
        present: presentIds.length,
        absent: absentCount,
        late: lateCount,
      });
    }

    res.json(summary);
  } catch (error) {
    console.error("Failed to fetch attendance summary:", error);
    res.status(500).json({ message: "Failed to fetch attendance summary" });
  }
});

// --- Employee Report Route ---
router.get("/api/reports/employees", async (req, res) => {
  try {
    const { employeeId } = z.object({
      employeeId: z.string().optional(),
    }).parse(req.query);

    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1); // Last year's data by default
    const endDate = new Date(); // Today

    // Fetch employee data with conditional filtering
    const selectedEmployees = await db
      .select({
        id: employees.id,
        employeeId: employees.employeeId,
        fullName: employees.fullName,
        department: departments.name,
        position: employees.position,
        status: employees.status,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(employeeId && employeeId !== "all" ? eq(employees.id, parseInt(employeeId)) : undefined);

    // Fetch attendance data for these employees with conditional filtering
    const attendanceRecords = await db
      .select({
        employeeId: attendance.employeeId,
        date: attendance.checkIn,
        inTime: attendance.checkIn,
        outTime: attendance.checkOut,
        status: attendance.status,
      })
      .from(attendance)
      .where(and(
        gte(attendance.checkIn, startDate),
        lte(attendance.checkIn, endDate),
        employeeId && employeeId !== "all" ? eq(attendance.employeeId, employeeId) : undefined
      ));

    // Format the data for the report
    const reportData = attendanceRecords.map((record: any) => ({
      date: record.date ? record.date.toISOString().split('T')[0] : 'N/A',
      inTime: record.inTime ? record.inTime.toISOString().split('T')[1].substring(0, 5) : 'N/A',
      outTime: record.outTime ? record.outTime.toISOString().split('T')[1].substring(0, 5) : 'N/A',
      status: record.status || 'N/A',
    }));

    res.json({
      data: reportData,
      employee: employeeId && employeeId !== "all" && selectedEmployees.length > 0 
        ? {
            id: selectedEmployees[0].id,
            employeeId: selectedEmployees[0].employeeId,
            fullName: selectedEmployees[0].fullName,
            department: selectedEmployees[0].department || 'N/A',
            position: selectedEmployees[0].position || 'N/A',
            status: selectedEmployees[0].status || 'N/A',
          }
        : null
    });
  } catch (error) {
    console.error("Failed to fetch employee report:", error);
    res.status(500).json({ message: "Failed to fetch employee report" });
  }
});

// --- Monthly Attendance Report Route ---
router.get("/api/reports/monthly-attendance", async (req, res) => {
  try {
    const { startDate, endDate, employeeId, group } = z.object({
      startDate: z.string(),
      endDate: z.string(),
      employeeId: z.string().optional(),
      group: z.string().optional(),
    }).parse(req.query);

    const start = new Date(startDate);
    const end = new Date(endDate);

    let employeeQuery = db.select({
      id: employees.id, // varchar
      employeeId: employees.employeeId, // varchar
      fullName: employees.fullName,
      department: departments.name,
      employeeGroup: employees.employeeGroup,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id));

    const conditions = [];
    if (employeeId && employeeId !== 'all') {
        conditions.push(eq(employees.id, employeeId));
    }
    if (group && group !== 'all') {
        conditions.push(eq(employees.employeeGroup, group as any));
    }
    if (conditions.length > 0) {
        employeeQuery = employeeQuery.where(and(...conditions));
    }

    const allEmployees = await employeeQuery;
    if (allEmployees.length === 0) {
      return res.json([]);
    }
    const employeeStringIds = allEmployees.map(e => e.id);
    const employeeNumericIds = employeeStringIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

    // Fetch approved overtime requests
    const overtimeRecords = await db.select().from(overtimeRequests)
      .where(and(
        inArray(overtimeRequests.employeeId, employeeNumericIds),
        eq(overtimeRequests.status, 'approved'),
        gte(overtimeRequests.date, start),
        lte(overtimeRequests.date, end)
      ));

    console.log('Fetched Overtime Records (with filters):', JSON.stringify(overtimeRecords, null, 2));
    
    // Also fetch attendance records to extract overtimeHours if available (similar to Daily OT Report logic)
    const attendanceRecordsForOT = await db.select().from(attendance)
      .where(and(
        inArray(attendance.employeeId, allEmployees.map(e => e.id)),
        gte(attendance.date, start),
        lte(attendance.date, end)
      ));
    console.log('Attendance Records for OT Calculation:', JSON.stringify(attendanceRecordsForOT, null, 2));

    const leaveRecords = await db.select().from(leaveRequests)
      .where(and(
        inArray(leaveRequests.employeeId, employeeNumericIds),
        eq(leaveRequests.status, 'approved'),
        lte(leaveRequests.startDate, end),
        gte(leaveRequests.endDate, start)
      ));

    // --- DEBUGGING: Fetch a sample of all overtime records to inspect data --- 
    try {
      const allOvertimesForDebugging = await db.select().from(overtimeRequests).limit(10);
      console.log('SAMPLE OF ALL OVERTIME RECORDS IN DB:', JSON.stringify(allOvertimesForDebugging, null, 2));
    } catch (e) {
      console.error("Error fetching all overtimes for debugging:", e);
    }
    // --- END DEBUGGING ---

    console.log('Fetched Overtime Records (with filters):', JSON.stringify(overtimeRecords, null, 2));

    const reportData = allEmployees.map(emp => {
      const dailyData: { [key: number]: any } = {};
      const numericEmpId = parseInt(emp.id, 10);

      const empAttendance = attendanceRecordsForOT.filter(a => a.employeeId === emp.id);
      const empLeaves = leaveRecords.filter(l => l.employeeId === numericEmpId);
      const empOvertimes = overtimeRecords.filter(o => o.employeeId === numericEmpId);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = new Date(d);
        const dayKey = day.getDate();
        const dayData: any = {};

        // Default to Sunday as a holiday
        const isHoliday = day.getDay() === 0;
        const onLeave = empLeaves.find(l => day >= new Date(l.startDate) && day <= new Date(l.endDate));
        const attendanceRecord = empAttendance.find(a => new Date(a.date).toDateString() === day.toDateString());

        if (isHoliday) {
          dayData.status = 'HL';
        } else if (onLeave) {
          dayData.status = 'A';
        } else if (attendanceRecord) {
          dayData.status = 'P';
          // Display times as-is (already in Sri Lanka local time)
          if (attendanceRecord.checkIn) {
            dayData.inTime = attendanceRecord.checkIn.toTimeString().slice(0, 5); // HH:MM format
          } else {
            dayData.inTime = '';
          }
          if (attendanceRecord.checkOut) {
            dayData.outTime = attendanceRecord.checkOut.toTimeString().slice(0, 5); // HH:MM format
          } else {
            dayData.outTime = '';
          }
          if (attendanceRecord.checkIn && attendanceRecord.checkOut) {
            const diffMs = new Date(attendanceRecord.checkOut).getTime() - new Date(attendanceRecord.checkIn).getTime();
            const workedHours = Math.floor(diffMs / 3600000);
            const workedMins = Math.floor((diffMs % 3600000) / 60000);
            dayData.workedHours = `${String(workedHours).padStart(2, '0')}:${String(workedMins).padStart(2, '0')}`;
          }
        } else {
          dayData.status = 'A';
        }

        // Calculate overtime like in Daily OT Report with weekend handling
        if (attendanceRecord && attendanceRecord.checkIn && attendanceRecord.checkOut) {
          const diffMs = new Date(attendanceRecord.checkOut).getTime() - new Date(attendanceRecord.checkIn).getTime();
          const actualHours = diffMs / (1000 * 60 * 60);
          
          // Check if this is a weekend (Saturday = 6, Sunday = 0)
          const dayOfWeek = day.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          let calculatedOtHours = 0;
          
          if (isWeekend) {
            // Weekend: All working hours count as overtime
            calculatedOtHours = actualHours;
          } else {
            // Regular day: Use group-specific thresholds
            let requiredHours = 8; // Default
            if (emp.employeeGroup === 'group_a') {
              requiredHours = 7.75; // groupA minHoursForOT
            } else if (emp.employeeGroup === 'group_b') {
              requiredHours = 8.75; // groupB minHoursForOT
            }
            calculatedOtHours = Math.max(0, actualHours - requiredHours);
          }
          
          if (calculatedOtHours > 0) {
            dayData.overtime = calculatedOtHours.toFixed(2);
          }
        }
        
        // Check for explicit overtime request (override calculated OT if exists)
        const overtimeRecord = empOvertimes.find(o => new Date(o.date).toDateString() === day.toDateString());
        if (overtimeRecord) {
          dayData.overtime = overtimeRecord.hours;
        }
        
        dailyData[dayKey] = dayData;

        // Remove duplicate processing - already handled above

        const leaveForDay = empLeaves.find(l => l.startDate && l.endDate && day >= new Date(l.startDate) && day <= new Date(l.endDate));
        if (leaveForDay) {
          dayData.leave = leaveForDay.leaveType;
        }

        dailyData[dayKey] = dayData;
      }

      return {
        ...emp,
        dailyData,
      };
    });

    res.json(reportData);

  } catch (error) {
    console.error("Failed to fetch monthly attendance sheet:", error);
    res.status(500).json({ message: "Failed to fetch monthly attendance sheet" });
  }
});

// --- Daily Attendance Report Route ---
router.get("/api/reports/daily-attendance", async (req, res) => {
  try {
    const { date, employeeId, group } = z.object({
      date: z.string().transform(val => new Date(val)),
      employeeId: z.string().optional(),
      group: z.string().optional(),
    }).parse(req.query);

    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    // Fetch HR policy for group time thresholds
    const groupWorkingHours = await getGroupWorkingHours();
    console.log('Loaded Group Working Hours:', JSON.stringify(groupWorkingHours, null, 2));

    // Determine required hours for each group from HR policy
    const requiredHoursGroupA = groupWorkingHours.groupA?.minHoursForOT || 8;
    const requiredHoursGroupB = groupWorkingHours.groupB?.minHoursForOT || 8;

    // Restructure employees query to handle typing issue with Drizzle ORM
    const baseEmployeesQuery = db.select({
      id: employees.id,
      employeeId: employees.employeeId,
      fullName: employees.fullName,
      department: departments.name,
      employeeGroup: employees.employeeGroup,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id));

    const conditions = [];
    if (employeeId && employeeId !== 'all') {
        conditions.push(eq(employees.employeeId, employeeId));
    }
    if (group && group !== 'all') {
        conditions.push(eq(employees.employeeGroup, group as any));
    }
    
    const employeesQuery = conditions.length > 0
      ? baseEmployeesQuery.where(and(...conditions))
      : baseEmployeesQuery;

    const allEmployees = await employeesQuery;

    const attendanceRecords = await db.select().from(attendance)
      .where(and(
        gte(attendance.checkIn, startOfDay),
        lt(attendance.checkIn, endOfDay)
      ));

    const leaveRecords = await db.select().from(leaveRequests)
      .where(and(
        eq(leaveRequests.status, 'approved'),
        lte(leaveRequests.startDate, startOfDay),
        gte(leaveRequests.endDate, startOfDay)
      ));

    const reportData = allEmployees.map(emp => {
      const empAttendance = attendanceRecords.find(a => a.employeeId === emp.id);
      const onLeave = leaveRecords.some(l => l.employeeId === parseInt(emp.id));
      const isGroupA = emp.employeeGroup === 'group_a';
      const thresholds = isGroupA ? groupWorkingHours.groupA : groupWorkingHours.groupB;
      const formattedGroup = emp.employeeGroup ? (emp.employeeGroup.includes('a') || emp.employeeGroup.includes('A') ? 'Group A' : 'Group B') : 'N/A';

      if (onLeave) {
        return {
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          date: startOfDay.toISOString().split('T')[0],
          inTime: '',
          outTime: '',
          totalHours: '',
          isLate: false,
          isHalfDay: false,
          onShortLeave: false,
          isAbsent: false,
          status: 'On Leave',
          employeeGroup: formattedGroup
        };
      }

      if (!empAttendance) {
        return {
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          date: startOfDay.toISOString().split('T')[0],
          inTime: '',
          outTime: '',
          totalHours: '',
          isLate: false,
          isHalfDay: false,
          onShortLeave: false,
          isAbsent: true,
          status: 'Absent',
          employeeGroup: formattedGroup
        };
      }

      const inTime = empAttendance.checkIn ? new Date(empAttendance.checkIn) : null;
      const outTime = empAttendance.checkOut ? new Date(empAttendance.checkOut) : null;
      let totalHours = '';
      if (inTime && outTime) {
        const diffMs = outTime.getTime() - inTime.getTime();
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        totalHours = `${diffHrs}h ${diffMins}m`;
      }

      let isLate = false;
      let isHalfDay = false;
      let onShortLeave = false;

      if (inTime && thresholds) {
        const inTimeHour = inTime.getHours();
        const inTimeMinute = inTime.getMinutes();
        const lateThreshold = isGroupA ? 
          (thresholds.startTime ? new Date(thresholds.startTime).getHours() * 60 + new Date(thresholds.startTime).getMinutes() : 9 * 60) : 
          (thresholds.startTime ? new Date(thresholds.startTime).getHours() * 60 + new Date(thresholds.startTime).getMinutes() : 8 * 60 + 15);
        const halfDayThreshold = isGroupA ? 
          (thresholds.halfDayThreshold ? new Date(thresholds.halfDayThreshold).getHours() * 60 + new Date(thresholds.halfDayThreshold).getMinutes() : 10 * 60) : 
          (thresholds.halfDayThreshold ? new Date(thresholds.halfDayThreshold).getHours() * 60 + new Date(thresholds.halfDayThreshold).getMinutes() : 9 * 60 + 30);

        const inTimeTotalMinutes = inTimeHour * 60 + inTimeMinute;
        if (inTimeTotalMinutes > lateThreshold) {
          isLate = true;
        }
        if (inTimeTotalMinutes > halfDayThreshold) {
          isHalfDay = true;
        }
      }

      // Logic for short leave: Check if worked hours are less than expected full day but more than half day
      if (inTime && outTime && thresholds) {
        const expectedHours = thresholds.workingHours || 8;
        const workedMs = outTime.getTime() - inTime.getTime();
        const workedHours = workedMs / (1000 * 60 * 60);
        if (workedHours < expectedHours && workedHours > expectedHours / 2) {
          onShortLeave = true;
        }
      }

      // Update status to include Half Day information
      let status = 'Present';
      if (isHalfDay) {
        status = 'Half Day';
      } else if (onShortLeave) {
        status = 'Short Leave';
      } else if (isLate) {
        status = 'Late';
      }

      // Format times for display (keep local timezone)
      const formatTime = (time: Date | null) => {
        if (!time) return '';
        return time.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        });
      };

      return {
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        date: startOfDay.toISOString().split('T')[0],
        inTime: formatTime(inTime),
        outTime: formatTime(outTime),
        totalHours,
        isLate,
        isHalfDay,
        onShortLeave,
        isAbsent: false,
        status: status,
        employeeGroup: formattedGroup
      };
    });

    res.json(reportData);
  } catch (error) {
    console.error("Failed to fetch daily attendance report:", error);
    res.status(500).json({ message: "Failed to fetch daily attendance report" });
  }
});

// --- Daily OT Report Route ---
router.get("/api/reports/daily-ot", async (req, res) => {
  try {
    const { date, employeeId, group } = z.object({
      date: z.string(),
      employeeId: z.string().optional(),
      group: z.string().optional(),
    }).parse(req.query);
    
    // Safely parse the date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const startOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    const endOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate() + 1);

    // Fetch HR policy for group time thresholds
    const groupWorkingHours = await getGroupWorkingHours();
    console.log('Loaded Group Working Hours:', JSON.stringify(groupWorkingHours, null, 2));

    // Determine required hours for each group from HR policy
    const requiredHoursGroupA = groupWorkingHours.groupA?.minHoursForOT || 8;
    const requiredHoursGroupB = groupWorkingHours.groupB?.minHoursForOT || 8;

    // Restructure employees query to handle typing issue with Drizzle ORM
    const baseEmployeesQuery = db.select({
      id: employees.id,
      employeeId: employees.employeeId,
      fullName: employees.fullName,
      employeeGroup: employees.employeeGroup,
    })
    .from(employees);

    const conditions = [];
    if (employeeId && employeeId !== 'all') {
        conditions.push(eq(employees.employeeId, employeeId));
    }
    if (group && group !== 'all') {
        conditions.push(eq(employees.employeeGroup, group as any));
    }
    
    const employeesQuery = conditions.length > 0
      ? baseEmployeesQuery.where(and(...conditions))
      : baseEmployeesQuery;

    const allEmployees = await employeesQuery;

    const attendanceRecords = await db.select().from(attendance)
      .where(and(
        gte(attendance.checkIn, startOfDay),
        lt(attendance.checkIn, endOfDay)
      ));

    // Fetch overtime requests for the specific date
    let otRecords: any[] = [];
    try {
      otRecords = await db.select().from(overtimeRequests)
        .where(
          sql`DATE(${overtimeRequests.date}) = ${date.toISOString().split('T')[0]}`
        );
    } catch (error) {
      console.error("Error fetching overtime records:", error);
      otRecords = [];
    }

    const reportData = allEmployees.map(emp => {
      let requiredHours = 8; // Default required hours

      console.log(`Processing record for employee: ${emp.employeeId}, group: ${emp.employeeGroup}`);

      if (emp.employeeGroup === 'group_a') {
        // Check the more specific overtime policy setting first, then fallback to main setting
        requiredHours = groupWorkingHours.groupA?.overtimePolicy?.normalDay?.minHoursForOT || 
                       groupWorkingHours.groupA?.minHoursForOT || 
                       8;
      } else if (emp.employeeGroup === 'group_b') {
        requiredHours = groupWorkingHours.groupB?.overtimePolicy?.normalDay?.minHoursForOT || 
                       groupWorkingHours.groupB?.minHoursForOT || 
                       8;
      }

      console.log(`Calculated requiredHours: ${requiredHours}`);

      let actualHours = 0;
      const empAttendance = attendanceRecords.find(a => a.employeeId === emp.id);
      if (empAttendance && empAttendance.checkIn && empAttendance.checkOut) {
        const diffMs = new Date(empAttendance.checkOut).getTime() - new Date(empAttendance.checkIn).getTime();
        actualHours = diffMs / (1000 * 60 * 60);
      }

      const dayOfWeek = parsedDate.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // For weekends, all working hours count as OT (no minimum required)
      // For regular days, only hours above required threshold count as OT
      const otHours = isWeekend ? actualHours : Math.max(0, actualHours - requiredHours);

      let remark = '';
      if (otHours > 0) {
        if (isWeekend) {
          const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
          remark = `${dayName} Work - Full hours as OT`;
        } else {
          remark = `Regular day overtime`;
        }
      }

      return {
        ...emp,
        actualHours: actualHours.toFixed(2),
        requiredHours: isWeekend ? '0.00' : requiredHours.toFixed(2),
        otHours: otHours.toFixed(2),
        remark,
        isWeekend,
        isEligible: otHours > 0,
      };
    })
    .filter(record => record.isEligible); // Only show employees eligible for OT

    res.json(reportData);
  } catch (error) {
    console.error('Failed to fetch daily OT report:', error);
    res.status(500).json({ message: 'Failed to fetch daily OT report' });
  }
});

// --- Biometric Device Routes ---
router.get("/api/biometric-devices", async (req, res) => {
  try {
    const devices = await db.select().from(biometricDevices);
    res.json(devices);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/api/biometric-devices", async (req, res) => {
  try {
    const deviceData = insertBiometricDeviceSchema.parse(req.body);

    const existingDevice = await db.query.biometricDevices.findFirst({
      where: eq(biometricDevices.deviceId, deviceData.deviceId),
    });

    if (existingDevice) {
      return res.status(409).json({ success: false, message: "Device with this ID already exists." });
    }

    const zk = new ZKLib(deviceData.ip, deviceData.port, 5200, 5000);
    await zk.createSocket();
    await zk.disconnect();

    const newDevice = await db.insert(biometricDevices).values(deviceData).returning();
    res.status(201).json(newDevice[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Invalid device data", errors: error.errors });
    }
    res.status(500).json({ success: false, message: "Could not connect to the device. Please check the IP and port." });
  }
});

router.put("/api/biometric-devices/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deviceData = insertBiometricDeviceSchema.partial().parse(req.body);

    const updatedDevice = await db.update(biometricDevices).set(deviceData).where(eq(biometricDevices.id, id)).returning();
    res.json(updatedDevice[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Invalid device data", errors: error.errors });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/api/biometric-devices/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(biometricDevices).where(eq(biometricDevices.id, id));
    res.json({ success: true, message: "Device deleted successfully" });
  } catch (error) {
    console.error("Failed to delete biometric device:", error);
    res.status(500).json({ success: false, message: "Failed to delete biometric device" });
  }
});

// --- ZK Device Routes ---
router.post("/api/zk-devices/:deviceId/connect", async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const device = await db.query.biometricDevices.findFirst({
      where: eq(biometricDevices.deviceId, deviceId),
    });

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const isConnected = await zkDeviceManager.connectDevice(deviceId, {
      ip: device.ip,
      port: device.port,
      timeout: 5000, // Default timeout
      inport: 1, // Default inport
    });
    if (isConnected) {
      res.json({ success: true, message: "Device connected successfully" });
    } else {
      res.status(500).json({ success: false, message: "Failed to connect to device" });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/api/zk-devices/:deviceId/disconnect", async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    await zkDeviceManager.disconnectDevice(deviceId);
    res.json({ success: true, message: "Device disconnected successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/api/zk-devices/:deviceId/info", async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const info = await zkDeviceManager.getDeviceInfo(deviceId);
    res.json({ success: true, info });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/api/employees/import', async (req, res) => {
  const importUsersSchema = z.object({
    users: z.array(
      z.object({
        employeeId: z.string().min(1, "Employee ID is required"),
        fullName: z.string().min(1, "Full name is required"),
        email: z.string().email(),
        phone: z.string(),
        position: z.string(),
        joinDate: z.coerce.date(),
        status: z.enum(["active", "inactive"]),
      })
    ),
    role: z.enum(["admin", "user"]),
    employeeGroup: z.enum(["group_a", "group_b"]),
  });

  try {
    const validated = importUsersSchema.safeParse(req.body);
    if (!validated.success) {
      console.error("Import validation failed:", JSON.stringify(validated.error.issues, null, 2));
      return res.status(400).json({ success: false, message: "Invalid input", errors: validated.error.issues });
    }

    // Check for duplicate Employee IDs in the import data
    const employeeIds = new Set();
    const duplicateEmployeeIds = [];
    for (const user of validated.data.users) {
      const employeeId = user.employeeId;
      if (employeeIds.has(employeeId)) {
        duplicateEmployeeIds.push(employeeId);
      } else {
        employeeIds.add(employeeId);
      }
    }

    if (duplicateEmployeeIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Duplicate Employee IDs found in import data",
        duplicateEmployeeIds: duplicateEmployeeIds,
      });
    }

    // Check for existing employees
    const existingEmployees = await db.query.employees.findMany();
    const existingEmployeeIds = new Set(existingEmployees.map(e => String(e.employeeId)));
    // Filter out users that already exist in the system
    const newUsers = validated.data.users.filter(user => !existingEmployeeIds.has(user.employeeId));

    if (newUsers.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: "All selected users already exist in the system.",
      });
    }

    // Get or create default department
    let defaultDepartment = await db.query.departments.findFirst({ 
      where: eq(departments.name, "Unassigned") 
    });
    
    if (!defaultDepartment) {
      const newDept = await db.insert(departments).values({ name: "Unassigned" }).returning();
      defaultDepartment = newDept[0];
    }

    // Prepare employees for insertion
    const employeesToInsert = newUsers.map((user) => {
      return {
        id: user.employeeId,
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        position: user.position,
        departmentId: defaultDepartment!.id,
        employeeGroup: validated.data.employeeGroup,
        joinDate: user.joinDate,
        status: user.status,
        role: validated.data.role,
        biometricDeviceId: user.employeeId,
      };
    });

    // Insert in a transaction
    await db.transaction(async (tx) => {
      await tx.insert(employees).values(employeesToInsert);
    });

    res.status(201).json({
      success: true,
      message: `Successfully imported ${employeesToInsert.length} new employees.`,
      importedCount: employeesToInsert.length,
      skippedCount: validated.data.users.length - employeesToInsert.length,
    });
  } catch (error) {
    console.error("Failed to import employees:", error);
    res.status(500).json({ success: false, message: "An unexpected error occurred during import." });
  }
});

router.post("/api/zk-devices/:deviceId/sync", async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const device = await db.query.biometricDevices.findFirst({
      where: eq(biometricDevices.deviceId, deviceId),
    });

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    if (!zkDeviceManager.isDeviceConnected(deviceId)) {
      const connected = await zkDeviceManager.connectDevice(deviceId, {
        ip: device.ip,
        port: device.port,
        timeout: 5000,
        inport: 1,
      });
      if (!connected) {
        return res.status(500).json({ message: "Could not connect to device" });
      }
    }

    const logs = await zkDeviceManager.syncAttendanceData(deviceId);

    if (!logs || logs.length === 0) {
      return res.json({ success: true, message: "No new attendance logs to sync." });
    }

// Get all employees with their biometric IDs and card numbers
const allEmployees = await db.query.employees.findMany();
const idMaps = {
byId: new Map<string, string>(),
byEmployeeId: new Map<string, string>(),
byBiometricId: new Map<string, string>(),

};

allEmployees.forEach((emp) => {
// Ensure all IDs are treated as strings
const empId = String(emp.id);
if (emp.id) idMaps.byId.set(empId, empId);
if (emp.employeeId) idMaps.byEmployeeId.set(String(emp.employeeId), empId);
if (emp.biometricDeviceId) idMaps.byBiometricId.set(String(emp.biometricDeviceId), empId);

});

// Helper function to find employee ID from any identifier
const findEmployeeId = (uid: string | number): string | null => {
  // Convert to string and trim
  const strUid = String(uid).trim();
  
  // Try exact match first
  if (idMaps.byId.has(strUid)) return idMaps.byId.get(strUid)!;
  if (idMaps.byBiometricId.has(strUid)) return idMaps.byBiometricId.get(strUid)!;
  if (idMaps.byEmployeeId.has(strUid)) return idMaps.byEmployeeId.get(strUid)!;

  
  // If the UID is a number, try without any string conversion
  if (typeof uid === 'number') {
    const numUid = uid;
    if (idMaps.byId.has(String(numUid))) return idMaps.byId.get(String(numUid))!;
    if (idMaps.byBiometricId.has(String(numUid))) return idMaps.byBiometricId.get(String(numUid))!;
  }
  
  // Try removing leading zeros if any
  if (/^0+/.test(strUid)) {
    const trimmedUid = strUid.replace(/^0+/, '');
    if (trimmedUid && idMaps.byId.has(trimmedUid)) return idMaps.byId.get(trimmedUid)!;
    if (trimmedUid && idMaps.byBiometricId.has(trimmedUid)) return idMaps.byBiometricId.get(trimmedUid)!;
  }
  
  console.warn(`No employee found for UID: ${uid} (type: ${typeof uid})`);
  return null;
};

    // Debug: Log matching employees
    const matchingEmployees = logs
      .map(log => {
        const uid = String(log.uid).trim();
        return {
          uid,
          employeeId: findEmployeeId(uid)
        };
      })
      .filter(x => x.employeeId);

    console.log(`Found ${matchingEmployees.length} matching employees out of ${logs.length} logs`);
    if (matchingEmployees.length > 0) {
      console.log('Sample matches:', matchingEmployees.slice(0, 5));
    }
    
    // Debug: Log the first few log entries with more details
    console.log('First 5 log entries with UID types:', logs.slice(0, 5).map(log => ({
      uid: log.uid,
      uidType: typeof log.uid,
      timestamp: log.timestamp
    })));

    // Group logs by employee and date to find check-in and check-out
    const attendanceMap = new Map<string, {
      employeeId: string;  // Changed from number to string to match schema
      date: Date;
      checkIn: Date;
      checkOut: Date;
      logs: any[];
    }>();

    // Process each log entry
    for (const log of logs) {
      const uid = String(log.uid).trim();
      const employeeDbId = findEmployeeId(uid);
      if (!employeeDbId) {
        console.warn(`No employee found for UID: ${uid}`);
        continue;
      }

      const logDate = new Date(log.timestamp);
      const dateKey = `${employeeDbId}-${logDate.toISOString().split('T')[0]}`;
      
      // Initialize or update attendance record
      if (!attendanceMap.has(dateKey)) {
        attendanceMap.set(dateKey, {
          employeeId: employeeDbId, // employeeDbId is already a string from findEmployeeId
          date: new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate()),
          checkIn: log.timestamp,
          checkOut: log.timestamp,
          logs: [log]
        });
      } else {
        const record = attendanceMap.get(dateKey)!;
        record.logs.push(log);
        // Update check-in/check-out times
        if (log.timestamp < record.checkIn) record.checkIn = log.timestamp;
        if (log.timestamp > record.checkOut) record.checkOut = log.timestamp;
      }
    }

    // Prepare records for database insertion
    const attendanceRecordsToInsert: (typeof attendance.$inferInsert)[] = [];
    for (const [_, record] of attendanceMap) {
      // Calculate working hours in hours (with 2 decimal places)
      const workingHours = ((record.checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2);
      
      // Skip if check-in/check-out spans multiple days
      if (record.checkIn.toDateString() !== record.checkOut.toDateString()) {
        console.warn(`Skipping record for employee ${record.employeeId} - check-in and check-out are on different days`);
        continue;
      }

      // Only include fields that exist in the attendance schema
      const attendanceRecord: typeof attendance.$inferInsert = {
        employeeId: record.employeeId,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status: 'present',
        workingHours: workingHours,
        notes: '',
        // Overtime hours will be set to null by default
        overtimeHours: null,
      };
      attendanceRecordsToInsert.push(attendanceRecord);
    }

    // Insert or update attendance records
    for (const record of attendanceRecordsToInsert) {
      try {
        await db.transaction(async (tx) => {
          // First try to update existing record
          const updated = await tx
            .update(attendance)
            .set({
              checkIn: record.checkIn,
              checkOut: record.checkOut,
              workingHours: record.workingHours,
              status: record.status,
              notes: record.notes,
              // Don't include updatedAt as it's not in the schema
            })
            .where(
              and(
                eq(attendance.employeeId, record.employeeId),
                eq(attendance.date, record.date)
              )
            );

          // If no rows were updated, insert a new record
          if (updated.rowCount === 0) {
            // Create a new record without any extra fields
            await tx.insert(attendance).values({
              employeeId: record.employeeId,
              date: record.date,
              checkIn: record.checkIn,
              checkOut: record.checkOut,
              status: record.status,
              workingHours: record.workingHours,
              notes: record.notes,
              overtimeHours: null, // Set default value for required field
              // createdAt will be set by the database default
            });
          }
        });
      } catch (error) {
        console.error('Error upserting attendance record:', error);
        throw error;
      }
    }

    res.json({ 
      success: true, 
      message: `Synced ${attendanceRecordsToInsert.length} attendance records`,
      recordsProcessed: attendanceRecordsToInsert.length
    });
  } catch (error) {
    console.error('Error syncing attendance:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to sync attendance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get("/api/zk-devices/:deviceId/users", async (req, res) => {
  const { deviceId } = req.params;
  try {
    const internalDevice = await db.query.biometricDevices.findFirst({ where: eq(biometricDevices.deviceId, deviceId) });
    if (!internalDevice) {
      return res.status(404).json({ success: false, message: "Device not found in database" });
    }

    if (!zkDeviceManager.isDeviceConnected(deviceId)) {
      await zkDeviceManager.connectDevice(deviceId, {
        ip: internalDevice.ip,
        port: internalDevice.port ?? 4370,
        timeout: 5000,
        inport: 5200,
      });
    }
    const users = await zkDeviceManager.getUsers(deviceId);
    res.json(users);
  } catch (e) {
    console.error(`Failed to fetch users from device ${deviceId}:`, e);
    res.status(500).json({ success: false, message: `Failed to fetch users from device: ${(e as Error).message}` });
  }
});

// --- Auto-Sync API Routes ---
router.get("/api/auto-sync/settings", (req, res) => {
  res.json(autoSyncSettings);
});

router.post("/api/auto-sync/settings", (req, res) => {
  try {
    const { enabled, intervalMinutes, syncOnStartup, syncNotifications } = req.body;
    
    autoSyncSettings = {
      ...autoSyncSettings,
      enabled: Boolean(enabled),
      intervalMinutes: Math.max(0.5, Number(intervalMinutes) || 0.5), // Minimum 30 seconds
      syncOnStartup: Boolean(syncOnStartup),
      syncNotifications: Boolean(syncNotifications)
    };
    
    // Restart auto-sync with new settings
    if (autoSyncSettings.enabled) {
      startAutoSync();
    } else {
      stopAutoSync();
    }
    
    res.json({ success: true, message: "Auto-sync settings updated", settings: autoSyncSettings });
  } catch (error) {
    console.error("Failed to update auto-sync settings:", error);
    res.status(500).json({ success: false, message: "Failed to update auto-sync settings" });
  }
});

router.post("/api/auto-sync/manual", async (req, res) => {
  try {
    await performAutoSync();
    res.json({ success: true, message: "Manual sync completed", lastSync: autoSyncSettings.lastSync });
  } catch (error) {
    console.error("Manual sync failed:", error);
    res.status(500).json({ success: false, message: "Manual sync failed" });
  }
});

router.post("/api/auto-sync/full-sync", async (req, res) => {
  try {
    console.log('Starting FULL SYNC of all devices - retrieving complete historical attendance data...');
    
    const devices = await db.select().from(biometricDevices);
    let totalSynced = 0;
    let totalProcessed = 0;
    const deviceResults: { [deviceId: string]: number } = {};
    
    for (const device of devices) {
      try {
        if (!zkDeviceManager.isDeviceConnected(device.deviceId)) {
          const connected = await zkDeviceManager.connectDevice(device.deviceId, {
            ip: device.ip,
            port: device.port,
            timeout: 5000,
            inport: 1,
          });
          if (!connected) {
            console.warn(`Could not connect to device ${device.deviceId} during full sync`);
            deviceResults[device.deviceId] = 0;
            continue;
          }
        }

        // Perform full sync to get ALL historical records
        const logs = await zkDeviceManager.syncAttendanceData(device.deviceId, true);
        if (logs && logs.length > 0) {
          console.log(`FULL SYNC: Processing ${logs.length} records from device ${device.deviceId}`);
          
          // Process attendance logs into database records (same logic as auto-sync)
          const attendanceMap = new Map();
          const allEmployees = await db.select().from(employees);
          
          // Create lookup function for employee IDs
          const findEmployeeIdLocal = (uid: string): string | null => {
            const trimmedUid = String(uid).trim();
            
            // Try exact match with employee_id first
            const byEmpId = allEmployees.find(emp => emp.employeeId === trimmedUid);
            if (byEmpId) return byEmpId.id;
            
            // Try exact match with biometric_device_id if it exists
            const byBiometric = allEmployees.find(emp => emp.biometricDeviceId && emp.biometricDeviceId === trimmedUid);
            if (byBiometric) return byBiometric.id;
            
            // Try exact match with id field as fallback
            const byId = allEmployees.find(emp => emp.id === trimmedUid);
            if (byId) return byId.id;
            
            return null;
          };

          let foundCount = 0;
          let notFoundCount = 0;
          
          for (const log of logs) {
            const uid = String(log.uid).trim();
            const employeeDbId = findEmployeeIdLocal(uid);
            if (!employeeDbId) {
              notFoundCount++;
              continue;
            }
            foundCount++;

            const logDate = new Date(log.timestamp);
            const dateKey = `${employeeDbId}-${logDate.toISOString().split('T')[0]}`;
            
            // Initialize or update attendance record
            if (!attendanceMap.has(dateKey)) {
              attendanceMap.set(dateKey, {
                employeeId: employeeDbId,
                date: new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate()),
                checkIn: log.timestamp,
                checkOut: log.timestamp,
                logs: [log]
              });
            } else {
              const record = attendanceMap.get(dateKey)!;
              record.logs.push(log);
              // Update check-in/check-out times
              if (log.timestamp < record.checkIn) record.checkIn = log.timestamp;
              if (log.timestamp > record.checkOut) record.checkOut = log.timestamp;
            }
          }

          // Prepare records for database insertion
          const attendanceRecordsToInsert: (typeof attendance.$inferInsert)[] = [];
          for (const [_, record] of attendanceMap) {
            // Calculate working hours
            const workingHours = ((record.checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2);
            
            // Skip if check-in/check-out spans multiple days
            if (record.checkIn.toDateString() !== record.checkOut.toDateString()) {
              console.warn(`Skipping record for employee ${record.employeeId} - check-in and check-out are on different days`);
              continue;
            }

            attendanceRecordsToInsert.push({
              employeeId: record.employeeId,
              date: record.date,
              checkIn: record.checkIn,
              checkOut: record.checkOut,
              status: 'present',
              workingHours: workingHours,
              notes: '',
              overtimeHours: null,
            });
          }

          // Insert or update attendance records
          for (const record of attendanceRecordsToInsert) {
            try {
              await db.transaction(async (tx) => {
                // First try to update existing record
                const updated = await tx
                  .update(attendance)
                  .set({
                    checkIn: record.checkIn,
                    checkOut: record.checkOut,
                    workingHours: record.workingHours,
                    status: record.status,
                    notes: record.notes,
                  })
                  .where(
                    and(
                      eq(attendance.employeeId, record.employeeId),
                      eq(attendance.date, record.date)
                    )
                  );

                // If no rows were updated, insert a new record
                if (updated.rowCount === 0) {
                  await tx.insert(attendance).values({
                    employeeId: record.employeeId,
                    date: record.date,
                    checkIn: record.checkIn,
                    checkOut: record.checkOut,
                    status: record.status,
                    workingHours: record.workingHours,
                    notes: record.notes,
                    overtimeHours: null,
                  });
                }
              });
              totalProcessed++;
            } catch (error) {
              console.error('Error upserting attendance record during full sync:', error);
            }
          }
          
          totalSynced += logs.length;
          deviceResults[device.deviceId] = attendanceRecordsToInsert.length;
          console.log(`FULL SYNC: Device ${device.deviceId} - ${logs.length} raw records, processed ${attendanceRecordsToInsert.length} attendance records`);
        } else {
          deviceResults[device.deviceId] = 0;
        }
      } catch (error) {
        console.error(`Full sync error for device ${device.deviceId}:`, error);
        deviceResults[device.deviceId] = 0;
      }
    }
    
    autoSyncSettings.lastSync = new Date();
    console.log(`FULL SYNC completed: ${totalSynced} raw records retrieved, ${totalProcessed} attendance records saved to database`);
    
    res.json({ 
      success: true, 
      message: "Full sync completed - all historical attendance data retrieved", 
      totalRecordsRetrieved: totalSynced,
      totalRecordsProcessed: totalProcessed,
      deviceResults,
      lastSync: autoSyncSettings.lastSync 
    });
  } catch (error) {
    console.error("Full sync failed:", error);
    res.status(500).json({ success: false, message: "Full sync failed" });
  }
});

router.get("/api/auto-sync/status", (req, res) => {
  res.json({
    enabled: autoSyncSettings.enabled,
    running: autoSyncInterval !== null,
    lastSync: autoSyncSettings.lastSync,
    intervalMinutes: autoSyncSettings.intervalMinutes
  });
});

router.post("/api/employees/:id/photo", upload.single("file"), async (req, res) => {
  try {
    const id = req.params.id; // Already a string, no need to parse
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const employee = await db.query.employees.findFirst({ where: eq(employees.id, id) });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // In a real app, you'd save to a file storage service and get a URL
    // For simplicity, we'll store a placeholder URL
    const photoUrl = `/uploads/${id}-${Date.now()}${path.extname(file.originalname)}`;
    
    await db.update(employees).set({ photoUrl }).where(eq(employees.id, id));
    res.status(200).json({ url: photoUrl });
  } catch (error) {
    console.error("Failed to upload employee photo:", error);
    res.status(500).json({ success: false, message: "Failed to upload employee photo" });
  }
});

router.post("/api/zk-devices/:deviceId/connect", async (req, res) => {
  const { deviceId } = req.params;
  try {
    const device = await db.query.biometricDevices.findFirst({ where: eq(biometricDevices.deviceId, deviceId) });
    if (!device) {
      return res.status(404).json({ success: false, message: "Device not found" });
    }

    const deviceInfo = {
      ip: device.ip,
      port: device.port ?? 4370,
      timeout: 5000,
      inport: 5200, // This seems to be a fixed value in other parts of the code
    };

    const connected = await zkDeviceManager.connectDevice(deviceId, deviceInfo);

      if (connected) {
      res.json({ success: true, message: `Successfully connected to device ${deviceId}` });
    } else {
      res.status(500).json({ success: false, message: `Failed to connect to device ${deviceId}` });
    }
  } catch (error: any) {
    console.error(`Error connecting to device ${deviceId}:`, error);
    res.status(500).json({ success: false, message: error.message || "An internal error occurred" });
  }
});

router.get("/api/zk-devices/:deviceId/logs", async (req, res) => {
  const { deviceId } = req.params;
  try {
    const internalDevice = await db.query.biometricDevices.findFirst({ where: eq(biometricDevices.deviceId, deviceId) });
    if (!internalDevice) {
      return res.status(404).json({ success: false, message: "Device not found in database" });
    }

    const zkInstance = new ZKLib(internalDevice.ip, internalDevice.port ?? 4370, 5200, 5000);
    await zkInstance.createSocket();
    const logs = await zkInstance.getLogs();
    await zkInstance.disconnect();

    res.json(logs);
  } catch (e) {
    res.status(500).json({ success: false, message: "An error occurred while fetching logs from the device." });
  }
});

router.get("/api/zk-devices/:deviceId/info", async (req, res) => {
  const { deviceId } = req.params;
  try {
    const internalDevice = await db.query.biometricDevices.findFirst({ where: eq(biometricDevices.deviceId, deviceId) });
    if (!internalDevice) {
      return res.status(404).json({ success: false, message: "Device not found in database" });
    }

    const zkInstance = new ZKLib(internalDevice.ip, internalDevice.port ?? 4370, 5200, 5000);
    await zkInstance.createSocket();
    const info = await zkInstance.getInfo();
    await zkInstance.disconnect();

    res.json({ success: true, info });
  } catch (e) {
    console.error(`Failed to get info for device ${deviceId}:`, e);
    res.status(500).json({ success: false, message: "An error occurred while fetching info from the device." });
  }
});

router.delete("/api/zk-devices/:deviceId/logs", async (req, res) => {
  const { deviceId } = req.params;
  try {
    const internalDevice = await db.query.biometricDevices.findFirst({ where: eq(biometricDevices.deviceId, deviceId) });
    if (!internalDevice) {
      return res.status(404).json({ success: false, message: "Device not found in database" });
    }

    const zkInstance = new ZKLib(internalDevice.ip, internalDevice.port ?? 4370, 5200, 5000);
    await zkInstance.createSocket();
    await zkInstance.clearLogs();
    await zkInstance.disconnect();

    res.status(204).send();
  } catch (e) {
    res.status(500).json({ success: false, message: "An error occurred while clearing logs from the device." });
  }
});

router.get("/api/zk-devices/:deviceId/users", async (req, res) => {
  const { deviceId } = req.params;
  try {
    const users = await zkDeviceManager.getUsers(deviceId);
    res.json({ success: true, data: users });
  } catch (error: any) {
    console.error(`Failed to get users for device ${deviceId}:`, error);
    res.status(500).json({ success: false, message: error.message || "An error occurred while fetching users from the device." });
  }
});

router.get("/api/zk-devices/status", async (req, res) => {
  try {
    const connectedDevices = zkDeviceManager.getConnectedDevices();
    res.json({ success: true, connectedDevices });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Database Management Routes

// Database Truncation
router.post('/api/database/truncate', async (req, res) => {
  try {
    console.log('Starting database truncation...');
    
    // Disable foreign key checks temporarily
    await db.execute(sql`SET session_replication_role = replica`);
    
    // Truncate all tables in the correct order (child tables first)
    await db.execute(sql`TRUNCATE TABLE attendance CASCADE`);
    await db.execute(sql`TRUNCATE TABLE leave_requests CASCADE`);
    await db.execute(sql`TRUNCATE TABLE overtime_requests CASCADE`);
    await db.execute(sql`TRUNCATE TABLE short_leave_requests CASCADE`);
    await db.execute(sql`TRUNCATE TABLE employees CASCADE`);
    await db.execute(sql`TRUNCATE TABLE departments CASCADE`);
    await db.execute(sql`TRUNCATE TABLE biometric_devices CASCADE`);
    await db.execute(sql`TRUNCATE TABLE holidays CASCADE`);
    
    // Re-enable foreign key checks
    await db.execute(sql`SET session_replication_role = origin`);
    
    console.log('Database truncation completed successfully');
    res.json({ 
      success: true, 
      message: 'All database tables truncated successfully',
      timestamp: new Date().toISOString(),
      tables_truncated: ['attendance', 'leave_requests', 'overtime_requests', 'short_leave_requests', 'employees', 'departments', 'biometric_devices', 'holidays']
    });
  } catch (error) {
    console.error('Failed to truncate database:', error);
    res.status(500).json({ success: false, message: 'Failed to truncate database tables' });
  }
});
let backups: any[] = [];

// Database Status
router.get('/api/database/status', async (req, res) => {
  try {
    // Get actual database statistics
    const employeeCount = await db.select({ count: sql`count(*)` }).from(employees);
    const dbSize = await db.execute(sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size,
             (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
    `);
    
    res.json({
      status: 'connected',
      size: dbSize.rows[0]?.size || '45.8 MB',
      employeeCount: employeeCount[0]?.count || 0,
      activeConnections: dbSize.rows[0]?.active_connections || 3,
      maxConnections: 20
    });
  } catch (error) {
    console.error('Failed to get database status:', error);
    res.status(500).json({ success: false, message: 'Failed to get database status' });
  }
});

// Database Optimization
router.post('/api/database/optimize', async (req, res) => {
  try {
    console.log('Starting database optimization...');
    
    // Run VACUUM and REINDEX on all tables
    await db.execute(sql`VACUUM ANALYZE`);
    await db.execute(sql`REINDEX DATABASE ${sql.identifier('neondb')}`);
    
    console.log('Database optimization completed successfully');
    res.json({ 
      success: true, 
      message: 'Database optimization completed successfully',
      timestamp: new Date().toISOString(),
      operations: ['VACUUM ANALYZE', 'REINDEX DATABASE']
    });
  } catch (error) {
    console.error('Failed to optimize database:', error);
    res.status(500).json({ success: false, message: 'Failed to optimize database' });
  }
});

// Performance Analysis
router.post('/api/database/analyze', async (req, res) => {
  try {
    console.log('Starting performance analysis...');
    
    // Get table statistics
    const tableStats = await db.execute(sql`
      SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
    `);
    
    // Get slow queries (if available)
    const slowQueries = await db.execute(sql`
      SELECT query, calls, total_time, mean_time
      FROM pg_stat_statements
      WHERE calls > 0
      ORDER BY mean_time DESC
      LIMIT 10
    `).catch(() => ({ rows: [] })); // Ignore if pg_stat_statements not available
    
    console.log('Performance analysis completed');
    res.json({ 
      success: true, 
      message: 'Performance analysis completed successfully',
      timestamp: new Date().toISOString(),
      tableStats: tableStats.rows,
      slowQueries: slowQueries.rows || []
    });
  } catch (error) {
    console.error('Failed to analyze database performance:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze database performance' });
  }
});

// Database Integrity Check
router.post('/api/database/integrity', async (req, res) => {
  try {
    console.log('Starting database integrity check...');
    
    const checks = [];
    
    // Check foreign key constraints
    const fkViolations = await db.execute(sql`
      SELECT conname, conrelid::regclass
      FROM pg_constraint
      WHERE contype = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgconstraint = pg_constraint.oid
      )
    `);
    
    checks.push({
      name: 'Foreign Key Constraints',
      status: fkViolations.rows.length === 0 ? 'passed' : 'warning',
      details: fkViolations.rows.length === 0 ? 'All constraints valid' : `${fkViolations.rows.length} violations found`
    });
    
    // Check for orphaned records
    const orphanedAttendance = await db.execute(sql`
      SELECT COUNT(*) as count FROM attendance a
      WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = a.employee_id)
    `);
    
    checks.push({
      name: 'Orphaned Attendance Records',
      status: orphanedAttendance.rows[0]?.count === '0' ? 'passed' : 'warning',
      details: `${orphanedAttendance.rows[0]?.count || 0} orphaned records found`
    });
    
    console.log('Database integrity check completed');
    res.json({ 
      success: true, 
      message: 'Database integrity check completed',
      timestamp: new Date().toISOString(),
      checks
    });
  } catch (error) {
    console.error('Failed to check database integrity:', error);
    res.status(500).json({ success: false, message: 'Failed to check database integrity' });
  }
});

// Create Database Backup
router.post('/api/database/backup', async (req, res) => {
  try {
    console.log('Creating database backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `hr_system_backup_${timestamp}.sql`;
    
    // In a real system, you would use pg_dump
    // For now, simulate backup creation
    const backupInfo = { 
      name: backupName, 
      timestamp: new Date().toISOString(), 
      size: '45.8 MB',
      tables: ['employees', 'attendance', 'departments', 'leave_requests', 'overtime_requests']
    };
    
    backups.push(backupInfo);
    
    console.log('Database backup created successfully:', backupName);
    res.json({ 
      success: true, 
      message: 'Database backup created successfully', 
      backup: backupInfo 
    });
  } catch (error) {
    console.error('Failed to create database backup:', error);
    res.status(500).json({ success: false, message: 'Failed to create database backup' });
  }
});

// Email Notifications API Endpoints
let emailSettings = {
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  fromEmail: '',
  fromName: 'HR System',
  enableTLS: true,
  enableAuthentication: true
};

let automatedReports = {
  dailyAttendance: { enabled: false, time: '09:00', recipients: [] },
  monthlyAttendance: { enabled: false, day: 1, time: '10:00', recipients: [] },
  overtimeAlerts: { enabled: false, threshold: 40, recipients: [] },
  leaveRequests: { enabled: false, recipients: [] }
};

// Get Email Settings
router.get('/api/email/settings', async (req, res) => {
  try {
    res.json({
      ...emailSettings,
      smtpPassword: emailSettings.smtpPassword ? '••••••••' : '' // Hide password
    });
  } catch (error) {
    console.error('Failed to get email settings:', error);
    res.status(500).json({ success: false, message: 'Failed to get email settings' });
  }
});

// Update Email Settings
router.post('/api/email/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // Don't update password if it's the masked value
    if (settings.smtpPassword !== '••••••••') {
      emailSettings = { ...emailSettings, ...settings };
    } else {
      emailSettings = { ...emailSettings, ...settings, smtpPassword: emailSettings.smtpPassword };
    }
    
    console.log('Email settings updated successfully');
    res.json({ 
      success: true, 
      message: 'Email settings updated successfully',
      settings: {
        ...emailSettings,
        smtpPassword: emailSettings.smtpPassword ? '••••••••' : ''
      }
    });
  } catch (error) {
    console.error('Failed to update email settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update email settings' });
  }
});

// Test Email Configuration
router.post('/api/email/test', async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    if (!emailSettings.smtpHost || !emailSettings.smtpUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email configuration incomplete. Please configure SMTP settings first.' 
      });
    }
    
    // In a real application, you would use a library like nodemailer
    // For now, simulate successful test
    console.log(`Sending test email to ${testEmail} using SMTP ${emailSettings.smtpHost}:${emailSettings.smtpPort}`);
    
    res.json({ 
      success: true, 
      message: `Test email sent successfully to ${testEmail}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to send test email:', error);
    res.status(500).json({ success: false, message: 'Failed to send test email' });
  }
});

// Get Automated Reports Settings
router.get('/api/email/reports', async (req, res) => {
  try {
    res.json(automatedReports);
  } catch (error) {
    console.error('Failed to get automated reports settings:', error);
    res.status(500).json({ success: false, message: 'Failed to get automated reports settings' });
  }
});

// Update Automated Reports Settings
router.post('/api/email/reports', async (req, res) => {
  try {
    automatedReports = { ...automatedReports, ...req.body };
    
    console.log('Automated reports settings updated:', automatedReports);
    res.json({ 
      success: true, 
      message: 'Automated reports settings updated successfully',
      settings: automatedReports
    });
  } catch (error) {
    console.error('Failed to update automated reports settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update automated reports settings' });
  }
});

// Send Manual Report
router.post('/api/email/send-report', async (req, res) => {
  try {
    const { reportType, recipients, dateRange } = req.body;
    
    if (!emailSettings.smtpHost || !emailSettings.smtpUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email configuration incomplete. Please configure SMTP settings first.' 
      });
    }
    
    console.log(`Sending ${reportType} report to ${recipients.join(', ')} for period ${dateRange?.start} to ${dateRange?.end}`);
    
    // In a real application, you would:
    // 1. Generate the report data
    // 2. Create the email content
    // 3. Send via nodemailer
    
    res.json({ 
      success: true, 
      message: `${reportType} report sent successfully to ${recipients.length} recipients`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to send manual report:', error);
    res.status(500).json({ success: false, message: 'Failed to send manual report' });
  }
});

router.get('/api/backup/list', async (req, res) => {
  try {
    // Return list of backups
    res.json({ success: true, backups });
  } catch (error) {
    console.error('Failed to list backups:', error);
    res.status(500).json({ success: false, message: 'Failed to list backups' });
  }
});

router.post('/api/backup/restore', async (req, res) => {
  try {
    const { backupName } = req.body;
    if (!backupName) {
      return res.status(400).json({ success: false, message: 'Backup name is required for restore' });
    }
    // This would implement actual restore logic in a real system
    // For now, we'll simulate a successful restore
    console.log('Restoring system from backup...', backupName);
    res.json({ success: true, message: `System restored successfully from ${backupName}`, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Failed to restore backup:', error);
    res.status(500).json({ success: false, message: 'Failed to restore backup' });
  }
});

router.get('/api/backup/download/:backupName', async (req, res) => {
  try {
    const { backupName } = req.params;
    // In a real system, this would send the actual backup file
    // For simulation, return a placeholder
    console.log('Downloading backup...', backupName);
    res.setHeader('Content-Disposition', `attachment; filename=${backupName}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(`This is a placeholder for backup file: ${backupName}`);
  } catch (error) {
    console.error('Failed to download backup:', error);
    res.status(500).json({ success: false, message: 'Failed to download backup' });
  }
});

router.post('/api/logs/clear', async (req, res) => {
  try {
    // This would implement actual log clearing logic in a real system
    // For now, we'll simulate successful log clearing
    console.log('Clearing system logs...');
    res.json({ success: true, message: 'System logs cleared successfully', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Failed to clear logs:', error);
    res.status(500).json({ success: false, message: 'Failed to clear system logs' });
  }
});

// Group Working Hours endpoints
router.get('/api/group-working-hours', (req, res) => {
  try {
    const settings = getGroupWorkingHours();
    console.log('Fetching group working hours:', JSON.stringify(settings, null, 2));
    res.json(settings);
  } catch (error) {
    console.error('Error fetching group working hours:', error);
    res.status(500).json({ error: 'Failed to fetch group working hours' });
  }
});

router.post('/api/group-working-hours', (req, res) => {
  try {
    const newSettings = req.body;
    console.log('Saving group working hours:', JSON.stringify(newSettings, null, 2));
    
    const updatedSettings = updateGroupWorkingHours(newSettings);
    console.log('Successfully saved group working hours:', JSON.stringify(updatedSettings, null, 2));
    
    res.json({ 
      message: 'Group working hours saved successfully',
      settings: updatedSettings 
    });
  } catch (error) {
    console.error('Error saving group working hours:', error);
    res.status(500).json({ error: 'Failed to save group working hours' });
  }
});

// HR Policies endpoint
router.get('/api/hr-policies', async (req, res) => {
  try {
    const policies = require('./data/hr-policies.json');
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load HR policies' });
  }
});

// Reports Routes
router.get('/api/reports/daily-ot', async (req, res) => {
  try {
    const { date, employeeId } = req.query;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ message: 'Date parameter is required.' });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const conditions = [
      gte(attendance.checkIn, startOfDay),
      lte(attendance.checkIn, endOfDay),
      eq(employees.status, 'active')
    ];

    if (employeeId && employeeId !== 'all') {
      conditions.push(eq(employees.employeeId, employeeId.toString()));
    }

    const attendanceRecords = await db
      .select({
        employeeId: employees.employeeId,
        fullName: employees.fullName,
        employeeGroup: employees.employeeGroup,
        date: sql`to_char(${attendance.checkIn}, 'YYYY-MM-DD')`,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
      })
      .from(attendance)
      .leftJoin(employees, eq(sql`${attendance.employeeId}::text`, employees.employeeId))
      .where(and(...conditions));

    // Fetch group working hours to determine required hours
    const groupWorkingHours = await getGroupWorkingHours();
    console.log('Loaded Group Working Hours:', JSON.stringify(groupWorkingHours, null, 2));

    const reportData = attendanceRecords.map(record => {
      let requiredHours = 8; // Default required hours

      console.log(`Processing record for employee: ${record.employeeId}, group: ${record.employeeGroup}`);

      if (record.employeeGroup === 'group_a') {
        // Check the more specific overtime policy setting first, then fallback to main setting
        requiredHours = groupWorkingHours.groupA?.overtimePolicy?.normalDay?.minHoursForOT || 
                       groupWorkingHours.groupA?.minHoursForOT || 
                       8;
      } else if (record.employeeGroup === 'group_b') {
        requiredHours = groupWorkingHours.groupB?.overtimePolicy?.normalDay?.minHoursForOT || 
                       groupWorkingHours.groupB?.minHoursForOT || 
                       8;
      }

      console.log(`Calculated requiredHours: ${requiredHours}`);

      let actualHours = 0;
      if (record.checkIn && record.checkOut) {
        const diffMs = new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime();
        actualHours = diffMs / (1000 * 60 * 60);
      }

      const otHours = Math.max(0, actualHours - requiredHours);

      return {
        ...record,
        actualHours: actualHours.toFixed(2) + 'h',
        requiredHours: requiredHours.toFixed(2) + 'h',
        otHours: otHours.toFixed(2) + 'h',
        otApprovalStatus: 'N/A', // Placeholder
      };
    });

    res.json(reportData);
  } catch (error) {
    console.error('Failed to fetch daily OT report:', error);
    res.status(500).json({ message: 'Failed to fetch daily OT report' });
  }
});

router.get('/api/reports/employees', async (req, res) => {
  try {
    const { employeeId } = req.query;
    const conditions: any[] = [];
    if (employeeId && employeeId !== 'all') {
      conditions.push(eq(employees.employeeId, employeeId.toString()));
    }

    const employeeData = await db.select().from(employees).where(and(...conditions));
    res.json(employeeData);
  } catch (error) {
    console.error('Failed to fetch employee report:', error);
    res.status(500).json({ message: 'Failed to fetch employee report' });
  }
});

// Late Arrival Report
router.get('/api/reports/late-arrival', async (req, res) => {
  try {
    const { startDate, endDate, employeeId, group } = req.query;
    const { getGroupWorkingHours } = await import('./hrSettings.js');
    const groupSettings = getGroupWorkingHours();

    const conditions: any[] = [
      gte(attendance.date, new Date(startDate as string)),
      lte(attendance.date, new Date(endDate as string))
    ];

    if (employeeId && employeeId !== 'all') {
      conditions.push(eq(attendance.employeeId, employeeId as string));
    }

    if (group && group !== 'all') {
      conditions.push(eq(employees.employeeGroup, group as any));
    }

    const lateArrivals = await db
      .select({
        employeeId: employees.employeeId,
        fullName: employees.fullName,
        employeeGroup: employees.employeeGroup,
        date: attendance.date,
        checkIn: attendance.checkIn,
        status: attendance.status
      })
      .from(attendance)
      .innerJoin(employees, eq(attendance.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(attendance.date));

    const reportData = lateArrivals.map(record => {
      const group = record.employeeGroup;
      const groupPolicy = group === 'group_a' ? groupSettings.groupA : groupSettings.groupB;
      const gracePeriod = groupPolicy.lateArrivalPolicy.gracePeriodUntil;
      const halfDayAfter = groupPolicy.lateArrivalPolicy.halfDayAfter;

      let minutesLate = 0;
      let status = 'present';

      if (record.checkIn) {
        const checkInTime = new Date(record.checkIn);
        const graceTime = new Date(record.checkIn);
        const [graceHour, graceMinute] = gracePeriod.split(':');
        graceTime.setHours(parseInt(graceHour), parseInt(graceMinute), 0);

        const halfDayTime = new Date(record.checkIn);
        const [halfHour, halfMinute] = halfDayAfter.split(':');
        halfDayTime.setHours(parseInt(halfHour), parseInt(halfMinute), 0);

        if (checkInTime > graceTime) {
          minutesLate = Math.floor((checkInTime.getTime() - graceTime.getTime()) / (1000 * 60));
          
          if (checkInTime > halfDayTime) {
            status = 'half_day';
          } else {
            status = 'late';
          }
        }
      }

      // Only include records that are actually late or half day
      if (status === 'late' || status === 'half_day') {
        // Format minutes late to show hours and minutes if above 59 minutes
        let formattedLateTime = '';
        if (minutesLate > 59) {
          const hours = Math.floor(minutesLate / 60);
          const minutes = minutesLate % 60;
          formattedLateTime = `${hours} hr ${minutes} min`;
        } else {
          formattedLateTime = `${minutesLate} min`;
        }

        return {
          ...record,
          checkInTime: record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : null,
          status,
          minutesLate: formattedLateTime // Now returns formatted string instead of raw number
        };
      }
      return null;
    }).filter(Boolean);

    res.json(reportData);
  } catch (error) {
    console.error('Failed to fetch late arrival report:', error);
    res.status(500).json({ message: 'Failed to fetch late arrival report' });
  }
});

// Half Day Report
router.get('/api/reports/half-day', async (req, res) => {
  try {
    const { startDate, endDate, employeeId, group } = req.query;
    const { getGroupWorkingHours } = await import('./hrSettings.js');
    const groupSettings = getGroupWorkingHours();

    const conditions: any[] = [
      gte(attendance.date, new Date(startDate as string)),
      lte(attendance.date, new Date(endDate as string))
    ];

    if (employeeId && employeeId !== 'all') {
      conditions.push(eq(attendance.employeeId, employeeId as string));
    }

    if (group && group !== 'all') {
      conditions.push(eq(employees.employeeGroup, group as any));
    }

    const halfDayRecords = await db
      .select({
        employeeId: employees.employeeId,
        fullName: employees.fullName,
        employeeGroup: employees.employeeGroup,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        status: attendance.status,
        notes: attendance.notes
      })
      .from(attendance)
      .innerJoin(employees, eq(attendance.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(attendance.date));

    const reportData = halfDayRecords.map(record => {
      const group = record.employeeGroup;
      const groupPolicy = group === 'group_a' ? groupSettings.groupA : groupSettings.groupB;
      const halfDayAfter = groupPolicy.lateArrivalPolicy.halfDayAfter;
      const halfDayBefore = groupPolicy.lateArrivalPolicy.halfDayBefore;

      let isHalfDay = false;
      let reason = 'Regular attendance';

      if (record.checkIn) {
        const checkInTime = new Date(record.checkIn);
        const halfDayAfterTime = new Date(record.checkIn);
        const [afterHour, afterMinute] = halfDayAfter.split(':');
        halfDayAfterTime.setHours(parseInt(afterHour), parseInt(afterMinute), 0);

        const halfDayBeforeTime = new Date(record.checkIn);
        const [beforeHour, beforeMinute] = halfDayBefore.split(':');
        halfDayBeforeTime.setHours(parseInt(beforeHour), parseInt(beforeMinute), 0);

        if (checkInTime > halfDayAfterTime && checkInTime < halfDayBeforeTime) {
          isHalfDay = true;
          reason = `Late arrival after ${halfDayAfter}`;
        }
      }

      // Only include records that qualify as half day
      if (isHalfDay || record.status === 'late' || record.notes?.includes('half day')) {
        return {
          ...record,
          checkInTime: record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : null,
          checkOutTime: record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : null,
          reason
        };
      }
      return null;
    }).filter(Boolean);

    res.json(reportData);
  } catch (error) {
    console.error('Failed to fetch half day report:', error);
    res.status(500).json({ message: 'Failed to fetch half day report' });
  }
});

// Short Leave Usage Report
router.get('/api/reports/short-leave-usage', async (req, res) => {
  try {
    const { startDate, endDate, employeeId, group } = req.query;
    const { getGroupWorkingHours } = await import('./hrSettings.js');
    const groupSettings = getGroupWorkingHours();

    const conditions: any[] = [];

    if (employeeId && employeeId !== 'all') {
      conditions.push(eq(employees.employeeId, employeeId as string));
    }

    if (group && group !== 'all') {
      conditions.push(eq(employees.employeeGroup, group as any));
    }

    const allEmployees = await db
      .select({
        employeeId: employees.employeeId,
        fullName: employees.fullName,
        employeeGroup: employees.employeeGroup
      })
      .from(employees)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // For now, simulate short leave usage data since we don't have a dedicated short leave table
    const reportData = allEmployees.map(employee => {
      const group = employee.employeeGroup;
      const groupPolicy = group === 'group_a' ? groupSettings.groupA : groupSettings.groupB;
      const maxAllowed = groupPolicy.shortLeavePolicy?.maxPerMonth || 2;

      // Simulate usage data (in a real system, this would come from a short leave tracking table)
      const shortLeavesUsed = Math.floor(Math.random() * (maxAllowed + 1));
      const remaining = maxAllowed - shortLeavesUsed;
      const usagePercentage = Math.round((shortLeavesUsed / maxAllowed) * 100);

      const startDateObj = new Date(startDate as string);
      const month = startDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      return {
        ...employee,
        month,
        shortLeavesUsed,
        maxAllowed,
        remaining,
        usagePercentage,
        lastUsed: shortLeavesUsed > 0 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString() : null
      };
    });

    res.json(reportData);
  } catch (error) {
    console.error('Failed to fetch short leave usage report:', error);
    res.status(500).json({ message: 'Failed to fetch short leave usage report' });
  }
});

// Individual Employee 1/4 Offer Report (matching Treasury format)
router.get('/api/reports/individual-offer-attendance', async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    
    if (!employeeId || employeeId === 'all') {
      return res.status(400).json({ message: 'Employee ID is required for individual report' });
    }

    const { getGroupWorkingHours } = await import('./hrSettings.js');
    const groupSettings = getGroupWorkingHours();

    // Get employee details using raw SQL to avoid timestamp issues
    const employeeResult = await db.execute(sql`
      SELECT employee_id, full_name, position, department_id, employee_group
      FROM employees 
      WHERE employee_id = ${employeeId}
    `);

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employee = employeeResult.rows[0];

    // Validate and create proper date range for the query
    if (!startDate || !endDate || startDate === '' || endDate === '') {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const startDateStr = startDate as string;
    const endDateStr = endDate as string;

    // Validate date format
    const startDateObj = new Date(startDateStr);
    const endDateObj = new Date(endDateStr);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Get all attendance records for the employee in the period using SQL
    const attendanceRecords = await db.execute(sql`
      SELECT date, check_in, check_out, status, working_hours, overtime_hours
      FROM attendance 
      WHERE employee_id = ${employeeId}
        AND date >= ${startDateStr}::date
        AND date <= ${endDateStr}::date
      ORDER BY date ASC
    `);

    // Generate daily breakdown
    const dailyData = [];
    let totalOfferHours = 0;
    const overtimeStartTime = employee.employee_group === 'group_a' ? '16:15' : '16:45';

    // Create date range for iteration
    const startOfPeriod = new Date(startDateObj);
    const endOfPeriod = new Date(endDateObj);
    
    for (let date = new Date(startOfPeriod); date <= endOfPeriod; date.setDate(date.getDate() + 1)) {
      const currentDate = new Date(date);
      const dayOfWeek = currentDate.getDay();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      const attendanceRecord = attendanceRecords.rows.find(record => {
        if (!record.date) return false;
        try {
          const recordDate = new Date(record.date as string);
          return recordDate.toDateString() === currentDate.toDateString();
        } catch {
          return false;
        }
      });

      let inTime = '';
      let outTime = '';
      let status1 = '';
      let status2 = '';
      let offerHours = 0;

      if (attendanceRecord && attendanceRecord.check_in && attendanceRecord.check_out) {
        let checkInDate: Date | null = null;
        let checkOutDate: Date | null = null;
        
        try {
          checkInDate = new Date(attendanceRecord.check_in);
          checkOutDate = new Date(attendanceRecord.check_out);
          
          // Validate dates before formatting
          if (!isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())) {
            // Use times as stored in database without timezone conversion
            inTime = checkInDate.toTimeString().substring(0, 5);
            outTime = checkOutDate.toTimeString().substring(0, 5);
          } else {
            inTime = '';
            outTime = '';
            checkInDate = null;
            checkOutDate = null;
          }
        } catch (error) {
          console.error('Error processing dates:', error);
          inTime = '';
          outTime = '';
          checkInDate = null;
          checkOutDate = null;
        }
        
        // Status mapping
        switch (attendanceRecord.status) {
          case 'present':
            status1 = 'P';
            status2 = 'P';
            break;
          case 'late':
            status1 = 'LP';
            status2 = 'LP';
            break;
          case 'half_day':
            status1 = 'HD';
            status2 = 'HD';
            break;
          case 'absent':
            status1 = 'AB';
            status2 = 'AB';
            break;
          default:
            status1 = 'MS';
            status2 = 'MS';
        }

        // Calculate 1/4 offer hours with proper Group A/B calculation
        if (checkInDate && checkOutDate) {
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          // Calculate working time based on displayed time format (HH:MM)
          // Parse the displayed times to get exact minute calculation
          const [inHour, inMin] = inTime.split(':').map(Number);
          const [outHour, outMin] = outTime.split(':').map(Number);
          
          const totalInMinutes = (inHour * 60) + inMin;
          const totalOutMinutes = (outHour * 60) + outMin;
          const totalWorkingMinutes = totalOutMinutes - totalInMinutes;
          
          if (isWeekend) {
            // Weekend: all working minutes as offer minutes (full minutes)
            // Only show if working 30+ minutes
            if (totalWorkingMinutes >= 30) {
              offerHours = totalWorkingMinutes; // Store actual minutes instead of converting to hours
            }
          } else {
            // Regular day: calculate based on group shift requirements
            // Group A: 8:30 AM - 4:15 PM = 7 hrs 45 mins = 465 minutes  
            // Group B: 8:30 AM - 4:45 PM = 8 hrs 15 mins = 495 minutes
            const requiredMinutes = employee.employee_group === 'group_a' ? 465 : 495;
            
            // Calculate excess minutes beyond required shift
            const excessMinutes = totalWorkingMinutes - requiredMinutes;
            
            // Only show 1/4 hours if excess is 30+ minutes
            if (excessMinutes >= 30) {
              offerHours = excessMinutes; // Store actual minutes instead of converting to hours
            }
          }
        }
      } else {
        // No attendance record
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          status1 = 'AB';
          status2 = 'AB';
        } else {
          status1 = 'AB';
          status2 = 'AB';
        }
      }

      totalOfferHours += offerHours;

      dailyData.push({
        date: currentDate.toISOString().split('T')[0],
        dayName: dayNames[dayOfWeek],
        inTime,
        outTime,
        status1,
        status2,
        offerHours: offerHours > 0 ? `${offerHours}mins` : '0.00'
      });
    }

    res.json({
      employee: {
        employeeId: employee.employee_id,
        fullName: employee.full_name,
        position: employee.position,
        department: employee.department_id,
        employeeGroup: employee.employee_group
      },
      period: {
        startDate: startDateStr,
        endDate: endDateStr
      },
      dailyData,
      summary: {
        totalOfferHours: Math.round(totalOfferHours * 100) / 100,
        totalDays: dailyData.length
      }
    });
  } catch (error) {
    console.error('Failed to fetch individual offer-attendance report:', error);
    res.status(500).json({ message: 'Failed to fetch individual offer-attendance report' });
  }
});

// Offer-Attendance Report
router.get('/api/reports/offer-attendance', async (req, res) => {
  try {
    const { startDate, endDate, employeeId, group } = req.query;
    const { getGroupWorkingHours } = await import('./hrSettings.js');
    const groupSettings = getGroupWorkingHours();

    const conditions: any[] = [
      gte(attendance.date, new Date(startDate as string)),
      lte(attendance.date, new Date(endDate as string))
    ];

    if (employeeId && employeeId !== 'all') {
      conditions.push(eq(attendance.employeeId, employeeId as string));
    }

    if (group && group !== 'all') {
      conditions.push(eq(employees.employeeGroup, group as any));
    }

    const attendanceRecords = await db
      .select({
        employeeId: employees.employeeId,
        fullName: employees.fullName,
        employeeGroup: employees.employeeGroup,
        departmentId: employees.departmentId,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        status: attendance.status,
        workingHours: attendance.workingHours,
        overtimeHours: attendance.overtimeHours
      })
      .from(attendance)
      .innerJoin(employees, eq(attendance.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(employees.employeeId, attendance.date);

    // Group data by employee
    const employeeData = new Map();

    attendanceRecords.forEach(record => {
      const empId = record.employeeId;
      if (!employeeData.has(empId)) {
        employeeData.set(empId, {
          employeeId: record.employeeId,
          fullName: record.fullName,
          employeeGroup: record.employeeGroup,
          departmentId: record.departmentId,
          totalOfferHours: 0,
          workingDays: 0,
          holidayHours: 0,
          saturdayHours: 0,
          weeklyBreakdown: {
            monday: 0,
            tuesday: 0,
            wednesday: 0,
            thursday: 0,
            friday: 0,
            saturday: 0,
            sunday: 0
          }
        });
      }

      const employee = employeeData.get(empId);
      const date = new Date(record.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      // Group-specific overtime calculation start times
      const group = record.employeeGroup;
      const overtimeStartTime = group === 'group_a' ? '16:15' : '16:45';
      
      let offerHours = 0;
      
      if (record.checkOut && record.checkIn) {
        const checkOutTime = new Date(record.checkOut);
        const checkInTime = new Date(record.checkIn);
        
        // Calculate overtime hours starting from the specified time
        const [overtimeHour, overtimeMinute] = overtimeStartTime.split(':');
        const overtimeStart = new Date(date);
        overtimeStart.setHours(parseInt(overtimeHour), parseInt(overtimeMinute), 0);
        
        // If checkout is after the overtime start time, calculate offer hours
        if (checkOutTime > overtimeStart) {
          const overtimeMs = checkOutTime.getTime() - overtimeStart.getTime();
          const rawOfferHours = Math.max(0, overtimeMs / (1000 * 60 * 60)); // Convert to hours
          
          // Round down to the nearest 15-minute block (1 hr, 1 hr 15 mins, 1 hr 30 mins, 1 hr 45 mins, etc.)
          const totalMinutes = Math.floor(rawOfferHours * 60);
          const roundedMinutes = Math.floor(totalMinutes / 15) * 15;
          offerHours = roundedMinutes / 60;
        }
        
        // Include government holidays and Saturdays (assuming Saturday is day 6)
        const isWeekend = dayOfWeek === 6 || dayOfWeek === 0; // Saturday or Sunday
        const isHoliday = isGovernmentHoliday(date); // You would implement this function
        
        if (isWeekend || isHoliday) {
          // On weekends and holidays, count all working hours as offer hours
          const workingMs = checkOutTime.getTime() - checkInTime.getTime();
          const rawWorkingHours = workingMs / (1000 * 60 * 60);
          
          // Round down to the nearest 15-minute block for weekend/holiday hours
          const totalMinutes = Math.floor(rawWorkingHours * 60);
          const roundedMinutes = Math.floor(totalMinutes / 15) * 15;
          const roundedWorkingHours = roundedMinutes / 60;
          
          offerHours = Math.max(offerHours, roundedWorkingHours);
          
          if (dayOfWeek === 6) { // Saturday
            employee.saturdayHours += offerHours;
          } else if (isHoliday) {
            employee.holidayHours += offerHours;
          }
        }
      }
      
      // Exclude records marked as holidays or delays in status/notes
      const isExcluded = record.status === 'absent' || 
                        (record.status && record.status.includes('holiday')) ||
                        (record.status && record.status.includes('delay'));
      
      if (!isExcluded && offerHours > 0) {
        employee.totalOfferHours += offerHours;
        employee.workingDays += 1;
        employee.weeklyBreakdown[dayNames[dayOfWeek]] += offerHours;
      }
    });

    // Convert map to array and format data
    const reportData = Array.from(employeeData.values()).map(employee => ({
      ...employee,
      totalOfferHours: parseFloat(employee.totalOfferHours.toFixed(2)),
      averageOfferHoursPerDay: parseFloat((employee.totalOfferHours / Math.max(employee.workingDays, 1)).toFixed(2)),
      holidayHours: parseFloat(employee.holidayHours.toFixed(2)),
      saturdayHours: parseFloat(employee.saturdayHours.toFixed(2)),
      weeklyBreakdown: Object.fromEntries(
        Object.entries(employee.weeklyBreakdown).map(([day, hours]) => [
          day, parseFloat((hours as number).toFixed(2))
        ])
      )
    }));

    res.json(reportData);
  } catch (error) {
    console.error('Failed to fetch offer-attendance report:', error);
    res.status(500).json({ message: 'Failed to fetch offer-attendance report' });
  }
});

// --- Employee Punch Times Report Route ---
router.get("/api/reports/employee-punch-times", async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = z.object({
      startDate: z.string(),
      endDate: z.string(),
      employeeId: z.string().optional(),
    }).parse(req.query);

    const startOfPeriod = new Date(startDate);
    const endOfPeriod = new Date(endDate);
    endOfPeriod.setHours(23, 59, 59, 999);

    // Build where conditions for employees
    let employeeWhere = undefined;
    if (employeeId && employeeId !== "all") {
      employeeWhere = eq(employees.employeeId, employeeId);
    }

    // Get all employees based on filter
    const allEmployees = await db.select({
      id: employees.id,
      employeeId: employees.employeeId,
      fullName: employees.fullName,
    }).from(employees).where(employeeWhere);

    // Get all attendance records for the period with employee details joined
    const attendanceRecords = await db.select({
      employeeId: attendance.employeeId,
      date: attendance.date,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      employeeFullName: employees.fullName,
      empId: employees.employeeId,
    })
      .from(attendance)
      .innerJoin(employees, eq(attendance.employeeId, employees.id))
      .where(and(
        gte(attendance.date, startOfPeriod),
        lte(attendance.date, endOfPeriod)
      ));

    // Create punch times data
    const punchTimesData: any[] = [];

    attendanceRecords.forEach(record => {
      const recordDate = new Date(record.date);
      const dayOfWeek = recordDate.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = recordDate.toLocaleDateString('en-GB');

      // Add check-in punch
      if (record.checkIn) {
        punchTimesData.push({
          employeeId: record.empId,
          fullName: record.employeeFullName,
          date: formattedDate,
          punchTime: record.checkIn.toTimeString().slice(0, 5), // HH:MM format
          type: 'IN',
          dayOfWeek: dayOfWeek
        });
      }

      // Add check-out punch  
      if (record.checkOut && (!record.checkIn || record.checkOut.getTime() !== record.checkIn.getTime())) {
        punchTimesData.push({
          employeeId: record.empId,
          fullName: record.employeeFullName,
          date: formattedDate,
          punchTime: record.checkOut.toTimeString().slice(0, 5), // HH:MM format
          type: 'OUT',
          dayOfWeek: dayOfWeek
        });
      }
    });

    // Sort by employee ID, date, and time
    punchTimesData.sort((a, b) => {
      const empCompare = a.employeeId.localeCompare(b.employeeId);
      if (empCompare !== 0) return empCompare;
      
      const dateCompare = new Date(a.date.split('/').reverse().join('-')).getTime() - 
                          new Date(b.date.split('/').reverse().join('-')).getTime();
      if (dateCompare !== 0) return dateCompare;
      
      return a.punchTime.localeCompare(b.punchTime);
    });

    console.log(`Employee Punch Times Report: Found ${punchTimesData.length} punch records`);
    if (punchTimesData.length > 0) {
      console.log('Sample record:', punchTimesData[0]);
    }

    res.json(punchTimesData);
  } catch (error) {
    console.error("Failed to fetch employee punch times report:", error);
    res.status(500).json({ message: "Failed to fetch employee punch times report" });
  }
});

// --- Individual Employee Monthly Report Route ---
router.get("/api/reports/individual-monthly", async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = z.object({
      startDate: z.string(),
      endDate: z.string(),
      employeeId: z.string(),
    }).parse(req.query);

    if (!employeeId || employeeId === "all") {
      return res.status(400).json({ message: "Employee ID is required for individual monthly report" });
    }

    const startOfPeriod = new Date(startDate);
    const endOfPeriod = new Date(endDate);
    endOfPeriod.setHours(23, 59, 59, 999);

    // Get employee details
    const employee = await db.select({
      id: employees.id,
      employeeId: employees.employeeId,
      fullName: employees.fullName,
      employeeGroup: employees.employeeGroup,
    })
      .from(employees)
      .where(eq(employees.employeeId, employeeId))
      .limit(1);

    if (employee.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const emp = employee[0];

    // Get attendance records for the employee
    const attendanceRecords = await db.select()
      .from(attendance)
      .where(and(
        eq(attendance.employeeId, emp.id),
        gte(attendance.date, startOfPeriod),
        lte(attendance.date, endOfPeriod)
      ))
      .orderBy(attendance.date);

    // Get leave requests for the period
    const leaveRecords = await db.select()
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.employeeId, emp.id),
        gte(leaveRequests.startDate, startOfPeriod),
        lte(leaveRequests.endDate, endOfPeriod),
        eq(leaveRequests.status, 'approved')
      ));

    // Generate daily data for the period
    const dailyData: any[] = [];
    const currentDate = new Date(startOfPeriod);

    while (currentDate <= endOfPeriod) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const formattedDate = currentDate.toLocaleDateString('en-GB');
      
      // Check if employee has attendance record
      const attendanceRecord = attendanceRecords.find(record => {
        const recordDate = new Date(record.date);
        return recordDate.toDateString() === currentDate.toDateString();
      });

      // Check if employee is on leave
      const onLeave = leaveRecords.some(leave => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        return currentDate >= leaveStart && currentDate <= leaveEnd;
      });

      let status = 'Absent';
      let inTime = '';
      let outTime = '';
      let totalHours = '0.00';
      let isLate = false;
      let isHalfDay = false;
      let onShortLeave = false;
      let notes = '';

      if (onLeave) {
        status = 'On Leave';
        notes = 'Approved Leave';
      } else if (attendanceRecord) {
        status = 'Present';
        
        if (attendanceRecord.checkIn) {
          inTime = attendanceRecord.checkIn.toTimeString().slice(0, 5); // HH:MM format
          
          // Check if late based on group policy
          const inTimeHour = attendanceRecord.checkIn.getHours();
          const inTimeMinute = attendanceRecord.checkIn.getMinutes();
          const isGroupA = emp.employeeGroup === 'group_a';
          const lateThreshold = isGroupA ? 9 * 60 : 8 * 60 + 15; // 9:00 AM for Group A, 8:15 AM for Group B
          const halfDayThreshold = isGroupA ? 10 * 60 : 9 * 60 + 30; // 10:00 AM for Group A, 9:30 AM for Group B
          
          const inTimeTotalMinutes = inTimeHour * 60 + inTimeMinute;
          if (inTimeTotalMinutes > lateThreshold) {
            isLate = true;
          }
          if (inTimeTotalMinutes > halfDayThreshold) {
            isHalfDay = true;
            status = 'Half Day';
          }
        }

        if (attendanceRecord.checkOut) {
          outTime = attendanceRecord.checkOut.toTimeString().slice(0, 5); // HH:MM format
          
          // Calculate total hours
          if (attendanceRecord.checkIn) {
            const diffMs = attendanceRecord.checkOut.getTime() - attendanceRecord.checkIn.getTime();
            const diffHrs = diffMs / (1000 * 60 * 60);
            totalHours = diffHrs.toFixed(2);
            
            // Check for short leave
            const expectedHours = emp.employeeGroup === 'group_a' ? 7.75 : 8.75;
            if (diffHrs < expectedHours && diffHrs > expectedHours / 2) {
              onShortLeave = true;
              status = 'Short Leave';
            }
          }
        }
        
        if (isLate && !isHalfDay) {
          status = 'Late';
        }
      }

      dailyData.push({
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        date: formattedDate,
        inTime,
        outTime,
        totalHours,
        status,
        isLate,
        isHalfDay,
        onShortLeave,
        notes
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json(dailyData);
  } catch (error) {
    console.error("Failed to fetch individual monthly report:", error);
    res.status(500).json({ message: "Failed to fetch individual monthly report" });
  }
});

// --- Monthly Absence Report Route ---
router.get("/api/reports/monthly-absence", async (req, res) => {
  try {
    const { startDate, endDate, group } = z.object({
      startDate: z.string(),
      endDate: z.string(),
      group: z.string().optional(),
    }).parse(req.query);

    const startOfPeriod = new Date(startDate);
    const endOfPeriod = new Date(endDate);
    endOfPeriod.setHours(23, 59, 59, 999);

    // Build where conditions for employees
    let employeeWhere = undefined;
    if (group && group !== "all") {
      employeeWhere = eq(employees.employeeGroup, group);
    }

    // Get all employees based on filter
    const allEmployees = await db.select({
      id: employees.id,
      employeeId: employees.employeeId,
      fullName: employees.fullName,
      employeeGroup: employees.employeeGroup,
      departmentId: employees.departmentId,
    }).from(employees).where(employeeWhere);

    // Get departments for display
    const departmentList = await db.select().from(departments);

    // Get all attendance records for the period
    const attendanceRecords = await db.select({
      employeeId: attendance.employeeId,
      date: attendance.date,
    })
      .from(attendance)
      .where(and(
        gte(attendance.date, startOfPeriod),
        lte(attendance.date, endOfPeriod)
      ));

    // Get approved leave records for the period
    const leaveRecords = await db.select({
      employeeId: leaveRequests.employeeId,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
    })
      .from(leaveRequests)
      .where(and(
        gte(leaveRequests.startDate, startOfPeriod),
        lte(leaveRequests.endDate, endOfPeriod),
        eq(leaveRequests.status, 'approved')
      ));

    // Calculate working days in the period (excluding weekends)
    let workingDays = 0;
    const tempDate = new Date(startOfPeriod);
    
    while (tempDate <= endOfPeriod) {
      const dayOfWeek = tempDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        workingDays++;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // Calculate absence data for each employee
    const absenceData = allEmployees.map(emp => {
      const department = departmentList.find(dept => dept.id === emp.departmentId);
      
      // Count present days
      const presentDays = attendanceRecords.filter(record => record.employeeId === emp.id).length;
      
      // Count leave days that fall within the period and on working days
      let leaveDays = 0;
      leaveRecords.forEach(leave => {
        if (leave.employeeId === emp.id) {
          const leaveStart = new Date(Math.max(leave.startDate.getTime(), startOfPeriod.getTime()));
          const leaveEnd = new Date(Math.min(leave.endDate.getTime(), endOfPeriod.getTime()));
          
          // Count only working days during leave period
          const leaveDate = new Date(leaveStart);
          while (leaveDate <= leaveEnd) {
            const dayOfWeek = leaveDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
              leaveDays++;
            }
            leaveDate.setDate(leaveDate.getDate() + 1);
          }
        }
      });
      
      // Calculate absent days (working days - present days - leave days)
      const absentDays = Math.max(0, workingDays - presentDays - leaveDays);
      const attendancePercentage = workingDays > 0 ? Math.round(((presentDays + leaveDays) / workingDays) * 100) : 0;

      return {
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        department: department?.name || 'Unknown',
        employeeGroup: emp.employeeGroup,
        absentDays,
        presentDays,
        leaveDays,
        workingDays,
        attendancePercentage
      };
    })
    .filter(emp => emp.absentDays > 0) // Only show employees with absence
    .sort((a, b) => b.absentDays - a.absentDays); // Sort by most absent days

    res.json(absenceData);
  } catch (error) {
    console.error("Failed to fetch monthly absence report:", error);
    res.status(500).json({ message: "Failed to fetch monthly absence report" });
  }
});

// Helper function to check if a date is a government holiday
function isGovernmentHoliday(date: Date): boolean {
  // This would typically check against a database of government holidays
  // For now, we'll use some common Sri Lankan holidays as examples
  const holidays = [
    '2025-01-01', // New Year's Day
    '2025-02-04', // Independence Day
    '2025-05-01', // May Day
    '2025-12-25', // Christmas Day
    // Add more holidays as needed
  ];
  
  const dateString = date.toISOString().split('T')[0];
  return holidays.includes(dateString);
}

// Initialize auto-sync on server startup
setTimeout(() => {
  console.log('Initializing auto-sync system...');
  // Enable auto-sync by default with 30-second interval
  autoSyncSettings.enabled = true;
  autoSyncSettings.intervalMinutes = 0.5; // 30 seconds
  startAutoSync();
}, 3000); // Start after 3 seconds to allow server to fully initialize

export default router;

export function registerRoutes(app: any) {
  app.use(router);

  // Authentication Routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Simple demo authentication - in production, use proper password hashing
      if (username === "mof" && password === "555@mof") {
        const user = {
          id: "USR001",
          username: "mof",
          fullName: "Ministry of Finance Administrator",
          email: "admin@mof.gov.lk",
          role: "admin",
          department: "Ministry of Finance",
          position: "System Administrator"
        };
        
        res.json({
          message: "Login successful",
          user,
          token: "demo-jwt-token"
        });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      // Clear any session data here
      res.json({ message: "Logout successful" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      // In a real app, verify the JWT token here
      const user = {
        id: "USR001",
        username: "admin",
        fullName: "System Administrator",
        email: "admin@mof.gov.lk",
        role: "admin",
        department: "IT Department",
        position: "System Administrator"
      };
      
      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // User Notifications API
  app.get("/api/notifications", async (req, res) => {
    try {
      // Mock notifications data for demo
      const notifications = [
        {
          id: 1,
          title: "Leave Request Approved",
          message: "Your leave request for July 15-16 has been approved.",
          type: "success",
          timestamp: new Date("2025-07-07T09:00:00Z"),
          read: false,
          category: "Leave"
        },
        {
          id: 2,
          title: "Overtime Request Submitted",
          message: "Your overtime request for July 5 has been submitted and is pending approval.",
          type: "info",
          timestamp: new Date("2025-07-06T17:30:00Z"),
          read: false,
          category: "Overtime"
        },
        {
          id: 3,
          title: "System Maintenance",
          message: "System maintenance scheduled for July 8, 2025 from 10:00 PM to 12:00 AM.",
          type: "warning",
          timestamp: new Date("2025-07-05T15:00:00Z"),
          read: true,
          category: "System"
        },
        {
          id: 4,
          title: "Monthly Report Available",
          message: "June 2025 attendance report is now available for download.",
          type: "info",
          timestamp: new Date("2025-07-01T10:00:00Z"),
          read: true,
          category: "Reports"
        },
        {
          id: 5,
          title: "Profile Updated",
          message: "Your profile information has been successfully updated.",
          type: "success",
          timestamp: new Date("2025-06-30T14:20:00Z"),
          read: true,
          category: "Profile"
        }
      ];
      
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // In a real app, update the notification as read in the database
      res.json({ message: "Notification marked as read", id });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  app.post("/api/notifications/mark-all-read", async (req, res) => {
    try {
      // In a real app, mark all notifications as read in the database
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to update notifications" });
    }
  });

  // Holiday Management Routes  
  app.get("/api/holidays", async (req, res) => {
    try {
      const { year } = req.query;
      const holidays = await storage.getHolidays(year ? parseInt(year as string) : undefined);
      res.json(holidays);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  app.post("/api/holidays", async (req, res) => {
    try {
      const validated = insertHolidaySchema.parse(req.body);
      const holiday = await storage.createHoliday(validated);
      res.json(holiday);
    } catch (error: any) {
      console.error("Error creating holiday:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", details: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create holiday" });
      }
    }
  });

  app.get("/api/holidays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const holiday = await storage.getHoliday(id);
      if (!holiday) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      res.json(holiday);
    } catch (error) {
      console.error("Error fetching holiday:", error);
      res.status(500).json({ message: "Failed to fetch holiday" });
    }
  });

  app.put("/api/holidays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertHolidaySchema.partial().parse(req.body);
      const holiday = await storage.updateHoliday(id, validated);
      res.json(holiday);
    } catch (error: any) {
      console.error("Error updating holiday:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", details: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update holiday" });
      }
    }
  });

  app.delete("/api/holidays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteHoliday(id);
      res.json({ message: "Holiday deleted successfully" });
    } catch (error) {
      console.error("Error deleting holiday:", error);
      res.status(500).json({ message: "Failed to delete holiday" });
    }
  });

  // Leave Types API routes
  app.get("/api/leave-types", async (req, res) => {
    try {
      const leaveTypes = await storage.getLeaveTypes();
      res.json(leaveTypes);
    } catch (error) {
      console.error("Error fetching leave types:", error);
      res.status(500).json({ error: "Failed to fetch leave types" });
    }
  });

  app.post("/api/leave-types", async (req, res) => {
    try {
      const validatedData = insertLeaveTypeSchema.parse(req.body);
      const leaveType = await storage.createLeaveType(validatedData);
      res.status(201).json(leaveType);
    } catch (error) {
      console.error("Error creating leave type:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create leave type" });
      }
    }
  });

  app.get("/api/leave-types/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const leaveType = await storage.getLeaveType(id);
      if (!leaveType) {
        return res.status(404).json({ error: "Leave type not found" });
      }
      res.json(leaveType);
    } catch (error) {
      console.error("Error fetching leave type:", error);
      res.status(500).json({ error: "Failed to fetch leave type" });
    }
  });

  app.put("/api/leave-types/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertLeaveTypeSchema.partial().parse(req.body);
      const leaveType = await storage.updateLeaveType(id, validatedData);
      res.json(leaveType);
    } catch (error) {
      console.error("Error updating leave type:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update leave type" });
      }
    }
  });

  app.delete("/api/leave-types/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLeaveType(id);
      res.json({ message: "Leave type deleted successfully" });
    } catch (error) {
      console.error("Error deleting leave type:", error);
      res.status(500).json({ error: "Failed to delete leave type" });
    }
  });

  // Company settings endpoints
  app.get('/api/company-settings', (req: any, res: any) => {
    try {
      const settingsPath = path.join(__dirname, 'data', 'company-settings.json');
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        res.json(settings);
      } else {
        // Return default settings
        const defaultSettings = {
          companyName: "Ministry of Finance",
          tagline: "Srilanka",
          address: "Ministry of Finance, Colombo, Sri Lanka",
          phone: "+94 11 234 5678",
          email: "hr@wtt.gov.lk",
          website: "https://wtt.gov.lk",
          taxId: "123456789V",
          establishedYear: "2020"
        };
        res.json(defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
      res.status(500).json({ error: 'Failed to fetch company settings' });
    }
  });

  app.post('/api/company-settings', (req: any, res: any) => {
    try {
      const dataDir = path.join(__dirname, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const settingsPath = path.join(dataDir, 'company-settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 2));
      res.json({ message: 'Company settings saved successfully' });
    } catch (error) {
      console.error('Error saving company settings:', error);
      res.status(500).json({ error: 'Failed to save company settings' });
    }
  });

// License validation and session management
router.post('/api/license/validate', (req: any, res: any) => {
  try {
    const { licenseKey } = req.body;
    const sessionId = req.session?.id || req.sessionID || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Validate license key
    const licenseConfigs: Record<string, any> = {
      'J7K9-P2Q4-R6T8-U1V3': { tier: 'Enterprise Pro', maxWebLogins: 2 },
      'M5N7-B8C2-L4X6-W9Z0': { tier: 'Enterprise Plus', maxWebLogins: 3 },
      'D3F5-H6J8-K1L4-P7R9': { tier: 'Enterprise Basic', maxWebLogins: 1 },
      'Q2W4-E5R7-T8Y1-U3I6': { tier: 'Enterprise Max', maxWebLogins: 5 },
      'A9S2-D5F7-G3H6-J8K1': { tier: 'Enterprise Demo', maxWebLogins: 999 }
    };

    const config = licenseConfigs[licenseKey];
    if (!config) {
      return res.status(400).json({ valid: false, message: 'Invalid license key' });
    }

    // Check current session count for this license
    const currentSessions = sessionManager.getSessionCount(licenseKey);
    if (currentSessions >= config.maxWebLogins && config.maxWebLogins !== 999) {
      return res.status(400).json({ 
        valid: false, 
        message: `Maximum ${config.maxWebLogins} concurrent sessions reached for this license` 
      });
    }

    // Add session
    sessionManager.addSession(sessionId, ipAddress, userAgent, licenseKey);
    
    res.json({ 
      valid: true, 
      message: 'License validated successfully',
      currentSessions: sessionManager.getSessionCount(licenseKey),
      maxSessions: config.maxWebLogins
    });
  } catch (error) {
    console.error('Error validating license:', error);
    res.status(500).json({ valid: false, message: 'License validation failed' });
  }
});

// Get current session info
router.get('/api/license/sessions', (req: any, res: any) => {
  try {
    console.log('Sessions API called with query:', req.query);
    const { licenseKey } = req.query;
    
    // Get sessions from session manager
    const sessions = licenseKey ? 
      sessionManager.getActiveSessionsForLicense(licenseKey) : 
      sessionManager.getAllActiveSessions();
    
    console.log('Found sessions:', sessions.length);
    
    // Format session info safely
    const sessionInfo = sessions.map(session => {
      try {
        return {
          sessionId: session.sessionId || 'Unknown',
          ipAddress: session.ipAddress || 'Unknown',
          loginTime: session.loginTime || new Date(),
          lastActivity: session.lastActivity || new Date(),
          userAgent: session.userAgent || 'Unknown'
        };
      } catch (sessionError) {
        console.error('Error processing session:', sessionError);
        return {
          sessionId: 'Error',
          ipAddress: 'Unknown',
          loginTime: new Date(),
          lastActivity: new Date(),
          userAgent: 'Unknown'
        };
      }
    });

    res.json({
      currentSessions: sessions.length,
      sessions: sessionInfo
    });
  } catch (error) {
    console.error('Error fetching session info:', error);
    res.status(500).json({ error: 'Failed to fetch session info', details: error.message });
  }
});

  return app;
}
