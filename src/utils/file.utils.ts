import * as fs from 'fs';
import * as path from 'path';
import * as config from '../config';
import {Logger, LogLevel} from '../logger';
import {window} from 'vscode';

const logger: Logger = new Logger(`file.utils:`, config.logLevel);

/**
 * Reads local data file or fetches public data source data.
 * @param dataFilePath Data file path or public data source url.
 * @param encoding Data file encoding: 'utf8' for text data files, null for binary data reads.
 */
export function readDataFile(dataFilePath: string, encoding:string = null): any {
  let data: any;
  logger.debug('readDataFile(): ', dataFilePath);
  if (!dataFilePath.startsWith('http://') && !dataFilePath.startsWith('https://')) {
    // read local data file via fs read file api
    // TODO: change this to read data async later
    data = fs.readFileSync(dataFilePath, encoding);
  } else {
    // TODO: fetch remote data with https://github.com/d3/d3-fetch
    data = '';
  }
  return data;
}
