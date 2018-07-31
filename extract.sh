#!/bin/bash

LEVELDB='/tmp'
PBF='/data/pbf/berlin-latest.osm.pbf'
TAGS='addr:postcode+addr:city'
JSONL_FILE='postal.json.gz'

time ./pbf2json.linux-x64 \
  -tags="${TAGS}" \
  -leveldb="${LEVELDB}" \
  "${PBF}" \
    | pigz > "${JSONL_FILE}"
