# Python Attendance Sync Tool Setup

This Python tool continuously syncs attendance data from ZK biometric devices to your database using the HR system API. Now includes Replit API integration for enhanced deployment and management.

## Tool Versions

1. **python_sync_tool.py** - Basic version for any environment
2. **replit_sync_tool.py** - Enhanced version with Replit API integration (recommended)

## Installation

1. **Install Python 3** (if not already installed)
   ```bash
   # On Ubuntu/Debian
   sudo apt update
   sudo apt install python3 python3-pip

   # On Windows - download from python.org
   ```

2. **Install required package**
   ```bash
   pip3 install requests
   ```

3. **Download the sync tool**
   - Copy `python_sync_tool.py` to your desired location

## Usage

### Basic Commands

**For Basic Tool:**
```bash
python3 python_sync_tool.py test     # Test connection
python3 python_sync_tool.py single   # Run single sync  
python3 python_sync_tool.py          # Run continuous sync
python3 python_sync_tool.py status   # Check status
```

**For Replit-Enhanced Tool:**
```bash
python3 replit_sync_tool.py test     # Test connection
python3 replit_sync_tool.py single   # Run single sync
python3 replit_sync_tool.py          # Run continuous sync
python3 replit_sync_tool.py status   # Check status
python3 replit_sync_tool.py info     # Show Replit deployment info
```

### Configuration

**Basic Tool Configuration:**
```bash
export API_URL="http://your-server:3000"
export SYNC_INTERVAL="60"
python3 python_sync_tool.py
```

**Replit-Enhanced Tool Configuration:**
```bash
# For Replit-hosted apps (auto-detected)
export REPLIT_APP_URL="https://your-app.your-username.repl.co"
export SYNC_INTERVAL="30"

# Optional: Replit API token for enhanced features
export REPLIT_TOKEN="your_replit_token"

# Run the enhanced tool
python3 replit_sync_tool.py
```

**Auto-Detection:** The Replit tool automatically detects if it's running inside Replit and configures the URL using environment variables like `REPL_SLUG` and `REPL_OWNER`.

### Running as Background Service

**Option 1: Using nohup**
```bash
nohup python3 python_sync_tool.py > sync.log 2>&1 &
```

**Option 2: Using screen**
```bash
screen -S attendance_sync
python3 python_sync_tool.py
# Press Ctrl+A, then D to detach
# To reattach: screen -r attendance_sync
```

**Option 3: Using systemd (Linux)**

Create `/etc/systemd/system/attendance-sync.service`:
```ini
[Unit]
Description=Attendance Sync Tool
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/sync/tool
Environment=API_URL=http://localhost:3000
Environment=SYNC_INTERVAL=30
ExecStart=/usr/bin/python3 python_sync_tool.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable attendance-sync
sudo systemctl start attendance-sync
sudo systemctl status attendance-sync
```

## Features

- ✅ **Continuous sync**: Runs every 30 seconds (configurable)
- ✅ **Dynamic device detection**: Auto-discovers new devices added to web app
- ✅ **Attendance-only sync**: Syncs attendance data only (no employee data)
- ✅ **Device-specific sync**: Syncs each device individually
- ✅ **Error handling**: Retries and logs errors
- ✅ **Health monitoring**: Checks API and database status
- ✅ **Logging**: Saves logs to `attendance_sync.log`
- ✅ **Status reporting**: Shows sync statistics with device status
- ✅ **Manual control**: Run single sync or continuous
- ✅ **No restart required**: Automatically detects when you add/remove devices in web app

## Monitoring

The tool creates detailed logs in `attendance_sync.log`:

```bash
# View real-time logs
tail -f attendance_sync.log

# Check recent sync activity
grep "Sync cycle completed" attendance_sync.log | tail -10
```

## Stopping the Tool

- **Interactive mode**: Press `Ctrl+C`
- **Background mode**: `pkill -f python_sync_tool.py`
- **Systemd service**: `sudo systemctl stop attendance-sync`

## Dynamic Device Detection

The Python tool automatically detects when you add or remove devices in the web app:

- **Adding devices**: When you add a new biometric device in the web app, the Python tool will automatically detect it within 5 sync cycles (about 2.5 minutes) and start syncing it
- **Removing devices**: When you remove a device from the web app, the tool will stop trying to sync it
- **No restart needed**: The tool continuously checks for device changes, so you never need to restart it

Example log output when adding a device:
```
🔍 Detected 1 new devices: NewDevice01
📱 New device added: NewDevice01
```

## Troubleshooting

1. **API Connection Failed**
   - Check if HR system is running on port 3000
   - Verify API_URL is correct
   - Test with: `python3 python_sync_tool.py test`

2. **No Devices Found**
   - Check biometric devices are configured in HR system
   - Verify devices are accessible from network

3. **Partial Data**
   - Tool filters out invalid timestamps (year 2000)
   - Check device clock settings
   - Monitor logs for processing statistics

4. **New Device Not Detected**
   - Wait up to 5 sync cycles (about 2.5 minutes)
   - Check device is properly configured in web app
   - Verify device has a valid deviceId

## Example Output

```
2025-01-09 10:30:15 - INFO - Starting sync for device: TEST
2025-01-09 10:30:18 - INFO - Device TEST: 3273 raw records, 1205 processed
2025-01-09 10:30:20 - INFO - Starting sync for device: Ground Floor
2025-01-09 10:30:22 - ERROR - Network error syncing device Ground Floor: Connection timeout
2025-01-09 10:30:24 - INFO - Sync cycle completed: 50.0% success rate
```