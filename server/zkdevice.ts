import ZKLib from 'zklib-js';

export interface ZKDeviceInfo {
  ip: string;
  port: number;
  timeout: number;
  inport: number;
}

export interface AttendanceRecord {
  uid: string;
  timestamp: Date;
  state: number;
  type: number;
}

export class ZKDeviceManager {
  private devices: Map<string, any> = new Map();

  async connectDevice(deviceId: string, deviceInfo: ZKDeviceInfo): Promise<boolean> {
    if (this.devices.has(deviceId)) {
      await this.disconnectDevice(deviceId);
    }

    try {
      const zkInstance = new ZKLib(
        deviceInfo.ip,
        deviceInfo.port,
        deviceInfo.timeout,
        deviceInfo.inport
      );

      await zkInstance.createSocket();
      this.devices.set(deviceId, zkInstance);
      console.log(`Connected to ZK device ${deviceId} at ${deviceInfo.ip}`);
      return true;
    } catch (error) {
      console.error(`Failed to connect to ZK device ${deviceId}:`, error);
      return false;
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      try {
        await device.disconnect();
        this.devices.delete(deviceId);
        console.log(`Disconnected from ZK device ${deviceId}`);
      } catch (error) {
        console.error(`Error disconnecting from device ${deviceId}:`, error);
      }
    }
  }

  isDeviceConnected(deviceId: string): boolean {
    return this.devices.has(deviceId);
  }

  async getUsers(deviceId: string): Promise<any[]> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not connected`);
    }

    try {
      const users = await device.getUsers();
      if (users && users.data) {
        return users.data.map((user: any) => ({ ...user, uid: String(user.uid) }));
      }
      return [];
    } catch (error) {
      console.error(`Error getting users from device ${deviceId}:`, error);
      throw new Error(`Failed to get users from device: ${(error as Error).message}`);
    }
  }

  async getAttendanceLogs(deviceId: string): Promise<AttendanceRecord[]> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not connected`);
    }

    try {
      const result = await device.getAttendances();

      if (!result) {
        console.log(`No attendance logs received from device ${deviceId}.`);
        return [];
      }

      const logs = Array.isArray(result) ? result : result.data;

      if (!Array.isArray(logs)) {
        console.error(`Attendance logs data from device ${deviceId} is not an array:`, result);
        return [];
      }

      console.log(`Received ${logs.length} logs from device ${deviceId}.`);
      
      // Debug: Log the first few raw log entries
      if (logs.length > 0) {
        console.log('First 5 raw log entries:', JSON.stringify(logs.slice(0, 5), null, 2));
      }

      const validRecords: AttendanceRecord[] = [];
      for (const log of logs) {
        if (log && log.recordTime) {
          const timestamp = new Date(log.recordTime);
          if (!isNaN(timestamp.getTime())) {
            // Try both uid and deviceUserId to find the correct field
            const uid = log.uid || log.deviceUserId || log.userId || log.id;
            if (!uid) {
              console.warn('Log entry has no UID field:', log);
              continue;
            }
            
            validRecords.push({
              uid: String(uid).trim(),
              timestamp: timestamp,
              state: log.state ?? 0,
              type: log.type ?? 0,
            });
          } else {
            console.warn(`Skipping log with invalid recordTime:`, log);
          }
        } else {
          console.warn(`Skipping log with missing or invalid recordTime:`, log);
        }
      }
      
      console.log(`Successfully processed ${validRecords.length} valid records out of ${logs.length} total logs.`);
      return validRecords;
    } catch (error) {
      console.error(`Error getting attendance logs from device ${deviceId}:`, error);
      return [];
    }
  }



  async getDeviceInfo(deviceId: string): Promise<any> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not connected`);
    }

    try {
      return await device.getInfo();
    } catch (error) {
      console.error(`Error getting device info for ${deviceId}:`, error);
      return null;
    }
  }

  async clearAttendanceLogs(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not connected`);
    }

    try {
      await device.clearAttendanceLog();
      console.log(`Cleared attendance logs for device ${deviceId}`);
      return true;
    } catch (error) {
      console.error(`Error clearing attendance logs for device ${deviceId}:`, error);
      return false;
    }
  }

  async syncAttendanceData(deviceId: string): Promise<AttendanceRecord[]> {
    try {
      const logs = await this.getAttendanceLogs(deviceId);
      console.log(`Retrieved ${logs.length} attendance records from device ${deviceId}`);
      return logs;
    } catch (error) {
      console.error(`Error syncing attendance data from device ${deviceId}:`, error);
      return [];
    }
  }

  getConnectedDevices(): string[] {
    return Array.from(this.devices.keys());
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.devices.keys()).map(deviceId =>
      this.disconnectDevice(deviceId)
    );
    await Promise.all(disconnectPromises);
  }

  async testConnection(deviceInfo: ZKDeviceInfo): Promise<boolean> {
    let zkInstance: any;
    try {
      console.log(`[testConnection] Attempting to connect to ${deviceInfo.ip}:${deviceInfo.port}`);
      zkInstance = new ZKLib(
        deviceInfo.ip,
        deviceInfo.port,
        deviceInfo.timeout,
        deviceInfo.inport
      );
      await zkInstance.createSocket();
      console.log(`[testConnection] Socket created. Getting device info...`);
      const info = await zkInstance.getInfo();
      console.log(`[testConnection] Received info:`, info);

      if (!info || Object.keys(info).length === 0) {
        throw new Error("Received empty or invalid info from device.");
      }

      console.log(`[testConnection] Connection successful.`);
      await zkInstance.disconnect();
      return true;
    } catch (error) {
      console.error(`[testConnection] Failed for ${deviceInfo.ip}:${deviceInfo.port}`, error);
      if (zkInstance) {
        await zkInstance.disconnect().catch(() => {});
      }
      return false;
    }
  }
}

// Singleton instance
export const zkDeviceManager = new ZKDeviceManager();

// Cleanup on process exit
process.on('exit', () => {
  zkDeviceManager.disconnectAll();
});

process.on('SIGINT', () => {
  zkDeviceManager.disconnectAll();
  process.exit(0);
});