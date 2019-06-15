import * as fs from 'fs';
import * as path from 'path';
import * as config from '../config';
import {Logger, LogLevel} from '../logger';
import {window} from 'vscode';

const logger: Logger = new Logger(`json.utils:`, config.logLevel);

/**
 * Flattens objects with nested properties for data view display.
 * @param obj Object to flatten.
 * @returns Flat Object.
 */
export function flattenObject (obj: any): any {
  const flatObject: any = {};
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(flatObject, this.flattenObject(obj[key]));
    } else {
      flatObject[key] = obj[key];
    }
  });
  return flatObject;
}

/**
 * Converts .env or .properties config file
 * to an array of propertyName/value objects.
 * @param configString Config file content.
 */
export function configToArray(configString: string): Array<any> {
  const properties: Array<any> = [];
  if (configString && configString.length > 0) {
    const configLines: Array<string> = configString.split(/\r\n|\r|\n/);
    configLines.forEach(line => {
      if (line.length > 0 && !line.startsWith('#') && !line.startsWith('!')) { // skip comments        
        const keyValue: Array<string> = line.split('=');
        properties.push({
            "Name": keyValue[0] || 'space',
            "Value": keyValue[1] || ''
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
