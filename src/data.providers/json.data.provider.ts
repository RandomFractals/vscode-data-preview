'use strict';

// vscode imports
import {window} from 'vscode';

import * as fs from 'fs';
import * as path from 'path';
import * as config from '../config';
import * as fileUtils from '../utils/file.utils';
import * as jsonUtils from '../utils/json.utils';
import {Logger, LogLevel} from '../logger';
import {IDataProvider} from './data.provider';

/**
 * JSON data provider.
 */
export class JsonDataProvider implements IDataProvider {

  private logger: Logger = new Logger('json.data.provider:', config.logLevel);

  /**
   * Creates new JSON data provider for .json, .json5, and .hjson data files.
   * @param name Data provider name.
   */
  constructor(public name: string = '.json') {
  }

  /**
   * Gets data format data.
   * @param dataUrl Local data file path or remote data url.
   * @param parseFunction Optional data parse function override.
   * @param parseOptions Optional data parsing options.
   */
  public getData(dataUrl: string,
    parseFunction: Function,
    parseOptions: any = null): any {
    let data: any = [];
    try {
      const content: string = fileUtils.readDataFile(dataUrl, 'utf8');
      data = (parseOptions) ? parseFunction(content, parseOptions) : parseFunction(content);
    }
    catch (error) {
      this.logger.logMessage(LogLevel.Error,
        `getData(): Error parsing '${dataUrl}' \n\t Error:`, error.message);
      window.showErrorMessage(`Unable to parse data file: '${dataUrl}'. \n\t Error: ${error.message}`);
    }
    return jsonUtils.convertJsonData(data);
  }

  /**
   * Saves raw Data Provider data.
   * @param filePath Data file path. 
   * @param fileData Raw data to save.
   * @param stringifyFunction Optional stringiy function override.
   */
  public saveData(filePath: string, fileData: any, stringifyFunction: Function): void {
    // TODO
  }
}
