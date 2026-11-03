import importlib.util
import pathlib
import sqlite3
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('fulfillment', pathlib.Path(__file__).resolve().parents[1] / 'scripts/migrate-fulfillment.py')
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)

class FulfillmentMigrationTest(unittest.TestCase):
    def test_preserves_historical_orders_and_recorded_preferences(self):
        with tempfile.TemporaryDirectory() as directory:
            database = pathlib.Path(directory) / 'app.db'
            with sqlite3.connect(database) as connection:
                connection.execute('CREATE TABLE Request (id TEXT PRIMARY KEY, customerName TEXT)')
                connection.execute("INSERT INTO Request VALUES ('old', 'Existing customer')")
            migration.migrate(database)
            migration.migrate(database)
            with sqlite3.connect(database) as connection:
                self.assertEqual(connection.execute('SELECT * FROM Request').fetchone(), ('old', 'Existing customer', None))
                connection.execute("UPDATE Request SET fulfillmentMethod = 'PICKUP'")
            migration.migrate(database)
            with sqlite3.connect(database) as connection:
                self.assertEqual(connection.execute('SELECT fulfillmentMethod FROM Request').fetchone()[0], 'PICKUP')

    def test_refuses_unexpected_column_type(self):
        with tempfile.TemporaryDirectory() as directory:
            database = pathlib.Path(directory) / 'app.db'
            with sqlite3.connect(database) as connection:
                connection.execute('CREATE TABLE Request (id TEXT PRIMARY KEY, fulfillmentMethod INTEGER)')
            with self.assertRaises(ValueError):
                migration.migrate(database)

if __name__ == '__main__':
    unittest.main()
