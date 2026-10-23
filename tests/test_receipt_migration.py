import importlib.util
import pathlib
import sqlite3
import tempfile
import unittest
spec = importlib.util.spec_from_file_location('receipt_migration', pathlib.Path(__file__).resolve().parents[1] / 'scripts/migrate-payment-receipts.py')
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)
class ReceiptMigrationTest(unittest.TestCase):
    def test_preserves_payments_and_receipt_on_repeat(self):
        with tempfile.TemporaryDirectory() as directory:
            database=pathlib.Path(directory)/'app.db'
            with sqlite3.connect(database) as con:
                con.executescript("CREATE TABLE Request(id TEXT PRIMARY KEY); CREATE TABLE PaymentCheck(id TEXT PRIMARY KEY); INSERT INTO Request VALUES ('order'); INSERT INTO PaymentCheck VALUES ('paid');")
            migration.migrate(database)
            with sqlite3.connect(database) as con:
                con.execute("INSERT INTO PaymentReceipt(id,paymentCheckId,requestId,snapshot,filename,pdfBase64) VALUES ('receipt','paid','order','immutable','receipt.pdf','pdf')")
            migration.migrate(database)
            with sqlite3.connect(database) as con:
                self.assertEqual(con.execute('SELECT snapshot FROM PaymentReceipt').fetchone(), ('immutable',))
                self.assertEqual(con.execute('SELECT id FROM PaymentCheck').fetchone(), ('paid',))
                with self.assertRaises(sqlite3.IntegrityError):
                    con.execute("INSERT INTO PaymentReceipt(id,paymentCheckId,requestId,snapshot,filename,pdfBase64) VALUES ('duplicate','paid','order','new','file.pdf','pdf')")
    def test_refuses_unexpected_table(self):
        with tempfile.TemporaryDirectory() as directory:
            database=pathlib.Path(directory)/'app.db'
            with sqlite3.connect(database) as con: con.execute('CREATE TABLE PaymentReceipt(wrong TEXT)')
            with self.assertRaises(ValueError): migration.migrate(database)
if __name__=='__main__': unittest.main()
