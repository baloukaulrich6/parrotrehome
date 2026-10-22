import importlib.util
import pathlib
import sqlite3
import tempfile
import unittest
root = pathlib.Path(__file__).resolve().parents[1]
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
migration = load('public_phone', root / 'scripts/migrate-public-phone.py')
previous = load('seller_accounts', root / 'scripts/migrate-seller-accounts.py')
class PublicPhoneMigrationTest(unittest.TestCase):
    def test_repeat_deployment_preserves_public_and_private_values(self):
        with tempfile.TemporaryDirectory() as directory:
            database = pathlib.Path(directory) / 'app.db'
            with sqlite3.connect(database) as con:
                con.executescript("CREATE TABLE User(id TEXT PRIMARY KEY); CREATE TABLE Bird(id TEXT PRIMARY KEY); INSERT INTO User VALUES ('seller'); INSERT INTO Bird VALUES ('bird');")
            previous.migrate(database)
            with sqlite3.connect(database) as con:
                con.execute("INSERT INTO SellerListing(id,sellerId,title,species,priceUsd,location,description,photos,contactName,contactPhone,contactAddress,payoutMethod,payoutRecipient,updatedAt) VALUES ('listing','seller','Bird','Grey',900,'Oregon','Description','[]','Name','private-number','Address','Zelle','Recipient',CURRENT_TIMESTAMP)")
            migration.migrate(database)
            with sqlite3.connect(database) as con:
                self.assertEqual(con.execute('SELECT contactPhone,publicPhone FROM SellerListing').fetchone(), ('private-number',None))
                con.execute("UPDATE Bird SET publicPhone='+15035550123'")
            previous.migrate(database)
            migration.migrate(database)
            with sqlite3.connect(database) as con:
                self.assertEqual(con.execute('SELECT publicPhone FROM Bird').fetchone(), ('+15035550123',))
    def test_unexpected_column_rolls_back(self):
        with tempfile.TemporaryDirectory() as directory:
            database = pathlib.Path(directory) / 'app.db'
            with sqlite3.connect(database) as con:
                con.executescript('CREATE TABLE Bird(id TEXT); CREATE TABLE SellerListing(id TEXT,publicPhone INTEGER);')
            with self.assertRaises(ValueError): migration.migrate(database)
            with sqlite3.connect(database) as con:
                self.assertNotIn('publicPhone', [row[1] for row in con.execute('PRAGMA table_info(Bird)')])
if __name__ == '__main__': unittest.main()
