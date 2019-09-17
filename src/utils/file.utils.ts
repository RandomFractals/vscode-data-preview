import * as fs from 'fs';
import * as util from 'util';
import * as superagent from 'superagent';
import * as path from 'path';
import * as config from '../config';
import {Logger, LogLevel} from '../logger';
import {window, workspace, Uri} from 'vscode';

const readFileAsync = util.promisify(fs.readFile);
const fileSizeLabels: string[] = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
const logger: Logger = new Logger(`file.utils:`, config.logLevel);

/**
 * Reads local data file or fetches public data source data.
 * @param dataFilePath Data file path or public data source url.
 * @param encoding Data file encoding: 'utf8' for text data files, null for binary data reads.
 */
export async function readDataFile(dataFilePath: string, encoding:string = null): Promise<string | Buffer> {
  let data: any = '';
  const fileName: string = path.basename(dataFilePath);
  const fileUri: Uri = Uri.file(dataFilePath); // .parse(dataFilePath);
  logger.debug('readDataFile():', dataFilePath);
  if (!config.supportedDataFiles.test(fileName)) {
    window.showErrorMessage(`${dataFilePath} is not a supported data file for Data Preview!`);
  }
  else if (isRemoteDataUrl(dataFilePath)) {
    data = await readRemoteData(dataFilePath, encoding);
  } 
  else if (fs.existsSync(fileUri.fsPath)) {
    // read local data file via fs.readFile() api
    data = await readLocalData(fileUri.fsPath, encoding);
  } 
  else {
    // try to find requested data file(s) in open workspace
    workspace.findFiles(`**/${dataFilePath}`).then(files => {
      if (files.length > 0 && fs.existsSync(files[0].fsPath)) {
        // read workspace file data
        data = readLocalData(files[0].fsPath, encoding);
      } else {
        window.showErrorMessage(`${dataFilePath} file doesn't exist!`);
      }
    });
  }
  return data;
}

/**
 * Checks if the requested data url is a remote data source; http(s) only for now.
 * @param dataUrl The data url to check.
 * @returns True if the specified data url is a remote data source. false otherwise.
 */
export function isRemoteDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith('http://') || dataUrl.startsWith('https://');
}

/**
 * Gets local data file size for status display.
 * @param dataFilePath Data file path to get size stats for.
 */
export function getFileSize(dataFilePath: string): number {
  let fileSize: number = -1;
  const fileUri: Uri = Uri.file(dataFilePath); //.parse(dataFilePath);
  if (fs.existsSync(fileUri.fsPath)) {
    const stats: fs.Stats = fs.statSync(fileUri.fsPath);
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
 */
async function readLocalData(dataFilePath: string, encoding: string = null): Promise<string | Buffer> {
  logger.debug('readLocalData():', dataFilePath);
  // read local data file via fs read file api
  return await readFileAsync(dataFilePath, encoding);
}

/**
 * Reads remote file data.
 * @param dataUrl Data file url.
 * @param encoding Data file encoding: 'utf8' for text data files, null for binary data reads.
 */
async function readRemoteData(dataUrl: string, encoding: string = null): Promise<string | Buffer> {
  logger.debug('readRemoteData(): url:', dataUrl);
  if (encoding) { // must be text request
    return await superagent.get(dataUrl).then(response => response.text);
  } 
  else { // binary data request
    return await superagent.get(dataUrl)
      .buffer(true).parse(superagent.parse.image)
      .then(response => response.body);
  }
}
