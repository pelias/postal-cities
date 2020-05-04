const through = require('through2');

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
        PRAGMA JOURNAL_MODE=MEMORY;
        PRAGMA SYNCHRONOUS=OFF;
        PRAGMA LOCKING_MODE=EXCLUSIVE;
        PRAGMA PAGE_SIZE=4096;
        PRAGMA CACHE_SIZE=100;
        PRAGMA TEMP_STORE=MEMORY;`);

    // prepare insert statement
    const stmt = db.prepare(`INSERT INTO lastline (postcode,city,lon,lat) VALUES (?,?,?,?)`);

    return through.obj((json,_,next) => {
        if(!json.tags){ return next(); }
        if(!json.tags.hasOwnProperty('addr:postcode')){ return next(); }
        if(!json.tags.hasOwnProperty('addr:city')){ return next(); }

        // import nodes
        if('node' === json.type){
            stmt.run([
                json.tags['addr:postcode'],
                json.tags['addr:city'],
                json.lon,
                json.lat
            ]);
        }

        // import ways
        if('way' === json.type){
            stmt.run([
                json.tags['addr:postcode'],
                json.tags['addr:city'],
                json.centroid.lon,
                json.centroid.lat
            ]);
        }

        next();
    }, (done) => {

        // populate aggregate table
        db.exec(`
        INSERT INTO aggregate
        SELECT
            COUNT(*) AS count,
            TRIM(postcode) as postcode,
            TRIM(TRIM(SUBSTR(city, INSTR(city,',')),',')) as city,
            lon,
            lat
        FROM lastline
        GROUP BY
            UPPER(REPLACE(TRIM(postcode),' ','')),
            UPPER(TRIM(TRIM(SUBSTR(city, INSTR(city,',')),',')))
        ORDER BY
            postcode ASC,
            count DESC;`);

        done();
    });
}

module.exports = streamFactory;
