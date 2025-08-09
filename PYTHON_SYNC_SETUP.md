# Python Attendance Sync Tool Setup

This Python tool continuously syncs attendance data from ZK biometric devices to your database using the HR system API.

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

1. **Test API connection**
   ```bash
   python3 python_sync_tool.py test
   ```

2. **Run single sync**
   ```bash
   python3 python_sync_tool.py single
   ```

3. **Run continuous sync** (recommended)
   ```bash
   python3 python_sync_tool.py
   ```

4. **Check status**
   ```bash
   python3 python_sync_tool.py status
   ```

### Configuration

Set environment variables to configure the tool:

```bash
# Set API URL (default: http://localhost:3000)
export API_URL="http://your-server:3000"

# Set sync interval in seconds (default: 30)
export SYNC_INTERVAL="60"

# Then run the tool
python3 python_sync_tool.py
```

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
- ✅ **Device-specific sync**: Syncs each device individually
- ✅ **Error handling**: Retries and logs errors
- ✅ **Health monitoring**: Checks API and database status
- ✅ **Logging**: Saves logs to `attendance_sync.log`
- ✅ **Status reporting**: Shows sync statistics
- ✅ **Manual control**: Run single sync or continuous

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

## Example Output

```
2025-01-09 10:30:15 - INFO - Starting sync for device: TEST
2025-01-09 10:30:18 - INFO - Device TEST: 3273 raw records, 1205 processed
2025-01-09 10:30:20 - INFO - Starting sync for device: Ground Floor
2025-01-09 10:30:22 - ERROR - Network error syncing device Ground Floor: Connection timeout
2025-01-09 10:30:24 - INFO - Sync cycle completed: 50.0% success rate
```