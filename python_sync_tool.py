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
        self.known_devices = set()  # Track known device IDs
        self.device_check_interval = 5  # Check for new devices every 5 cycles
        self.cycle_count = 0
        
        logger.info(f"Attendance Sync Tool initialized")
        logger.info(f"API Base URL: {self.base_url}")
        logger.info(f"Sync Interval: {self.sync_interval} seconds")
        logger.info(f"Mode: Attendance sync only (no employee sync)")

    def get_biometric_devices(self) -> List[Dict]:
        """Get list of all biometric devices and detect new ones"""
        try:
            response = self.session.get(f"{self.base_url}/api/biometric-devices")
            response.raise_for_status()
            devices = response.json()
            
            # Extract device IDs from current devices
            current_device_ids = {device.get('deviceId') for device in devices if device.get('deviceId')}
            
            # Check for new devices
            new_devices = current_device_ids - self.known_devices
            removed_devices = self.known_devices - current_device_ids
            
            if new_devices:
                logger.info(f"🔍 Detected {len(new_devices)} new devices: {', '.join(new_devices)}")
                for device_id in new_devices:
                    logger.info(f"📱 New device added: {device_id}")
            
            if removed_devices:
                logger.info(f"❌ Detected {len(removed_devices)} removed devices: {', '.join(removed_devices)}")
                # Clean up sync times for removed devices
                for device_id in removed_devices:
                    self.last_sync_times.pop(device_id, None)
            
            # Update known devices
            self.known_devices = current_device_ids
            
            logger.info(f"📋 Total active devices: {len(devices)} ({', '.join(current_device_ids)})")
            return devices
        except requests.RequestException as e:
            logger.error(f"Failed to get biometric devices: {e}")
            return []

    def sync_device(self, device_id: str, device_name: str = None) -> Dict:
        """Sync attendance data for a specific device (attendance only, no employee sync)"""
        try:
            display_name = device_name or device_id
            logger.info(f"🔄 Starting attendance sync for device: {display_name}")
            
            response = self.session.post(f"{self.base_url}/api/auto-sync/device/{device_id}")
            response.raise_for_status()
            
            result = response.json()
            
            if result.get('success'):
                raw_records = result.get('rawRecords', 0)
                processed_records = result.get('processedRecords', 0)
                
                logger.info(f"✅ Device {display_name}: {raw_records} raw → {processed_records} attendance records saved")
                
                self.last_sync_times[device_id] = datetime.now()
                
                return {
                    'success': True,
                    'device_id': device_id,
                    'device_name': display_name,
                    'raw_records': raw_records,
                    'processed_records': processed_records
                }
            else:
                error_msg = result.get('message', 'Unknown error')
                logger.error(f"❌ Sync failed for device {display_name}: {error_msg}")
                return {'success': False, 'device_id': device_id, 'device_name': display_name, 'error': error_msg}
                
        except requests.RequestException as e:
            logger.error(f"🌐 Network error syncing device {display_name}: {e}")
            return {'success': False, 'device_id': device_id, 'device_name': display_name, 'error': str(e)}

    def sync_all_devices(self) -> Dict:
        """Sync all biometric devices (attendance data only)"""
        # Check for new devices periodically
        if self.cycle_count % self.device_check_interval == 0:
            logger.info(f"🔍 Checking for device changes (cycle #{self.cycle_count})")
        
        devices = self.get_biometric_devices()
        
        if not devices:
            logger.warning("⚠️ No devices found to sync")
            return {'total_devices': 0, 'successful_syncs': 0, 'failed_syncs': 0}
        
        results = {
            'total_devices': len(devices),
            'successful_syncs': 0,
            'failed_syncs': 0,
            'device_results': [],
            'total_raw_records': 0,
            'total_processed_records': 0
        }
        
        for device in devices:
            device_id = device.get('deviceId')
            device_name = device.get('deviceName', device_id)
            
            if not device_id:
                logger.warning(f"⚠️ Device missing deviceId: {device}")
                continue
                
            result = self.sync_device(device_id, device_name)
            results['device_results'].append(result)
            
            if result['success']:
                results['successful_syncs'] += 1
                results['total_raw_records'] += result.get('raw_records', 0)
                results['total_processed_records'] += result.get('processed_records', 0)
            else:
                results['failed_syncs'] += 1
                
            # Small delay between device syncs to avoid overwhelming the system
            time.sleep(1)
        
        # Log summary
        success_rate = (results['successful_syncs'] / results['total_devices']) * 100 if results['total_devices'] > 0 else 0
        logger.info(f"📊 Sync cycle summary: {results['successful_syncs']}/{results['total_devices']} devices ({success_rate:.1f}%)")
        logger.info(f"📈 Records: {results['total_raw_records']} raw → {results['total_processed_records']} attendance records")
        
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
        print("\n" + "="*70)
        print("📊 ATTENDANCE SYNC TOOL STATUS")
        print("="*70)
        print(f"🌐 API URL: {self.base_url}")
        print(f"⏱️ Sync Interval: {self.sync_interval} seconds")
        print(f"🕐 Current Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🔄 Sync Cycles: {self.cycle_count}")
        print(f"📱 Known Devices: {len(self.known_devices)}")
        
        if self.known_devices:
            print(f"🔗 Active Devices: {', '.join(sorted(self.known_devices))}")
        
        if self.last_sync_times:
            print("\n📅 Last Sync Times:")
            for device_id, last_sync in sorted(self.last_sync_times.items()):
                time_diff = datetime.now() - last_sync
                status = "🟢" if time_diff.seconds < 120 else "🟡" if time_diff.seconds < 300 else "🔴"
                print(f"  {status} {device_id}: {last_sync.strftime('%Y-%m-%d %H:%M:%S')}")
        else:
            print("\n⚠️ No syncs performed yet")
        
        print("="*70)
        print("💡 Note: This tool syncs ATTENDANCE data only (no employee sync)")
        print("🔄 New devices added to web app will be auto-detected")

    def run_continuous_sync(self):
        """Run continuous attendance sync in a loop with dynamic device detection"""
        logger.info("🚀 Starting continuous attendance sync...")
        logger.info("📱 Dynamic device detection enabled - new devices will be auto-discovered")
        
        # Initial health check
        if not self.check_api_health():
            logger.error("❌ API health check failed. Exiting.")
            return
        
        # Initial device discovery
        logger.info("🔍 Initial device discovery...")
        self.get_biometric_devices()
        
        try:
            while True:
                self.cycle_count += 1
                logger.info(f"\n--- 🔄 Sync Cycle #{self.cycle_count} ---")
                
                # Perform sync (with dynamic device detection)
                results = self.sync_all_devices()
                
                # Print detailed status every 10 cycles
                if self.cycle_count % 10 == 0:
                    self.print_status()
                
                # Wait for next sync
                logger.info(f"⏱️ Waiting {self.sync_interval} seconds for next sync...")
                time.sleep(self.sync_interval)
                
        except KeyboardInterrupt:
            logger.info("\n🛑 Sync tool stopped by user (Ctrl+C)")
            logger.info("📊 Final status:")
            self.print_status()
        except Exception as e:
            logger.error(f"💥 Unexpected error in sync loop: {e}")
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