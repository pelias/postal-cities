const _ = require('lodash');
const through = require('through2');
const ZIP_PLUS_4 = /^[0-9]{5}-[0-9]{4}$/;
const withinUSA = (row) => {
  const lon = parseFloat(row.lon);
  const lat = parseFloat(row.lat);
  if (!isNaN(lon) && !isNaN(lat)) {
    if (_.inRange(lon, -170, -50) && _.inRange(lat, 25, 72)) {
      return true;
    }
  }
  return false;
}

function streamFactory(db){

  // create database tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS lastline (
      postcode TEXT NOT NULL,
      city TEXT NOT NULL,
      lon REAL NOT NULL,
      lat REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS aggregate (
      count INTEGER NOT NULL,
      postcode TEXT NOT NULL,
      city TEXT NOT NULL,
      lon REAL NOT NULL,
      lat REAL NOT NULL
    );
    PRAGMA JOURNAL_MODE=OFF;
    PRAGMA SYNCHRONOUS=OFF;
    PRAGMA LOCKING_MODE=EXCLUSIVE;
    PRAGMA PAGE_SIZE=4096;
    PRAGMA CACHE_SIZE=100;
    PRAGMA TEMP_STORE=MEMORY;
  `);

  // prepare insert statement
  const stmt = db.prepare(`
    INSERT INTO lastline (postcode, city, lon, lat)
    VALUES ($postcode, $city, $lon, $lat);
  `);

  // insert a row in the database per row of the TSV file
  const transform = (row, _, next) => {

    // truncate USA ZIP+4 postcodes to 5 digit ZIP codes
    if (row.postcode.length === 10) {
      if (ZIP_PLUS_4.test(row.postcode) && withinUSA(row)) {
        row.postcode = row.postcode.slice(0, 5);
      }
    }

    stmt.run(row);
    next();
  };

  // populate aggregate table after all rows imported
  // ensure that SQLite has enough tmp space
  // export SQLITE_TMPDIR=/large/directory
  const flush = (done) => {
    db.exec(`
      PRAGMA TEMP_STORE=FILE;
      INSERT INTO aggregate
      SELECT
          COUNT(*) AS count,
          TRIM(postcode) as postcode,
          TRIM(TRIM(SUBSTR(city, INSTR(city,',')),',')) as city,
          lon,
          lat
      FROM lastline
      WHERE TRIM(postcode) != ''
      AND TRIM(city) != ''
      GROUP BY
          UPPER(REPLACE(TRIM(postcode),' ','')),
          UPPER(TRIM(TRIM(SUBSTR(city, INSTR(city,',')),',')))
      ORDER BY
          postcode ASC,
          count DESC;
    `);
    done();
  }

  return through.obj(transform, flush);
}

module.exports = streamFactory;
