#!/bin/bash

LEVELDB='/tmp'
PBF='delaware-latest.osm.pbf'
TAGS='addr:postcode+addr:city'
JSONL_FILE='postal.json.gz'

# download pbf2json
# https://github.com/pelias/pbf2json
# curl -LO https://github.com/pelias/pbf2json/raw/master/build/pbf2json.darwin-x64
# chmod +x pbf2json.darwin-x64

# extract data
time ./pbf2json.darwin-x64 \
  -tags="${TAGS}" \
  -leveldb="${LEVELDB}" \
  "${PBF}" \
    | pigz > "${JSONL_FILE}"
