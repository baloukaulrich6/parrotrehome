#!/usr/bin/env python3
"""Add only the consented visit statistics table; keep all existing business data.
Run after backing up the database and before the deployment schema drift check.
"""
import pathlib
import sqlite3
import sys

def migrate(database):
    database = pathlib.Path(database)
    if not database.is_file():
        raise ValueError("Existing SQLite database required")
    with sqlite3.connect(database) as con:
        exists = con.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='SiteVisit'").fetchone()
        if exists:
            expected = [('id', 'TEXT'), ('visitorKey', 'TEXT'), ('source', 'TEXT'), ('startedAt', 'DATETIME'), ('qualifiedAt', 'DATETIME')]
            if [(row[1], row[2]) for row in con.execute('PRAGMA table_info("SiteVisit")')] != expected:
                raise ValueError("Unexpected SiteVisit schema; manual review required")
            return
        con.execute('CREATE TABLE "SiteVisit" ("id" TEXT NOT NULL PRIMARY KEY, "visitorKey" TEXT NOT NULL, "source" TEXT NOT NULL, "startedAt" DATETIME NOT NULL, "qualifiedAt" DATETIME)')
        con.execute('CREATE INDEX "SiteVisit_qualifiedAt_visitorKey_idx" ON "SiteVisit"("qualifiedAt", "visitorKey")')
        con.execute('CREATE INDEX "SiteVisit_startedAt_idx" ON "SiteVisit"("startedAt")')
    print("Site visit statistics table ready; existing records preserved.")

if __name__ == '__main__':
    migrate(sys.argv[1])
