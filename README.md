
# Postal Cities

Scripts to generate mappings of postal codes to 'last line' postal localities (postal cities)

## Summary

This repository contains tools to process the crowd-sourced data from the OpenStreetMap & OpenAddressess projects in order to understand the association between postal codes and their corresponding locality (city).

The motivation for this project is that users commonly complain that the city associated with their address is incorrect.

This is either due to the locality information being missing, or it's because the postal service in their area uses a different 'preferred last line' locality name when compared with the locality name assigned by the Federal statistics or GIS department.

## Example

A user addresses their postal mail to `100 Example Street, Souderton PA 18964, USA`, the geocoder has the correct address as `100 Example Street, Franconia, PA, USA`.

Technically the association with `Franconia` is correct as the address lies within the political boundary of `Franconia`, however this doesn't change the fact that the locals refer to this location as `Souderton` despite it being slighly outside the political boundary of `Souderton`.

In order to solve this problem, we will source all the locality names associated with the postal code `18964` within `USA` and use them to associate locality aliases which can be used when searching.

## Data extraction workflow

The scripts are designed to be used on a full-planet build but will work just as well for a smaller extract, running the planet build can take some time, if it's your first time try a smaller extract first.

The expected input format for these scripts is a 4-column TSV file (without a header line).
The four columns are (in left-to-right order): Postcode, City Name, Longitude, Latitude.

### Extract the relevant data from OpenStreetMap

Firstly we need to extract some fields from OSM, we only really need two fields: `addr:postcode` and `addr:city`, we will additionally extract the lat/lon coordinates of the OSM entity in order to determine which county it belongs to, and also to prevent associating a locality very far away from the OSM entity.

