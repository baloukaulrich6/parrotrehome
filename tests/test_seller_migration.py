import importlib.util
import pathlib
import sqlite3
import tempfile
import unittest
spec = importlib.util.spec_from_file_location('seller_migration', pathlib.Path(__file__).resolve().parents[1] / 'scripts/migrate-seller-accounts.py')
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)
class SellerMigrationTest(unittest.TestCase):
    def test_preserves_accounts_orders_and_new_records_on_repeat(self):
        with tempfile.TemporaryDirectory() as directory:
            database = pathlib.Path(directory) / 'app.db'
            with sqlite3.connect(database) as con:
                con.executescript("CREATE TABLE User (id TEXT PRIMARY KEY, passwordHash TEXT); CREATE TABLE Bird (id TEXT PRIMARY KEY); CREATE TABLE Orders (id TEXT); INSERT INTO User VALUES ('user-1','hash-unchanged'); INSERT INTO Orders VALUES ('order-1');")
            migration.migrate(database)
            with sqlite3.connect(database) as con:
                con.execute("INSERT INTO AccountPreference VALUES ('user-1','SELL')")
            migration.migrate(database)
            with sqlite3.connect(database) as con:
                self.assertEqual(con.execute('SELECT * FROM User').fetchall(), [('user-1','hash-unchanged')])
                self.assertEqual(con.execute('SELECT id FROM Orders').fetchall(), [('order-1',)])
                self.assertEqual(con.execute('SELECT intent FROM AccountPreference').fetchall(), [('SELL',)])
    def test_unknown_existing_table_refused_without_partial_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            database = pathlib.Path(directory) / 'app.db'
            with sqlite3.connect(database) as con:
                con.execute('CREATE TABLE SellerListing (wrong TEXT)')
            with self.assertRaises(ValueError): migration.migrate(database)
            with sqlite3.connect(database) as con:
                self.assertIsNone(con.execute("SELECT 1 FROM sqlite_master WHERE name='AccountPreference'").fetchone())
if __name__ == '__main__': unittest.main()
