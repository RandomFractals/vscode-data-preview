'use strict';

// vscode imports
import {window} from 'vscode';

// data loading imports
import * as hjson from 'hjson';
import * as json5 from 'json5';
import * as yaml from 'js-yaml';
import * as props from 'properties';

import * as config from '../config';
import * as fileUtils from '../utils/file.utils';
import * as jsonUtils from '../utils/json.utils';
import {Logger, LogLevel} from '../logger';

import {IDataProvider} from '../data.manager';

/**
 * JSON data provider.
 */
export class JsonDataProvider implements IDataProvider {

  private logger: Logger = new Logger('json.data.provider:', config.logLevel);

  /**
   * Creates new JSON data provider for .json, .json5 and .hjson data files.
   */
  constructor() {
    this.logger.debug('created for:', this.supportedDataFileTypes);
  }

  /**
   * Gets supported json data file mime types or extensions.
   */
  public get supportedDataFileTypes(): Array<string> {
    // TODO: add mime types later for http data loading
    // TODO: consider implementing separate data provider for each config/json data file type
    return ['.config', '.env', '.ini', '.json', '.json5', '.hjson', '.properties', '.yaml', '.yml'];
  }

  /**
   * Gets data provider parse function for the specified data url.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataParseFunction(dataUrl: string): Function {
    // TODO: add mime types later for remote http data loading
    const dataFileType: string = dataUrl.substr(dataUrl.lastIndexOf('.')); // get local file extension for now
    let dataParseFunction: Function = JSON.parse; // default
    switch (dataFileType) {
      case '.env':
      case '.ini':
      case '.properties':
        dataParseFunction = props.parse;
        break;
      case '.json5':
        dataParseFunction = json5.parse;
        break;
      case '.hjson':
        dataParseFunction = hjson.parse;
        break;
      case '.yaml':
      case '.yml':
        dataParseFunction = yaml.load;
        break;
    }
    return dataParseFunction;
  }

  /**
   * Gets local or remote data.
   * @param dataUrl Local data file path or remote data url.
   * @param parseOptions Optional data parsing options.
   * TODO: change this to async later.
   */
  public getData(dataUrl: string, dataParseOptions?: any): any {
    let data: any = [];
    try {
      let content: string = fileUtils.readDataFile(dataUrl, 'utf8');
      if (dataUrl.endsWith('.json')) {
        // strip out comments for vscode settings .json config files loading :)
        const comments: RegExp = new RegExp(/\/\*[\s\S]*?\*\/|\/\/.*/g);
        content = content.replace(comments, '');
      }
      const parseFunction: Function = this.getDataParseFunction(dataUrl);
      data = (dataParseOptions) ? parseFunction(content, dataParseOptions) : parseFunction(content);
    }
    catch (error) {
      this.logger.logMessage(LogLevel.Error, `getData(): Error parsing '${dataUrl}' \n\t Error:`, error.message);
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
