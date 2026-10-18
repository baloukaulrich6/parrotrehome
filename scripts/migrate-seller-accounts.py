#!/usr/bin/env python3
"""Apply the reviewed additive seller/account tables, preserving existing data.
The normal deployment backs up the database before this runs and checks full
Prisma schema drift afterwards. Unexpected existing table shapes are refused.
"""
import pathlib
import sqlite3
import sys

TABLES = ['AccountPreference', 'SellerListing', 'SellerUpload', 'AccountNotification']
SQL_PATH = pathlib.Path(__file__).parent / 'migrations' / 'seller-accounts.sql'

def shape(con, table):
    return con.execute(f'PRAGMA table_info("{table}")').fetchall(), con.execute(f'PRAGMA foreign_key_list("{table}")').fetchall()

def migrate(database):
    database = pathlib.Path(database)
    if not database.is_file():
        raise ValueError('Existing SQLite database required')
    sql = SQL_PATH.read_text()
    with sqlite3.connect(':memory:') as expected, sqlite3.connect(database) as con:
        expected.executescript(sql)
        for table in TABLES:
            if con.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone() and shape(con, table) != shape(expected, table):
                raise ValueError(f'Unexpected {table} schema; manual review required')
        con.execute('PRAGMA foreign_keys=ON')
        con.execute('BEGIN IMMEDIATE')
        try:
            for statement in sql.replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ').replace('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ').replace('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS ').split(';'):
                if statement.strip():
                    con.execute(statement)
            con.commit()
        except Exception:
            con.rollback()
            raise
    print('Seller/account tables ready; existing data preserved.')

if __name__ == '__main__':
    migrate(sys.argv[1])
