#!/usr/bin/env python3
"""Add the fulfillment preference without changing historical orders."""
import pathlib
import sqlite3
import sys

def migrate(database):
    database = pathlib.Path(database)
    if not database.is_file():
        raise ValueError('Existing database required')
    with sqlite3.connect(database) as con:
        con.execute('BEGIN IMMEDIATE')
        try:
            for table in ['Request']:
                columns = con.execute(f'PRAGMA table_info("{table}")').fetchall()
                if not columns:
                    raise ValueError(f'{table} must exist before this migration')
                existing = next((row for row in columns if row[1] == 'fulfillmentMethod'), None)
                if existing and existing[2:] != ('TEXT', 0, None, 0):
                    raise ValueError(f'Unexpected {table}.fulfillmentMethod schema')
                if not existing:
                    con.execute(f'ALTER TABLE "{table}" ADD COLUMN "fulfillmentMethod" TEXT')
            con.commit()
        except Exception:
            con.rollback()
            raise
    print('Fulfillment preference ready; historical orders unchanged.')

if __name__ == '__main__':
    migrate(sys.argv[1])
