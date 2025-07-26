import { useState, useEffect } from 'react';

interface LicenseState {
  licenseKey: string;
  isValid: boolean;
  expiryDate: Date | null;
  licensedTo: string;
  features: string[];
  tier: string;
  maxWebLogins: number;
  currentLogins: number;
}

export function useLicense() {
  const [license, setLicense] = useState<LicenseState>({
    licenseKey: '',
    isValid: false,
    expiryDate: null,
    licensedTo: '',
    features: [],
    tier: '',
    maxWebLogins: 0,
    currentLogins: 0
  });

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load license from localStorage on mount
    const savedLicense = localStorage.getItem('systemLicense');
    if (savedLicense) {
      const parsed = JSON.parse(savedLicense);
      if (parsed.expiryDate) {
        parsed.expiryDate = new Date(parsed.expiryDate);
      }
      setLicense(parsed);
      
      // If we have a valid license, create a session on the backend
      if (parsed.isValid && parsed.licenseKey) {
        createSessionForStoredLicense(parsed.licenseKey);
      }
    }
    setIsInitialized(true);
  }, []);

  const createSessionForStoredLicense = async (licenseKey: string) => {
    try {
      const response = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey })
      });
      
      const result = await response.json();
      if (result.valid) {
        setLicense(prev => ({
          ...prev,
          currentLogins: result.currentSessions || 0
        }));
        startSessionPolling(licenseKey);
      }
    } catch (error) {
      console.error('Error creating session for stored license:', error);
    }
  };

  const validateLicense = async (key: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key })
      });

      const result = await response.json();
      
      if (result.valid) {
        // Define license tiers with specific configurations
        const licenseConfigs: Record<string, Omit<LicenseState, 'licenseKey' | 'currentLogins'>> = {
          'J7K9-P2Q4-R6T8-U1V3': {
            isValid: true,
            licensedTo: 'Live U Pvt Ltd',
            expiryDate: new Date('2025-12-31'),
            features: ['HR Management', 'Attendance Tracking', 'Biometric Integration', 'Reports', 'Advanced Analytics'],
            tier: 'Enterprise Pro',
            maxWebLogins: 2
          },
          'M5N7-B8C2-L4X6-W9Z0': {
            isValid: true,
            licensedTo: 'Live U Pvt Ltd',
            expiryDate: new Date('2025-12-31'),
            features: ['HR Management', 'Attendance Tracking', 'Biometric Integration', 'Reports'],
            tier: 'Enterprise Plus',
            maxWebLogins: 3
          },
          'D3F5-H6J8-K1L4-P7R9': {
            isValid: true,
            licensedTo: 'Live U Pvt Ltd',
            expiryDate: new Date('2025-12-31'),
            features: ['HR Management', 'Attendance Tracking', 'Basic Reports'],
            tier: 'Enterprise Basic',
            maxWebLogins: 1
          },
          'Q2W4-E5R7-T8Y1-U3I6': {
            isValid: true,
            licensedTo: 'Live U Pvt Ltd',
            expiryDate: new Date('2025-12-31'),
            features: ['HR Management', 'Attendance Tracking', 'Biometric Integration', 'Reports', 'Multi-User Access'],
            tier: 'Enterprise Max',
            maxWebLogins: 5
          },
          'A9S2-D5F7-G3H6-J8K1': {
            isValid: true,
            licensedTo: 'Live U Pvt Ltd - Demo',
            expiryDate: new Date('2025-12-31'),
            features: ['HR Management', 'Attendance Tracking', 'Demo Features'],
            tier: 'Enterprise Demo',
            maxWebLogins: 999
          }
        };

        const config = licenseConfigs[key];
        
        const newLicense: LicenseState = {
          licenseKey: key,
          currentLogins: result.currentSessions || 0,
          ...config,
          isValid: true,
          licensedTo: config?.licensedTo || '',
          expiryDate: config?.expiryDate || null,
          features: config?.features || [],
          tier: config?.tier || '',
          maxWebLogins: config?.maxWebLogins || 0
        };

        setLicense(newLicense);
        localStorage.setItem('systemLicense', JSON.stringify(newLicense));
        
        // Start polling for session updates
        startSessionPolling(key);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('License validation error:', error);
      return false;
    }
  };

  const startSessionPolling = (licenseKey: string) => {
    // Poll session count every 30 seconds
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/license/sessions?licenseKey=${licenseKey}`);
        const result = await response.json();
        
        setLicense(prev => ({
          ...prev,
          currentLogins: result.currentSessions || 0
        }));
      } catch (error) {
        console.error('Session polling error:', error);
      }
    }, 30000);

    // Clear interval when component unmounts
    return () => clearInterval(interval);
  };

  const isFeatureEnabled = (feature: string): boolean => {
    return license.isValid && license.features.includes(feature);
  };

  const requiresLicense = (): boolean => {
    return !license.isValid;
  };

  return {
    license,
    validateLicense,
    isFeatureEnabled,
    requiresLicense
  };
}