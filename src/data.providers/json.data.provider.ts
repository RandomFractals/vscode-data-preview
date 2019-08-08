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
   * Creates new JSON data provider for .json, .json5, .hjson data files,
   * .config, .env, .ini, .properties and .yml config files.
   */
  constructor() {
    this.logger.debug('created for:', this.supportedDataFileTypes);
  }

  /**
   * Gets supported config and json data file mime types or extensions.
   */
  public get supportedDataFileTypes(): Array<string> {
    // TODO: add mime types later for http data loading
    // TODO: consider implementing separate data provider for each config/json data file type
    return ['.config', '.env', '.ini', '.json', '.json5', '.hjson', '.properties', '.yaml', '.yml'];
  }

  /**
   * Gets data provider parse function for the specified data file type.
   * @param dataFileType Data file type.
   */
  private getDataParseFunction(dataFileType: string): Function {
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
   * Gets data provider parse options for the specified data file type.
   * @param dataFileType Data file type.
   */
  private getDataParseOptions(dataFileType: string): Function {
    let dataParseOptions: any = null; // default
    switch (dataFileType) {
      case '.env':
        dataParseOptions = {sections: true, comments: ['#']};
        break;
      case '.ini':
        // NOTE: some INI files consider # as a comment
        dataParseOptions = {sections: true, comments: [';', '#']};
        break;
      case '.properties':
        dataParseOptions = {sections: true};
        break;
    }
    return dataParseOptions;
  }

  /**
   * Gets local or remote data.
   * @param dataUrl Local data file path or remote data url.
   * TODO: change this to async later.
   */
  public getData(dataUrl: string): any {
    let data: any = [];
    // TODO: add mime types later for remote http data loading
    const dataFileType: string = dataUrl.substr(dataUrl.lastIndexOf('.')); // get local file extension for now
    try {
      let content: string = fileUtils.readDataFile(dataUrl, 'utf8');
      if (dataUrl.endsWith('.json')) {
        // strip out comments for vscode settings .json config files loading :)
        const comments: RegExp = new RegExp(/\/\*[\s\S]*?\*\/|\/\/.*/g);
        content = content.replace(comments, '');
      }
      const parseFunction: Function = this.getDataParseFunction(dataFileType);
      const parseOptions: any = this.getDataParseOptions(dataFileType);
      data = (parseOptions) ? parseFunction(content, parseOptions) : parseFunction(content);
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
