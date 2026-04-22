"""
backup_db.py — Automated Database Backup Script.

This script performs a pg_dump of the HMS database.
It can be run manually or as a scheduled task.

Usage:
  python3 /app/scripts/backup_db.py
"""
import os
import subprocess
from datetime import datetime

# Configuration from environment
DB_USER = os.getenv("DB_USER", "hms_user")
DB_NAME = os.getenv("DB_NAME", "hms_db")
DB_HOST = os.getenv("DB_HOST", "db")
BACKUP_DIR = "/app/backups"

def run_backup():
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"hms_backup_{timestamp}.sql"
    filepath = os.path.join(BACKUP_DIR, filename)
    
    print(f"[*] Starting backup: {filename}...")
    
    # We use pg_dump. In Docker, this script runs in hms_backend,
    # which should have postgresql-client installed.
    # Note: PGPASSWORD should be set in environment or use a .pgpass file
    # for non-interactive mode.
    
    try:
        # Construct the command
        # We assume PGPASSWORD is available in the environment from docker-compose/env_file
        command = [
            "pg_dump",
            "-h", DB_HOST,
            "-U", DB_USER,
            "-d", DB_NAME,
            "-f", filepath
        ]
        
        subprocess.run(command, check=True)
        
        # Also create a 'latest' symlink or copy for easy recovery
        latest_path = os.path.join(BACKUP_DIR, "hms_latest.sql")
        if os.path.exists(latest_path):
            os.remove(latest_path)
        
        # Copy instead of symlink for better compatibility in volumes
        import shutil
        shutil.copy2(filepath, latest_path)
        
        print(f"[+] Backup completed successfully: {filepath}")
        
        # Cleanup: Keep only last 10 backups
        backups = sorted([f for f in os.listdir(BACKUP_DIR) if f.startswith("hms_backup_")])
        if len(backups) > 10:
            for old_backup in backups[:-10]:
                os.remove(os.path.join(BACKUP_DIR, old_backup))
                print(f"[-] Removed old backup: {old_backup}")
                
    except subprocess.CalledProcessError as e:
        print(f"[!] Backup failed: {e}")
    except Exception as e:
        print(f"[!] An error occurred: {e}")

if __name__ == "__main__":
    run_backup()
