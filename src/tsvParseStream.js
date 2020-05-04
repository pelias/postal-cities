const through = require('through2');

function streamFactory(){
  return through.obj(function( row, _, next ){

    try {
      const columns = row.toString('utf8').split('\t');

      // Postcode, City Name, Longitude, Latitude
      if (columns.length !== 4) {
        throw new Error(`invalid column count: ${columns.length}`);
      }

      this.push({
        postcode: columns[0],
        city: columns[1],
        lon: columns[2],
        lat: columns[3]
      });
    } catch( e ){
      console.error( 'invalid tsv row', e );
    }

    next();
  });
}

module.exports = streamFactory;
