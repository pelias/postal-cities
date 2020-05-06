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
        postcode: columns[0].trim(),
        city: columns[1].trim(),
        lon: columns[2].trim(),
        lat: columns[3].trim()
      });
    } catch( e ){
      console.error('invalid tsv row', e);
      console.error(row);
    }

    next();
  });
}

module.exports = streamFactory;
