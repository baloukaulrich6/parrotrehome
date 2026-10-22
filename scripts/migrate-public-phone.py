#!/usr/bin/env python3
"""Add nullable public WhatsApp contacts; never copy private verification phones."""
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
            for table in ['Bird', 'SellerListing']:
                columns = con.execute(f'PRAGMA table_info("{table}")').fetchall()
                if not columns:
                    raise ValueError(f'{table} must exist before this migration')
                existing = next((row for row in columns if row[1] == 'publicPhone'), None)
                if existing and existing[2:] != ('TEXT', 0, None, 0):
                    raise ValueError(f'Unexpected {table}.publicPhone schema')
                if not existing:
                    con.execute(f'ALTER TABLE "{table}" ADD COLUMN "publicPhone" TEXT')
            con.commit()
        except Exception:
            con.rollback()
            raise
    print('Public WhatsApp contact columns ready; private numbers unchanged.')

if __name__ == '__main__':
    migrate(sys.argv[1])
