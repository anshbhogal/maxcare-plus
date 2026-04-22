"""
restore_db.py — Database Restoration Script.

Restores the HMS database from a SQL dump.
WARNING: This will overwrite existing data.

Usage:
  python3 /app/scripts/restore_db.py [backup_filename]

Example:
  python3 /app/scripts/restore_db.py hms_backup_20240421_120000.sql
  python3 /app/scripts/restore_db.py latest (to use hms_latest.sql)
"""
import os
import sys
import subprocess

DB_USER = os.getenv("DB_USER", "hms_user")
DB_NAME = os.getenv("DB_NAME", "hms_db")
DB_HOST = os.getenv("DB_HOST", "db")
BACKUP_DIR = "/app/backups"

def run_restore(filename):
    if filename == "latest":
        filepath = os.path.join(BACKUP_DIR, "hms_latest.sql")
    else:
        filepath = os.path.join(BACKUP_DIR, filename)
    
    if not os.path.exists(filepath):
        print(f"[!] Backup file not found: {filepath}")
        return

    print(f"[*] Starting restoration from: {filepath}...")
    
    try:
        # Drop and recreate DB or just clear it
        # For safety in this script, we'll assume the user wants to restore over the existing structure.
        # pg_restore -c can clean before restore, but pg_dump SQL files are better run via psql.
        
        # PGPASSWORD should be in env
        command = [
            "psql",
            "-h", DB_HOST,
            "-U", DB_USER,
            "-d", DB_NAME,
            "-f", filepath
        ]
        
        # We might need to terminate existing connections
        # But in dev, we just run the command.
        
        subprocess.run(command, check=True)
        print(f"[+] Restoration completed successfully.")
        
    except subprocess.CalledProcessError as e:
        print(f"[!] Restoration failed: {e}")
    except Exception as e:
        print(f"[!] An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 restore_db.py <filename|latest>")
        sys.exit(1)
    
    run_restore(sys.argv[1])
