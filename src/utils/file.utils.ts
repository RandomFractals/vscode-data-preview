import * as fs from 'fs';
import * as request from 'request-promise-native';
import * as path from 'path';
import * as config from '../config';
import {Logger, LogLevel} from '../logger';
import {window, workspace} from 'vscode';

const logger: Logger = new Logger(`file.utils:`, config.logLevel);

/**
 * Reads local data file or fetches public data source data.
 * @param dataFilePath Data file path or public data source url.
 * @param encoding Data file encoding: 'utf8' for text data files, null for binary data reads.
 */
export function readDataFile(dataFilePath: string, encoding:string = null): any {
  let data: any = '';
  const fileName: string = path.basename(dataFilePath);
  logger.debug('readDataFile():', dataFilePath);
  if (!config.supportedDataFiles.test(fileName)) {
    window.showErrorMessage(`${dataFilePath} is not a supported data file for Data Preview!`);
  }
  else if (dataFilePath.startsWith('http://') || dataFilePath.startsWith('https://')) {
    // fetch remote data using https://github.com/request/request lib api
    data = readRemoteData(dataFilePath, encoding);
  } 
  else if (fs.existsSync(dataFilePath)) {
    // read local data file via fs.readFile() api
    data = readLocalData(dataFilePath, encoding);
  } 
  else {
    // try to find requested data file(s) in open workspace
    workspace.findFiles(`**/${dataFilePath}`).then(files => {
      if (files.length > 0 && fs.existsSync(files[0].fsPath)) {
        // read workspace file data
        data = readLocalData(dataFilePath, encoding);
      } else {
        window.showErrorMessage(`${dataFilePath} file doesn't exist!`);
      }
    });
  }
  return data;
}

/**
 * Creates JSON data or schema.json file.
 * @param jsonFilePath Json file path.
 * @param jsonData Json file data.
 */
export function createJsonFile(jsonFilePath: string, jsonData: any): void {
  if (!fs.existsSync(jsonFilePath)) {
    const jsonString: string = JSON.stringify(jsonData, null, 2); 
    try {
      // TODO: rework this to async file write later
      const jsonFileWriteStream: fs.WriteStream = fs.createWriteStream(jsonFilePath, {encoding: 'utf8'});
      jsonFileWriteStream.write(jsonString);
      jsonFileWriteStream.end();
      logger.debug('createJsonFile(): saved:', jsonFilePath);
    } catch (error) {
      const errorMessage: string = `Failed to save file: ${jsonFilePath}`;
      logger.logMessage(LogLevel.Error, 'crateJsonFile():', errorMessage);
      window.showErrorMessage(errorMessage);
    }
  }
}

/**
 * Reads local file data.
 * @param dataFilePath Data file path.
 * @param encoding Data file encoding: 'utf8' for text data files, null for binary data reads.
 * TODO: change this to read data async later
 * TODO: rework this to using fs.ReadStream for large data files support later
 */
function readLocalData(dataFilePath: string, encoding: string = null): any {
  let data: any = '';
  logger.debug('readLocalData():', dataFilePath);
  // read local data file via fs read file api
  data = fs.readFileSync(dataFilePath, encoding);
  return data;
}

/**
 * Reads remote file data.
 * @param dataFileUrl Data file url.
 * @param encoding Data file encoding: 'utf8' for text data files, null for binary data reads.
 * TODO: change this to read data async later
 * TODO: rework this to using streaming api for large data files support later
 */
async function readRemoteData(dataFileUrl: string, encoding: string = null) {
  let data: any = '';
  logger.debug('readRemoteData():', dataFileUrl);
  try {
    data = await request(dataFileUrl);
    logger.debug('readRemoteData(): response data:\n', data);
  }
  catch(error) {
    logger.logMessage(LogLevel.Error, 'readRemoteData(): error:', error);
    window.showErrorMessage(`Unable to read '${dataFileUrl}. Error:\n${error}`);
  }
  return data;
}
