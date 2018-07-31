#!/bin/bash

JSONL_FILE='postal.json.gz'
FIELDS_FILE='fields.csv.gz'
FIELDS_COUNT_FILE='fields.count.tsv'
NODE_FIELDS_FILE='node.fields.csv.gz'
WAY_FIELDS_FILE='way.fields.csv.gz'

rm -f "${FIELDS_FILE}";
rm -f "${FIELDS_COUNT_FILE}";
rm -f "${NODE_FIELDS_FILE}";
rm -f "${WAY_FIELDS_FILE}";

zcat "${JSONL_FILE}" | jq -r 'select(.type == "node") | (.lon|tostring) + "\t" + (.lat|tostring) + "\t" + .tags."addr:postcode" + "\t" + .tags."addr:city"' \
  | pigz > "${NODE_FIELDS_FILE}"

zcat "${JSONL_FILE}" | jq -r 'select(.type == "way")  | (.centroid.lon|tostring) + "\t" + (.centroid.lat|tostring) + "\t" + .tags."addr:postcode" + "\t" + .tags."addr:city"' \
  | pigz > "${WAY_FIELDS_FILE}"

zcat "${NODE_FIELDS_FILE}" "${WAY_FIELDS_FILE}" \
  | tr '[:lower:]' '[:upper:]' \
  | sort -t$'\t' -k3,3 -k4,4 \
    | pigz > "${FIELDS_FILE}.tmp" && mv "${FIELDS_FILE}.tmp" "${FIELDS_FILE}"

rm -f "${NODE_FIELDS_FILE}";
rm -f "${WAY_FIELDS_FILE}";

zcat "${FIELDS_FILE}" \
  | uniq -c -f2 \
  | sed -r 's/^( *[^ ]+) +/\1\t/' \
  | sort -t$'\t' -k4,4 -k1,1rn \
  | awk '{ print $4 "\t" $5 "\t" $1 "\t" $2 "\t" $3 }' \
    > "${FIELDS_COUNT_FILE}";

rm -f "${FIELDS_FILE}";
