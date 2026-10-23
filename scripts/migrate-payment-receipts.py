#!/usr/bin/env python3
"""Add immutable receipt snapshots/PDFs without changing existing orders or payments."""
import pathlib
import sqlite3
import sys

def migrate(database):
    database = pathlib.Path(database)
    if not database.is_file(): raise ValueError('Existing SQLite database required')
    sql = (pathlib.Path(__file__).parent / 'migrations/payment-receipts.sql').read_text()
    with sqlite3.connect(':memory:') as expected, sqlite3.connect(database) as con:
        expected.executescript(sql)
        exists = con.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='PaymentReceipt'").fetchone()
        if exists:
            for pragma in ['table_info', 'foreign_key_list']:
                if con.execute(f'PRAGMA {pragma}(PaymentReceipt)').fetchall() != expected.execute(f'PRAGMA {pragma}(PaymentReceipt)').fetchall(): raise ValueError('Unexpected PaymentReceipt schema; manual review required')
        con.execute('BEGIN IMMEDIATE')
        try:
            for statement in sql.replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ').replace('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ').replace('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS ').split(';'):
                if statement.strip(): con.execute(statement)
            con.commit()
        except Exception:
            con.rollback()
            raise
    print('Payment receipt table ready; existing payments unchanged.')
if __name__ == '__main__': migrate(sys.argv[1])
