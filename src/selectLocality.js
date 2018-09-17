const calcCrow = require('./calcCrow');

const DEFAULT_MAX_DISTANCE_KM = 200;
const ENV_MAX_DISTANCE_KM = parseInt(process.env.MAX_DISTANCE_KM, 10);
const MAX_DISTANCE_KM = ENV_MAX_DISTANCE_KM || DEFAULT_MAX_DISTANCE_KM;

function selectLocality(row, err, res){
    if( err ){ return { err: err } }
    
    // store potential candidates in array
    // note: there can be more than one potential match
    // so we will check their distances from the row coords
    var candidates = [];
    if( !res || !res.body || !res.body.length ){
      return { err: 'no body' }
    }
    else {
      // parse row floats
      var rowLon = parseFloat(row.lon);
      var rowLat = parseFloat(row.lat);
      if( isNaN(rowLon) || isNaN(rowLat) ){ return { err: 'invalid coord' } }
      
      // select a matching result
      for( var i=0; i<res.body.length; i++ ){
        var match = res.body[i];

        // skip records missing valid 'geom' properties
        if( !match.hasOwnProperty('geom') ){ continue; }
        if( !match.geom.hasOwnProperty('lat') || !match.geom.hasOwnProperty('lon') ){ continue; }

        // centroid
        var centroid = { lat: parseFloat( match.geom.lat ), lon: parseFloat( match.geom.lon ) };
        if( isNaN(centroid.lat) || isNaN(centroid.lon) ){ continue; }

        // exclude records over MAX_DISTANCE_KM
        var km = calcCrow( rowLat, rowLon, centroid.lat, centroid.lon );
        if( km > MAX_DISTANCE_KM ){ continue; }

        // extract fields from row
        if( match.lineage.length ){

          // use the first hierarchy only
          var lineage = match.lineage[0];

          // dependency
          if( lineage.dependency ){
            candidates.push({
              km:             km,
              wofid:          match.id,
              name_english:   match.name,
              name_abbr:      match.abbr,
              placetype:      match.placetype,
              country_name:   lineage.dependency.name,
              country_abbr:   lineage.dependency.abbr
            });
          }
          // country
          else if( lineage.country ){
            candidates.push({
              km:             km,
              wofid:          match.id,
              name_english:   match.name,
              name_abbr:      match.abbr,
              placetype:      match.placetype,
              country_name:   lineage.country.name,
              country_abbr:   lineage.country.abbr
            });
          }
        }
      }
    }

    // no candidates found
    if( !candidates.length ){
      return { err: 'no candidates found', match: match }
    }

    // sort candidates by nearest match first
    candidates.sort((a, b) => a.km - b.km);

    // print TSV
    return { candidates: candidates }
}

module.exports = selectLocality;