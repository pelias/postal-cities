const fs = require('fs');
const split = require('split2');
const Sqlite3 = require('better-sqlite3');
const parser = require('./src/tsvParseStream');
const importer = require('./src/dbImportStream');
const lookup = require('./src/placeholderLookup');

// delete data if one already exists with the same name
const dbfile = process.env.DB_FILENAME || 'lastline.db';
fs.existsSync(dbfile) && fs.unlinkSync(dbfile)

// connect and setup database
const db = new Sqlite3(dbfile);

// enable unsafe mode (so we can use JOURNAL_MODE=OFF)
db.unsafeMode(true);

process.stdin
    .pipe(split())
    .pipe(parser())
    .pipe(importer(db))
    .on('finish', () => lookup(db));
