#!/usr/bin/env python3
"""
Standalone Python Attendance Sync Tool
Ministry of Finance Sri Lanka HR System

This tool continuously syncs attendance data from ZK biometric devices to the database.
Run this script manually or as a background service.
"""

import time
import requests
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
import sys
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('attendance_sync.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class AttendanceSyncTool:
    def __init__(self, base_url: str = "http://localhost:3000", sync_interval: int = 30):
        """
        Initialize the sync tool
        
        Args:
            base_url: Base URL of the HR system API
            sync_interval: Sync interval in seconds (default: 30 seconds)
        """
        self.base_url = base_url.rstrip('/')
        self.sync_interval = sync_interval
        self.session = requests.Session()
        self.last_sync_times = {}
        
        logger.info(f"Attendance Sync Tool initialized")
        logger.info(f"API Base URL: {self.base_url}")
        logger.info(f"Sync Interval: {self.sync_interval} seconds")

    def get_biometric_devices(self) -> List[Dict]:
        """Get list of all biometric devices"""
        try:
            response = self.session.get(f"{self.base_url}/api/biometric-devices")
            response.raise_for_status()
            devices = response.json()
            logger.info(f"Found {len(devices)} biometric devices")
            return devices
        except requests.RequestException as e:
            logger.error(f"Failed to get biometric devices: {e}")
            return []

    def sync_device(self, device_id: str) -> Dict:
        """Sync attendance data for a specific device"""
        try:
            logger.info(f"Starting sync for device: {device_id}")
            
            response = self.session.post(f"{self.base_url}/api/auto-sync/device/{device_id}")
            response.raise_for_status()
            
            result = response.json()
            
            if result.get('success'):
                raw_records = result.get('rawRecords', 0)
                processed_records = result.get('processedRecords', 0)
                
                logger.info(f"Device {device_id}: {raw_records} raw records, {processed_records} processed")
                
                self.last_sync_times[device_id] = datetime.now()
                
                return {
                    'success': True,
                    'device_id': device_id,
                    'raw_records': raw_records,
                    'processed_records': processed_records
                }
            else:
                logger.error(f"Sync failed for device {device_id}: {result.get('message', 'Unknown error')}")
                return {'success': False, 'device_id': device_id, 'error': result.get('message')}
                
        except requests.RequestException as e:
            logger.error(f"Network error syncing device {device_id}: {e}")
            return {'success': False, 'device_id': device_id, 'error': str(e)}

    def sync_all_devices(self) -> Dict:
        """Sync all biometric devices"""
        devices = self.get_biometric_devices()
        
        if not devices:
            logger.warning("No devices found to sync")
            return {'total_devices': 0, 'successful_syncs': 0, 'failed_syncs': 0}
        
        results = {
            'total_devices': len(devices),
            'successful_syncs': 0,
            'failed_syncs': 0,
            'device_results': []
        }
        
        for device in devices:
            device_id = device.get('deviceId')
            if not device_id:
                logger.warning(f"Device missing deviceId: {device}")
                continue
                
            result = self.sync_device(device_id)
            results['device_results'].append(result)
            
            if result['success']:
                results['successful_syncs'] += 1
            else:
                results['failed_syncs'] += 1
                
            # Small delay between device syncs to avoid overwhelming the system
            time.sleep(2)
        
        logger.info(f"Sync completed: {results['successful_syncs']}/{results['total_devices']} devices successful")
        return results

    def check_api_health(self) -> bool:
        """Check if the API is accessible"""
        try:
            response = self.session.get(f"{self.base_url}/api/database/status")
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') == 'connected':
                logger.info("API and database are healthy")
                return True
            else:
                logger.warning(f"Database status: {data.get('status')}")
                return False
                
        except requests.RequestException as e:
            logger.error(f"API health check failed: {e}")
            return False

    def print_status(self):
        """Print current sync status"""
        print("\n" + "="*60)
        print("ATTENDANCE SYNC TOOL STATUS")
        print("="*60)
        print(f"API URL: {self.base_url}")
        print(f"Sync Interval: {self.sync_interval} seconds")
        print(f"Current Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        if self.last_sync_times:
            print("\nLast Sync Times:")
            for device_id, last_sync in self.last_sync_times.items():
                print(f"  {device_id}: {last_sync.strftime('%Y-%m-%d %H:%M:%S')}")
        else:
            print("\nNo syncs performed yet")
        
        print("="*60)

    def run_continuous_sync(self):
        """Run continuous sync in a loop"""
        logger.info("Starting continuous attendance sync...")
        
        # Initial health check
        if not self.check_api_health():
            logger.error("API health check failed. Exiting.")
            return
        
        sync_count = 0
        
        try:
            while True:
                sync_count += 1
                logger.info(f"\n--- Sync Cycle #{sync_count} ---")
                
                # Perform sync
                results = self.sync_all_devices()
                
                # Log summary
                if results['total_devices'] > 0:
                    success_rate = (results['successful_syncs'] / results['total_devices']) * 100
                    logger.info(f"Sync cycle completed: {success_rate:.1f}% success rate")
                
                # Print status every 10 cycles
                if sync_count % 10 == 0:
                    self.print_status()
                
                # Wait for next sync
                logger.info(f"Waiting {self.sync_interval} seconds for next sync...")
                time.sleep(self.sync_interval)
                
        except KeyboardInterrupt:
            logger.info("\nSync tool stopped by user (Ctrl+C)")
        except Exception as e:
            logger.error(f"Unexpected error in sync loop: {e}")
            raise

    def run_single_sync(self):
        """Run a single sync cycle"""
        logger.info("Running single sync cycle...")
        
        if not self.check_api_health():
            logger.error("API health check failed.")
            return False
        
        results = self.sync_all_devices()
        
        if results['total_devices'] > 0:
            success_rate = (results['successful_syncs'] / results['total_devices']) * 100
            logger.info(f"Single sync completed: {success_rate:.1f}% success rate")
            return success_rate == 100.0
        
        return False


def main():
    """Main function"""
    print("Ministry of Finance Sri Lanka")
    print("Attendance Sync Tool")
    print("==================")
    
    # Configuration
    API_URL = os.getenv('API_URL', 'http://localhost:3000')
    SYNC_INTERVAL = int(os.getenv('SYNC_INTERVAL', '30'))  # seconds
    
    # Create sync tool
    sync_tool = AttendanceSyncTool(base_url=API_URL, sync_interval=SYNC_INTERVAL)
    
    # Check command line arguments
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'single':
            # Run single sync
            success = sync_tool.run_single_sync()
            sys.exit(0 if success else 1)
            
        elif command == 'status':
            # Show status only
            sync_tool.print_status()
            sys.exit(0)
            
        elif command == 'test':
            # Test API connection
            if sync_tool.check_api_health():
                print("✅ API connection successful")
                devices = sync_tool.get_biometric_devices()
                print(f"✅ Found {len(devices)} biometric devices")
                sys.exit(0)
            else:
                print("❌ API connection failed")
                sys.exit(1)
                
        else:
            print(f"Unknown command: {command}")
            print("Usage: python python_sync_tool.py [single|status|test]")
            sys.exit(1)
    
    # Default: run continuous sync
    sync_tool.run_continuous_sync()


if __name__ == "__main__":
    main()