import { LogLevel } from "./logger";

// log level setting for prod. vs. dev run of this ext.
export const logLevel: LogLevel = LogLevel.Info; // change to .Debug for ext. dev debug

export const supportedDataFiles: RegExp = /.*\.(json|jsonl|json5|hjson|ndjson|arrow|arr|avro|parquet|parq|config|env|properties|ini|yaml|yml|md|csv|tsv|txt|tab|dif|ods|xls|xlsb|xlsx|xlsm|xml|html)/;

export const supportedBinaryDataFiles: RegExp = /.*\.(arrow|arr|avro|parquet|parq|dif|ods|xls|xlsb|xlsx|xlsm)/;

export const supportedFilesFilters: any = {
  'JSON': ['json', 'jsonl', 'json5', 'hjson', 'ndjson'],
  'CSV/TSV': ['csv', 'tsv', 'tab', 'txt'],
  'Excel': ['dif', 'ods', 'xls', 'xlsb', 'xlsx', 'xlsm', 'xml', 'html'],
  'Parquet': ['parquet'],
  'Arrow': ['arrow'],
  'Avro': ['avro'],
  'Config': ['config'],
  'Markdown': ['md'],
  'Properties': ['env', 'ini', 'properties'],
  'YAML': ['yml']
};

// arrow to data view type mappings
// see: https://github.com/finos/perspective/blob/master/packages/perspective/src/js/utils.js
// and https://github.com/finos/perspective/blob/master/packages/perspective/src/js/perspective.js#ArrowColumnLoader
export const dataTypes = { 
  "Binary": "string",
  "Bool": "boolean",
  "Date": "date",
  "Dictionary": "string",
  "Float32": "float",
  "Float64": "float",
  "Int8": "integer",
  "Int16": "integer",
  "Int32": "integer",
  "Int64": "integer",
  "Timestamp": "datetime",
  "Utf8": "string",
};
