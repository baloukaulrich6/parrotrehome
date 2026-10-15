import importlib.util
import pathlib
import sqlite3
import tempfile
import unittest

module_path = pathlib.Path(__file__).resolve().parents[1] / "scripts/migrate-audit-log.py"
spec = importlib.util.spec_from_file_location("audit_migration", module_path)
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)


class AuditMigrationTest(unittest.TestCase):
    def test_preserves_events_and_actor_constraint_and_allows_user_events(self):
        with tempfile.TemporaryDirectory() as directory:
            database = pathlib.Path(directory) / "app.db"
            con = sqlite3.connect(database)
            con.executescript('''
                PRAGMA foreign_keys=ON;
                CREATE TABLE User (id TEXT PRIMARY KEY);
                CREATE TABLE Request (id TEXT PRIMARY KEY);
                INSERT INTO User VALUES ('staff-1');
                INSERT INTO Request VALUES ('request-1');
                CREATE TABLE AuditLog (
                    id TEXT NOT NULL PRIMARY KEY, actorId TEXT, actorRole TEXT NOT NULL,
                    objectType TEXT NOT NULL, objectId TEXT NOT NULL, action TEXT NOT NULL,
                    changes TEXT, metadata TEXT, timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(actorId) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE,
                    FOREIGN KEY(objectId) REFERENCES Request(id) ON DELETE NO ACTION ON UPDATE CASCADE
                );
                CREATE INDEX AuditLog_timestamp_idx ON AuditLog(timestamp);
                INSERT INTO AuditLog(id,actorId,actorRole,objectType,objectId,action)
                    VALUES ('event-1','staff-1','AGENT','Request','request-1','UPDATE');
            ''')
            con.close()
            migration.migrate(database)
            migration.migrate(database)
            con = sqlite3.connect(database)
            con.execute("PRAGMA foreign_keys=ON")
            self.assertEqual(con.execute("SELECT id FROM AuditLog").fetchall(), [("event-1",)])
            con.execute("INSERT INTO AuditLog(id,actorId,actorRole,objectType,objectId,action) VALUES ('login-1','staff-1','AGENT','User','staff-1','LOGIN')")
            with self.assertRaises(sqlite3.IntegrityError):
                con.execute("INSERT INTO AuditLog(id,actorId,actorRole,objectType,objectId,action) VALUES ('bad','missing','AGENT','User','staff-1','LOGIN')")
            self.assertTrue(con.execute("SELECT 1 FROM sqlite_master WHERE name='AuditLog_timestamp_idx'").fetchone())
            self.assertEqual(len(list((pathlib.Path(directory) / "backups").glob("*.db"))), 1)
            con.close()


if __name__ == "__main__":
    unittest.main()