The easiest way to do this is using [pbf2json](https://github.com/pelias/pbf2json), there is an example script `./scripts/pbf2json.sh`.

The `pbf2json` script should output JSON lines, each line contains one OSM entity which has the properties we are looking for.

```bash
{"id":366753196,"type":"node","lat":39.739789,"lon":-75.60334800000001,"tags":{"addr:city":"Wilmington","addr:housenumber":"30","addr:postcode":"19805","addr:state":"DE","addr:street":"Spruce Avenue","amenity":"library","ele":"27","gnis:county_name":"New Castle","gnis:feature_id":"2378672","gnis:import_uuid":"57871b70-0100-4405-bb30-88b2e001a944","gnis:reviewed":"no","name":"Elsmere Library","source":"USGS Geonames","website":"http://www.webcitation.org/5mGSwbx93"}}

{"id":366753232,"type":"node","lat":39.6779242,"lon":-75.76328720000001,"tags":{"addr:city":"Newark","addr:housenumber":"220","addr:postcode":"19711","addr:state":"DE","addr:street":"South Main Street","amenity":"police","ele":"40","gnis:county_name":"New Castle","gnis:feature_id":"2131076","gnis:import_uuid":"57871b70-0100-4405-bb30-88b2e001a944","gnis:reviewed":"no","name":"Newark Police Department","phone":"+1-302-366-7111","source":"USGS Geonames"}}
```

You can then convert the JSON to the 4-column TSV format by piping the data to:

```bash
... | jq -r 'select(.tags."addr:postcode" != null) | select(.tags."addr:city" != null) | [.tags."addr:postcode", .tags."addr:city", (.lon + .centroid.lon), (.lat + .centroid.lat)] | @tsv'
```

### Extract the relevant data from OpenAddresses

The following command will work recursively on a directory of nested CSV files downloaded from http://results.openaddresses.io/

You will need to download and unzip the data yourself before continuing. The `$OA_PATH` variable should point to a directory which should be searched recursively for CSV files.

> The OA CSV files have the following headers:
> LON,LAT,NUMBER,STREET,UNIT,CITY,DISTRICT,REGION,POSTCODE,ID,HASH

You can then convert the CSV files to the 4-column TSV format as such:

```bash
find ${OA_PATH} \
  -type f \
  -name '*.csv' \
    | xargs awk \
      -F ',' \
      'FNR > 1 {if ($1 && $2 && $6 && $9) print $9 "\t" $6 "\t" $1 "\t" $2}'
```

### Import fields in to sqlite

The next step is to import the relevant data in to a sqlite database, processing the full planet will produce many million rows, so using sqlite will ensure that we don't hit issues with available RAM.

The database contains a table called `lastline` which contains the following fields:

| column name | description |
|---|---|
| postcode | The postcode field from the source entity |
| city | The city name from the source entity |
| lon | The longitude value from source (or centroid in the case of a polygon) |
| lat | The latitude value from source (or centroid in the case of a polygon) |

### Aggregation

The next step is to group similar entries and produce an aggreagate count.

This allows us to reduce the number of entries in the table, while also providing a mechanism of determining which postcode+locality values are more common than others in OSM.

The database contains a table called `aggregate` which contains the following fields:

| column name | description |
|---|---|
| count | An aggregate count of how many times the combination of postcode+city occurred |
| postcode | See description above |
| city | See description above |
| lon | A longitude value selected at random from one row the group |
| lat | The latitude value from the same row at the longitude |

### Launching a placeholder service

The following step requires a running [placeholder](https://github.com/pelias/placeholder) service.

The simplest way to get a running service is to use docker, see the placeholder README file for up-to-date instructions:

```bash
# ensure dependencies are installed
apt-get update -y
apt-get install -y gzip

# pull latest docker image
docker pull pelias/placeholder:master

# ensure data dir exists
mkdir -p data

# download data (hosting by Geocode Earth)
curl -s https://data.geocode.earth/placeholder/store.sqlite3.gz | gunzip > data/store.sqlite3

# start placeholder docker container
docker run -d \
    -p '3000:3000' \
    -e 'PLACEHOLDER_DATA=/data/placeholder' \
    -v '/data/placeholder:/data/placeholder' \
    pelias/placeholder:master
```

### Conflation with Who's On First

Pelias used the [whosonfirst gazetter](https://whosonfirst.org/) for administrative polygons.

The next step uses a running [placeholder](https://github.com/pelias/placeholder) service to find a nearby locality which matches the locality name in the database and is also within a specific distance from the lat/lon we have in the database.

## Executing the scripts

Once you have all the dependencies installed you can run the build process by piping the JSON lines document produced by `pbf2json` in to the nodejs import script as such:

```bash
cat pbf2json.pelias.jsonl \
  | jq -r 'select(.tags."addr:postcode" != null) | select(.tags."addr:city" != null) | [.tags."addr:postcode", .tags."addr:city", (.lon + .centroid.lon), (.lat + .centroid.lat)] | @tsv' \
  | DB_FILENAME=osm.postcodes.db node import.js 1> lastline.out 2> lastline.err
```

The script will produce a database file `osm.postcodes.db` as described above and then will write lastline data in TSV format to `stdout` as it gets responses back from the Placeholder service, errors will be written to `stderr`.

It can take some time to run the planet file, you can estimate the execution time using the following formula:

```bash
db_generation_time_ms + ( number_of_json_lines * placeholder_rate_limit )
```

## Environment Variables

The following variables are available to overrite default values:

| env var | default value | description |
|---|---|---|
| `DB_FILENAME` | `osm.postcodes.db` | Path to the database file which is written to disk |
| `PLACEHOLDER_HOST` | `localhost` | Host name of a running placeholder service |
| `PLACEHOLDER_PORT` | `3000` | Port number of a running placeholder service |
| `PLACEHOLDER_QPS` | `30` | A rate-limit for querying the placeholder service (max per second) |
| `PLACEHOLDER_PLACETYPES` | `locality,borough` | Comma separated list of Who's On First [placetypes](https://github.com/whosonfirst/whosonfirst-placetypes) to be used when querying the placeholder service |
| `MAX_DISTANCE_KM` | 200 | The maximum distance a postcode coordinate can be from the locality (in km) |

*Important Note:* currently the place types that can be used via the `PLACEHOLDER_PLACETYPES` environment variable as used _as is_ and are not subject to validation.

## Optional post-processing

```bash
# sort and unique-ify results
LC_ALL=C sort -t$'\t' -k9 -k2n -k1nr lastline.out \
    | awk -F $'\t' '{ key = $4 OFS $2 }; !seen[key]++' \
    > lastline.results.tsv

# divide each line in to country-code files
mkdir 'country'
cut -f9 lastline.results.tsv | uniq | while read cc; do
  awk -F $'\t' -v cc="$cc" '$9==cc {print $2 "\t" $4 "\t" $5 "\t" $6 "\t" $7 "\t" $1}' lastline.results.tsv \
    > "country/$cc.tsv"
done

# tar up all country-code files and gzip them
tar -cvzf 'lastline.countries.tar.gz' -C 'country' .
```
