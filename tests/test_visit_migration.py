import importlib.util
import pathlib
import sqlite3
import tempfile
import unittest
spec = importlib.util.spec_from_file_location('visit_migration', pathlib.Path(__file__).resolve().parents[1] / 'scripts/migrate-site-visits.py')
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)
class VisitMigrationTest(unittest.TestCase):
    def test_additive_idempotent_and_preserves_business_and_visit_data(self):
        with tempfile.TemporaryDirectory() as directory:
            database = pathlib.Path(directory) / 'app.db'
            with sqlite3.connect(database) as con:
                con.executescript("CREATE TABLE Business (id TEXT); INSERT INTO Business VALUES ('existing');")
            migration.migrate(database)
            with sqlite3.connect(database) as con:
                con.execute("INSERT INTO SiteVisit VALUES ('visit', 'browser', 'direct', 1000, 6001)")
            migration.migrate(database)
            with sqlite3.connect(database) as con:
                self.assertEqual(con.execute('SELECT id FROM Business').fetchall(), [('existing',)])
                self.assertEqual(con.execute('SELECT id FROM SiteVisit').fetchall(), [('visit',)])
                self.assertEqual(len(con.execute('PRAGMA index_list(SiteVisit)').fetchall()), 3)
    def test_refuses_unknown_schema(self):
        with tempfile.TemporaryDirectory() as directory:
            database = pathlib.Path(directory) / 'app.db'
            with sqlite3.connect(database) as con:
                con.execute('CREATE TABLE SiteVisit (wrong TEXT)')
            with self.assertRaises(ValueError):
                migration.migrate(database)
if __name__ == '__main__':
    unittest.main()
