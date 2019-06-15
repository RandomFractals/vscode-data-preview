import * as fs from 'fs';
import * as path from 'path';
import * as config from '../config';
import {Logger, LogLevel} from '../logger';
import {window} from 'vscode';

const logger: Logger = new Logger(`json.utils:`, config.logLevel);

/**
 * Flattens objects with nested properties for data view display.
 * @param obj Object to flatten.
 * @param preservePath Optional flag for generating key path.
 * @param parentPath Parent key path.
 * @returns Flat Object.
 */
export function flattenObject (obj: any, preservePath: boolean = false, parentPath: string = ''): any {
  const flatObject: any = {};
  Object.keys(obj).forEach((key) => {
    if (preservePath) {
      if (parentPath.length > 0) {
        parentPath = `${parentPath}.${key}`;
      } else {
        parentPath = key;
      }
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      let children: any = {};
      Object.assign(children, this.flattenObject(obj[key], preservePath, parentPath));
      Object.keys(children).forEach(childKey => {
        flatObject[`${parentPath}.${childKey}`] = children[childKey];
      });
    } 
    else if (Array.isArray(obj[key])) {
    
    } else {
      flatObject[key] = obj[key].toString();
    }
  });
  return flatObject;
}

/**
 * Converts an object to an array of property key/value objects.
 * @param obj Object to convert.
 */
export function objectToPropertyArray(obj: any): Array<any> {
  const properties: Array<any> = [];
  if (obj && obj !== undefined) {
    Object.keys(obj).forEach((key) => {
      properties.push({
        key: key,
        value: obj[key]
      });
    });
  }
  return properties;
}

/**
 * Converts .env or .properties config file
 * to an array of property key/value objects.
 * @param configString Config file content.
 */
export function configToPropertyArray(configString: string): Array<any> {
  const properties: Array<any> = [];
  if (configString && configString.length > 0) {
    const configLines: Array<string> = configString.split(/\r\n|\r|\n/);
    configLines.forEach(line => {
      if (line.length > 0 && !line.startsWith('#') && !line.startsWith('!')) { // skip comments        
        const keyValue: Array<string> = line.split('=');
        properties.push({
            key: keyValue[0] || '<space>',
            value: keyValue[1] || ''
          });
      }
    });
  }
  return properties;
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
