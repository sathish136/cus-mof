// This file now handles Group Working Hours settings instead of HRSettings
import { GroupWorkingHours } from '../shared/schema';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express, { Router } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SETTINGS_FILE = join(__dirname, 'data', 'group-working-hours.json');

// Ensure data directory exists
const DATA_DIR = dirname(SETTINGS_FILE);
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default settings matching exact policy requirements
const defaultSettings: GroupWorkingHours = {
  groupA: {
    startTime: '08:30',
    endTime: '16:15',
    durationMinutes: 450, // 7.5 hours * 60 = 450 minutes  
    minHoursForOT: 7.5, // Overtime after 7.5 hours (user policy requirement)
    lateArrivalPolicy: {
      gracePeriodUntil: '09:00', // 30-minute grace period
      halfDayAfter: '10:00',     // Half day if arrival after 10:00 AM
      halfDayBefore: '14:45'     // Half day if arrival before 2:45 PM
    },
    shortLeavePolicy: {
      morningStart: '08:30',
      morningEnd: '10:00',       // Morning short leave: 8:30 AM - 10:00 AM
      eveningStart: '14:45',     // Evening short leave: 2:45 PM - 4:15 PM
      eveningEnd: '16:15',
      maxPerMonth: 2,            // Maximum 2 per month
      preApprovalRequired: true, // Must be pre-approved
      minimumWorkingHoursRequired: true // Must still meet minimum working hours
    },
    halfDayRule: {
      appliesAfter: '10:00',
      appliesBefore: '14:45',
      shortLeaveExcusesHalfDay: false
    },
    overtimePolicy: {
      normalDay: {
        minHoursForOT: 7.5,
        saturdaySundayFullOT: true,
        preApprovalRequired: false
      },
      holiday: {
        allHoursAsOT: true
      }
    }
  },
  groupB: {
    startTime: '08:00',
    endTime: '16:45',
    durationMinutes: 525, // 8.75 hours * 60 = 525 minutes  
    minHoursForOT: 8.75,  // Overtime after 8.75 hours
    lateArrivalPolicy: {
      gracePeriodUntil: '08:15', // 15-minute grace period
      halfDayAfter: '09:30',     // Half day if arrival after 9:30 AM
      halfDayBefore: '15:15',    // Half day if arrival before 3:15 PM
      shortLeaveAllowance: true  // Unless covered by short leave
    },
    shortLeavePolicy: {
      morningStart: '08:00',
      morningEnd: '09:30',       // Morning short leave: 8:00 AM - 9:30 AM
      eveningStart: '15:15',     // Evening short leave: 3:15 PM - 4:45 PM
      eveningEnd: '16:45',
      maxPerMonth: 2,            // Maximum 2 per month
      preApprovalRequired: true  // Must be approved in advance
    },
    halfDayRule: {
      appliesAfter: '09:30',
      appliesBefore: '15:15'
    },
    overtimePolicy: {
      normalDay: {
        minHoursForOT: 8.75,
        saturdaySundayFullOT: true,
        preApprovalRequired: false
      },
      holiday: {
        allHoursAsOT: true
      }
    }
  }
};

// Load settings from file or create with defaults
function loadSettings(): GroupWorkingHours {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
    // If file doesn't exist, save defaults
    saveSettings(defaultSettings);
    return defaultSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
}

// Save settings to file
function saveSettings(settings: GroupWorkingHours): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Get current settings
export function getGroupWorkingHours(): GroupWorkingHours {
  return loadSettings();
}

// Update settings
export function updateGroupWorkingHours(newSettings: Partial<GroupWorkingHours>): GroupWorkingHours {
  const currentSettings = loadSettings();
  const updatedSettings = {
    groupA: { ...currentSettings.groupA, ...newSettings.groupA },
    groupB: { ...currentSettings.groupB, ...newSettings.groupB }
  };
  saveSettings(updatedSettings);
  return updatedSettings;
}

const router: Router = express.Router();

// GET endpoint for group working hours
router.get('/api/group-working-hours', async (req, res) => {
  try {
    const settings = getGroupWorkingHours();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching group working hours:', error);
    res.status(500).json({ error: 'Failed to fetch group working hours' });
  }
});

// POST endpoint for saving group working hours (this is what the frontend uses)
router.post('/api/group-working-hours', async (req, res) => {
  try {
    const newSettings = req.body;
    console.log('Received group working hours update:', JSON.stringify(newSettings, null, 2));
    
    const updatedSettings = updateGroupWorkingHours(newSettings);
    console.log('Successfully updated group working hours:', JSON.stringify(updatedSettings, null, 2));
    
    res.json({ 
      message: 'Group working hours saved successfully',
      settings: updatedSettings 
    });
  } catch (error) {
    console.error('Error saving group working hours:', error);
    res.status(500).json({ error: 'Failed to save group working hours' });
  }
});

// Legacy endpoint (keeping for backward compatibility)
router.post('/api/hr-settings', async (req, res) => {
  try {
    const settings = req.body;
    fs.writeFileSync(join(__dirname, 'data', 'hr-settings.json'), JSON.stringify(settings, null, 2));
    res.json({ message: 'HR settings saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save HR settings' });
  }
});

export default router;
