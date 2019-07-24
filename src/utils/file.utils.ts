import * as fs from 'fs';
import * as request from 'superagent';
import * as path from 'path';
import * as config from '../config';
import {Logger, LogLevel} from '../logger';
import {window, workspace} from 'vscode';

const fileSizeLabels: string[] = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
const logger: Logger = new Logger(`file.utils:`, config.logLevel);

/**
 * Reads local data file or fetches public data source data.
 * @param dataFilePath Data file path or public data source url.
 * @param encoding Data file encoding: 'utf8' for text data files, null for binary data reads.
 */
export function readDataFile(dataFilePath: string, encoding:string = null) {
  let data: any = '';
  const fileName: string = path.basename(dataFilePath);
  logger.debug('readDataFile():', dataFilePath);
  if (!config.supportedDataFiles.test(fileName)) {
    window.showErrorMessage(`${dataFilePath} is not a supported data file for Data Preview!`);
  }
  else if (dataFilePath.startsWith('http://') || dataFilePath.startsWith('https://')) {
    window.showInformationMessage('Remote data loading coming soon!');
    // TODO: finish this part with remote data read async
    data = readRemoteData(dataFilePath, encoding);
    // logger.debug('readDataFile(): data:\n', data);
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
 * Gets local data file size for status display.
 * @param dataFilePath Data file path to get size stats for.
 */
export function getFileSize(dataFilePath: string): number {
  let fileSize: number = -1;
  if (fs.existsSync(dataFilePath)) {
    const stats: fs.Stats = fs.statSync(dataFilePath);
    fileSize = stats.size;
  } 
  return fileSize;
}

/**
 * Formats bytes for file size status display.
 * @param bytes File size in bytes.
 * @param decimals Number of decimals to include.
 */
export function formatBytes(bytes, decimals): string {
  const base: number = 1024;
  let remainder: number = bytes;
  for(var i = 0; remainder > base; i++) {
    remainder /= base;
  }
  return `${parseFloat(remainder.toFixed(decimals))} ${fileSizeLabels[i]}`;
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
 * @param dataUrl Data file url.
 * @param encoding Data file encoding: 'utf8' for text data files, null for binary data reads.
 * TODO: change this to read data async later
 * TODO: rework this to using streaming api for large data files support later
 */
function readRemoteData(dataUrl: string, encoding: string = null): any {
  let data: any = '';
  logger.debug('readRemoteData(): url:', dataUrl);
  spawn(function *() {
    try {
      const response: any = yield Promise.resolve(request.get(dataUrl));
      data = response.text;
      // logger.debug('readRemoteData(): data:\n', data);
    }
    catch (error) {
      data = '';
      console.error(error);
    }
  });
  return data;
}

function spawn(generatorFunc) {
  function continuer(verb, arg) {
    var result;
    try {
      result = generator[verb](arg);
    } catch (err) {
      return Promise.reject(err);
    }
    if (result.done) {
      return result.value;
    } else {
      return Promise.resolve(result.value).then(onFulfilled, onRejected);
    }
  }
  var generator = generatorFunc();
  var onFulfilled = continuer.bind(continuer, "next");
  var onRejected = continuer.bind(continuer, "throw");
  return onFulfilled();
}
