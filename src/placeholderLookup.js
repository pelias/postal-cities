
const request = require('superagent');
const keepaliveAgent = require('./httpAgent')();
const selectLocality = require('./selectLocality');

const PLACEHOLDER_DEFAULT_QPS = 30;
const PLACEHOLDER_HOST = process.env.PLACEHOLDER_HOST || 'localhost';
const PLACEHOLDER_PORT = process.env.PLACEHOLDER_PORT || '3000';
const PLACEHOLDER_QPS = parseInt(process.env.PLACEHOLDER_QPS, 10);

const PLACEHOLDER_HTTP_URL = `http://${PLACEHOLDER_HOST}:${PLACEHOLDER_PORT}/parser/search`;
const PLACEHOLDER_QPS_LIMIT = PLACEHOLDER_QPS || PLACEHOLDER_DEFAULT_QPS;

// query placeholder with the data from a single row
function placeholder(row){
  request.get(PLACEHOLDER_HTTP_URL)
         .set('Connection', 'keep-alive')
         .agent(keepaliveAgent)
         .query({
            text: row.city,
            lang: 'eng',
            placetype: 'locality,borough'
         })
         .end((err, res) => {
            var locality = selectLocality(row, err, res);
            if( locality.err ){ return console.error(
                JSON.stringify( locality ),
                JSON.stringify( row )
            )}
            console.log([
                row.count, row.postcode, row.city,
                locality.candidates[0].wofid,
                locality.candidates[0].name_english,
                locality.candidates[0].name_abbr,
                locality.candidates[0].placetype,
                locality.candidates[0].country_name,
                locality.candidates[0].country_abbr
            ].join('\t'));
         });
}

function lookup(db){
    const stmt = db.prepare(`SELECT * FROM aggregate`);
    const iterator = stmt.iterate();

    // apply some basic rate-limiting
    const i = setInterval(() => {
        row = iterator.next();
        if( !row || row.done ){ clearInterval(i); }
        else { placeholder( row.value ); }
    }, PLACEHOLDER_QPS_LIMIT);
}

module.exports = lookup;