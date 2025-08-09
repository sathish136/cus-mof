#!/usr/bin/env python3
"""
Replit-Enhanced Attendance Sync Tool
Ministry of Finance Sri Lanka HR System

This tool integrates with Replit's infrastructure for better deployment and management.
Designed to run on Replit or connect to Replit-hosted HR systems.
"""

import time
import requests
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional
from urllib.parse import urlparse, urljoin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('replit_attendance_sync.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class ReplitAttendanceSyncTool:
    def __init__(self, replit_url: str = None, sync_interval: int = 30):
        """
        Initialize the Replit-enhanced sync tool
        
        Args:
            replit_url: Replit app URL (e.g., https://your-app.your-username.repl.co)
            sync_interval: Sync interval in seconds (default: 30 seconds)
        """
        # Auto-detect Replit environment
        self.is_replit = self._detect_replit_environment()
        
        # Configure API URL
        if replit_url:
            self.base_url = replit_url.rstrip('/')
        elif self.is_replit:
            # Running inside Replit
            replit_slug = os.getenv('REPL_SLUG', 'hr-attendance-system')
            replit_owner = os.getenv('REPL_OWNER', 'username')
            self.base_url = f"https://{replit_slug}.{replit_owner}.repl.co"
        else:
            # Default to localhost
            self.base_url = "http://localhost:3000"
        
        self.sync_interval = sync_interval
        self.session = requests.Session()
        self.known_devices = set()
        self.last_sync_times = {}
        self.device_check_interval = 5
        self.cycle_count = 0
        
        # Replit-specific configuration
        self.replit_token = os.getenv('REPLIT_TOKEN')
        self.database_url = os.getenv('DATABASE_URL')
        
        self._initialize_replit_session()
        
        logger.info(f"Replit Attendance Sync Tool initialized")
        logger.info(f"Environment: {'Replit' if self.is_replit else 'External'}")
        logger.info(f"API Base URL: {self.base_url}")
        logger.info(f"Sync Interval: {self.sync_interval} seconds")

    def _detect_replit_environment(self) -> bool:
        """Detect if running in Replit environment"""
        replit_indicators = [
            'REPL_SLUG',
            'REPL_OWNER', 
            'REPLIT_DB_URL',
            'REPLIT_CLUSTER',
            'REPL_ID'
        ]
        
        detected = any(os.getenv(var) for var in replit_indicators)
        if detected:
            logger.info("Detected Replit environment")
        return detected

    def _initialize_replit_session(self):
        """Initialize session with Replit-specific headers"""
        if self.replit_token:
            self.session.headers.update({
                'Authorization': f'Bearer {self.replit_token}',
                'User-Agent': 'Replit-Attendance-Sync/1.0'
            })
        
        # Set timeout for better reliability
        self.session.timeout = 30

    def get_replit_deployment_info(self) -> Dict:
        """Get information about the current Replit deployment"""
        if not self.is_replit:
            return {"status": "not_in_replit"}
        
        deployment_info = {
            "repl_id": os.getenv('REPL_ID'),
            "repl_slug": os.getenv('REPL_SLUG'),
            "repl_owner": os.getenv('REPL_OWNER'),
            "cluster": os.getenv('REPLIT_CLUSTER'),
            "environment": os.getenv('REPL_ENVIRONMENT', 'production'),
            "base_url": self.base_url
        }
        
        return deployment_info

    def get_biometric_devices(self) -> List[Dict]:
        """Get list of all biometric devices with Replit-optimized requests"""
        try:
            # Use Replit-optimized endpoint
            url = f"{self.base_url}/api/biometric-devices"
            
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            devices = response.json()
            
            # Extract device IDs from current devices
            current_device_ids = {device.get('deviceId') for device in devices if device.get('deviceId')}
            
            # Check for new devices
            new_devices = current_device_ids - self.known_devices
            removed_devices = self.known_devices - current_device_ids
            
            if new_devices:
                logger.info(f"New devices detected: {', '.join(new_devices)}")
                for device_id in new_devices:
                    logger.info(f"Device added: {device_id}")
            
            if removed_devices:
                logger.info(f"Devices removed: {', '.join(removed_devices)}")
                # Clean up sync times for removed devices
                for device_id in removed_devices:
                    self.last_sync_times.pop(device_id, None)
            
            # Update known devices
            self.known_devices = current_device_ids
            
            logger.info(f"Active devices: {len(devices)} ({', '.join(current_device_ids)})")
            return devices
            
        except requests.RequestException as e:
            logger.error(f"Failed to get biometric devices: {e}")
            if "timeout" in str(e).lower():
                logger.warning("Request timeout - Replit app may be sleeping")
            return []

    def sync_device(self, device_id: str, device_name: str = None) -> Dict:
        """Sync attendance data for a specific device using Replit infrastructure"""
        try:
            display_name = device_name or device_id
            logger.info(f"Starting attendance sync for device: {display_name}")
            
            # Use Replit-optimized sync endpoint
            url = f"{self.base_url}/api/auto-sync/device/{device_id}"
            
            response = self.session.post(url, timeout=60)  # Longer timeout for sync operations
            response.raise_for_status()
            
            result = response.json()
            
            if result.get('success'):
                raw_records = result.get('rawRecords', 0)
                processed_records = result.get('processedRecords', 0)
                
                logger.info(f"Device {display_name}: {raw_records} raw -> {processed_records} attendance records")
                
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
                logger.error(f"Sync failed for device {display_name}: {error_msg}")
                return {'success': False, 'device_id': device_id, 'device_name': display_name, 'error': error_msg}
                
        except requests.RequestException as e:
            error_msg = str(e)
            if "timeout" in error_msg.lower():
                logger.warning(f"Sync timeout for device {display_name} - Replit app may be under load")
            else:
                logger.error(f"Network error syncing device {display_name}: {e}")
            return {'success': False, 'device_id': device_id, 'device_name': display_name, 'error': error_msg}

    def wake_replit_app(self) -> bool:
        """Wake up Replit app if it's sleeping"""
        try:
            logger.info("Attempting to wake Replit app...")
            response = self.session.get(f"{self.base_url}/api/database/status", timeout=10)
            
            if response.status_code == 200:
                logger.info("Replit app is awake and responding")
                return True
            else:
                logger.warning(f"Replit app responded with status {response.status_code}")
                return False
                
        except requests.RequestException as e:
            logger.warning(f"Failed to wake Replit app: {e}")
            return False

    def check_api_health(self) -> bool:
        """Check if the API is accessible with Replit-specific handling"""
        try:
            # First try to wake the app
            if not self.wake_replit_app():
                logger.info("Retrying after wake attempt...")
                time.sleep(5)
            
            response = self.session.get(f"{self.base_url}/api/database/status", timeout=15)
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
            if "timeout" in str(e).lower():
                logger.warning("API timeout - Replit app may be sleeping or under load")
            return False

    def sync_all_devices(self) -> Dict:
        """Sync all biometric devices with Replit optimization"""
        # Check for new devices periodically
        if self.cycle_count % self.device_check_interval == 0:
            logger.info(f"Checking for device changes (cycle #{self.cycle_count})")
        
        devices = self.get_biometric_devices()
        
        if not devices:
            logger.warning("No devices found to sync")
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
                logger.warning(f"Device missing deviceId: {device}")
                continue
                
            result = self.sync_device(device_id, device_name)
            results['device_results'].append(result)
            
            if result['success']:
                results['successful_syncs'] += 1
                results['total_raw_records'] += result.get('raw_records', 0)
                results['total_processed_records'] += result.get('processed_records', 0)
            else:
                results['failed_syncs'] += 1
                
            # Small delay between device syncs
            time.sleep(2)
        
        # Log summary
        success_rate = (results['successful_syncs'] / results['total_devices']) * 100 if results['total_devices'] > 0 else 0
        logger.info(f"Sync summary: {results['successful_syncs']}/{results['total_devices']} devices ({success_rate:.1f}%)")
        logger.info(f"Records: {results['total_raw_records']} raw -> {results['total_processed_records']} attendance")
        
        return results

    def print_status(self):
        """Print current sync status with Replit information"""
        print("\n" + "="*80)
        print("REPLIT ATTENDANCE SYNC TOOL STATUS")
        print("="*80)
        
        # Replit deployment info
        if self.is_replit:
            deployment = self.get_replit_deployment_info()
            print(f"Replit App: {deployment.get('repl_slug')}")
            print(f"Owner: {deployment.get('repl_owner')}")
            print(f"Environment: {deployment.get('environment')}")
            print(f"Cluster: {deployment.get('cluster')}")
        
        print(f"API URL: {self.base_url}")
        print(f"Sync Interval: {self.sync_interval} seconds")
        print(f"Current Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Sync Cycles: {self.cycle_count}")
        print(f"Known Devices: {len(self.known_devices)}")
        
        if self.known_devices:
            print(f"Active Devices: {', '.join(sorted(self.known_devices))}")
        
        if self.last_sync_times:
            print("\nLast Sync Times:")
            for device_id, last_sync in sorted(self.last_sync_times.items()):
                time_diff = datetime.now() - last_sync
                status = "RECENT" if time_diff.seconds < 120 else "WARNING" if time_diff.seconds < 300 else "OLD"
                print(f"  [{status}] {device_id}: {last_sync.strftime('%Y-%m-%d %H:%M:%S')}")
        else:
            print("\nNo syncs performed yet")
        
        print("="*80)
        print("Note: Attendance data only (no employee sync)")
        print("Auto-detects new devices added to web app")

    def run_continuous_sync(self):
        """Run continuous attendance sync optimized for Replit"""
        logger.info("Starting Replit-optimized attendance sync...")
        logger.info("Dynamic device detection enabled")
        
        # Initial health check with retry for Replit apps
        max_health_retries = 3
        for attempt in range(max_health_retries):
            if self.check_api_health():
                break
            elif attempt < max_health_retries - 1:
                logger.info(f"Health check failed, retrying in 10 seconds... (attempt {attempt + 1}/{max_health_retries})")
                time.sleep(10)
            else:
                logger.error("API health check failed after retries. Exiting.")
                return
        
        # Initial device discovery
        logger.info("Initial device discovery...")
        self.get_biometric_devices()
        
        try:
            while True:
                self.cycle_count += 1
                logger.info(f"\n--- Sync Cycle #{self.cycle_count} ---")
                
                # Perform sync
                results = self.sync_all_devices()
                
                # Print detailed status every 20 cycles for Replit
                if self.cycle_count % 20 == 0:
                    self.print_status()
                
                # Wait for next sync
                logger.info(f"Waiting {self.sync_interval} seconds for next sync...")
                time.sleep(self.sync_interval)
                
        except KeyboardInterrupt:
            logger.info("\nSync tool stopped by user (Ctrl+C)")
            logger.info("Final status:")
            self.print_status()
        except Exception as e:
            logger.error(f"Unexpected error in sync loop: {e}")
            raise

    def run_single_sync(self):
        """Run a single sync cycle optimized for Replit"""
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
    """Main function with Replit configuration"""
    print("Ministry of Finance Sri Lanka")
    print("Replit-Enhanced Attendance Sync Tool")
    print("===================================")
    
    # Configuration with Replit environment variables
    API_URL = os.getenv('REPLIT_APP_URL') or os.getenv('API_URL')
    SYNC_INTERVAL = int(os.getenv('SYNC_INTERVAL', '30'))
    
    # Auto-detect Replit URL if not provided
    if not API_URL and os.getenv('REPL_SLUG') and os.getenv('REPL_OWNER'):
        repl_slug = os.getenv('REPL_SLUG')
        repl_owner = os.getenv('REPL_OWNER')
        API_URL = f"https://{repl_slug}.{repl_owner}.repl.co"
    
    # Create sync tool
    sync_tool = ReplitAttendanceSyncTool(replit_url=API_URL, sync_interval=SYNC_INTERVAL)
    
    # Check command line arguments
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'single':
            success = sync_tool.run_single_sync()
            sys.exit(0 if success else 1)
            
        elif command == 'status':
            sync_tool.print_status()
            sys.exit(0)
            
        elif command == 'test':
            if sync_tool.check_api_health():
                print("API connection successful")
                devices = sync_tool.get_biometric_devices()
                print(f"Found {len(devices)} biometric devices")
                sys.exit(0)
            else:
                print("API connection failed")
                sys.exit(1)
                
        elif command == 'info':
            deployment = sync_tool.get_replit_deployment_info()
            print("Replit Deployment Information:")
            print(json.dumps(deployment, indent=2))
            sys.exit(0)
                
        else:
            print(f"Unknown command: {command}")
            print("Usage: python replit_sync_tool.py [single|status|test|info]")
            sys.exit(1)
    
    # Default: run continuous sync
    sync_tool.run_continuous_sync()


if __name__ == "__main__":
    main()