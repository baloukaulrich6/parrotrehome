#!/usr/bin/env python3
"""Remove only the erroneous AuditLog.objectId -> Request.id foreign key.

Preserve rows, actor foreign key, columns, indexes and triggers. Back up first.
No-op on the corrected schema; refuse unexpected schemas instead of guessing.
"""
import datetime
import pathlib
import sqlite3
import sys


def migrate(database):
    database = pathlib.Path(database)
    if not database.is_file():
        raise ValueError("Existing SQLite database required.")
    con = sqlite3.connect(database)
    try:
        keys = con.execute('PRAGMA foreign_key_list("AuditLog")').fetchall()
        if not any(key[2] == "Request" and key[3] == "objectId" for key in keys):
            print("Audit object relation already corrected; no migration needed.")
            return
        columns = [row[1] for row in con.execute('PRAGMA table_info("AuditLog")')]
        expected = ["id", "actorId", "actorRole", "objectType", "objectId", "action", "changes", "metadata", "timestamp"]
        if columns != expected or len(keys) != 2 or not any(key[2] == "User" and key[3] == "actorId" for key in keys):
            raise ValueError("Unexpected AuditLog schema; manual review required.")
        objects = con.execute("SELECT sql FROM sqlite_master WHERE tbl_name='AuditLog' AND type IN ('index','trigger') AND sql IS NOT NULL").fetchall()
        original_count = con.execute('SELECT COUNT(*) FROM "AuditLog"').fetchone()[0]
        backups = database.parent / "backups"
        backups.mkdir(exist_ok=True)
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        with sqlite3.connect(backups / ("before-audit-fix-" + stamp + ".db")) as backup:
            con.backup(backup)
        con.execute("PRAGMA foreign_keys=OFF")
        con.execute("BEGIN IMMEDIATE")
        try:
            con.execute('''CREATE TABLE "AuditLog_corrected" (
                "id" TEXT NOT NULL PRIMARY KEY, "actorId" TEXT,
                "actorRole" TEXT NOT NULL, "objectType" TEXT NOT NULL,
                "objectId" TEXT NOT NULL, "action" TEXT NOT NULL,
                "changes" TEXT, "metadata" TEXT,
                "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId")
                    REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
            )''')
            con.execute('INSERT INTO "AuditLog_corrected" SELECT * FROM "AuditLog"')
            if con.execute('SELECT COUNT(*) FROM "AuditLog_corrected"').fetchone()[0] != original_count:
                raise ValueError("Row count changed; migration aborted.")
            con.execute('DROP TABLE "AuditLog"')
            con.execute('ALTER TABLE "AuditLog_corrected" RENAME TO "AuditLog"')
            for (sql,) in objects:
                con.execute(sql)
            if con.execute('PRAGMA foreign_key_check("AuditLog")').fetchall():
                raise ValueError("Actor foreign key check failed; migration aborted.")
            con.commit()
        except Exception:
            con.rollback()
            raise
        finally:
            con.execute("PRAGMA foreign_keys=ON")
        print(f"Audit relation corrected. Preserved {original_count} rows, indexes and triggers; backup retained.")
    finally:
        con.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/migrate-audit-log.py /path/to/app.db")
    migrate(sys.argv[1])
