import { LogLevel } from "./logger";

// log level setting for prod. vs. dev run of this ext.
export const logLevel: LogLevel = LogLevel.Info; // change to .Debug for ext. dev debug

// supported data file extensions
export const supportedDataFiles: string[] = [
  '.json',
  '.arrow',
  '.arr',
  '.avro',
  '.parquet',
  '.parq',
  '.config',
  '.env',
  '.properties',
  '.yaml',
  '.csv',
  '.tsv',
  '.txt',
  '.tab',
  '.ods',
  '.prn',
  '.slk',
  '.xls',
  '.xlsb',
  '.xlsx',
  '.xlsm',
  '.xml',
  '.html'
];

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

