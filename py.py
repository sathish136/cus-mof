from zk import ZK, const

# ZK machine details
ip = '122.165.225.42'
port = 4370

# Initialize ZK object
zk = ZK(ip, port=port, timeout=5, password=0, force_udp=False, ommit_ping=False)

try:
    print(f"Connecting to ZK machine at {ip}:{port}...")
    conn = zk.connect()
    conn.disable_device()  # Optional: disables device temporarily during sync

    # Get all users
    users = conn.get_users()
    print(f"\nTotal users found: {len(users)}\n")
    print(f"{'UID':<10} {'User ID':<15} {'Card':<10} {'Name'}")
    print("-" * 50)

    for user in users:
        # Print multiple fields to identify the correct one
        uid = user.uid
        emp_id = user.user_id
        card = user.card
        name = user.name
        print(f"{uid:<10} {emp_id:<15} {card:<10} {name}")

    conn.enable_device()
    conn.disconnect()

except Exception as e:
    print(f"❌ Error: {e}")