
# Environment Variables

The following variables are available to overrite default values:

| env var | default value | description |
|---|---|---|
| DB_FILENAME | osm.postcodes.db | Path to the database file which is written to disk |
| PLACEHOLDER_HOST | localhost | Host name of a running placeholder service |
| PLACEHOLDER_PORT | 3000 | Port number of a running placeholder service |
| PLACEHOLDER_QPS | 30 | A rate-limit for querying the placeholder service (max per second) |
| MAX_DISTANCE_KM | 200 | The maximum distance a postcode coordinate can be from the locality (in km) |