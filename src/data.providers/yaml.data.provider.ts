import {window} from 'vscode';
import * as yaml from 'js-yaml';
import * as config from '../config';
import * as fileUtils from '../utils/file.utils';
import * as jsonUtils from '../utils/json.utils';
import {Logger, LogLevel} from '../logger';
import {IDataProvider} from '../data.manager';

/**
 * YAML data provider.
 */
export class YamlDataProvider implements IDataProvider {

  // TODO: add mime types later for http data loading
  public supportedDataFileTypes: Array<string> = ['.yaml', '.yml'];  
  private logger: Logger = new Logger('yaml.data.provider:', config.logLevel);

  /**
   * Creates new YAML data provider for .yml data/config files.
   */
  constructor() {
    this.logger.debug('created for:', this.supportedDataFileTypes);
  }

  /**
   * Gets local or remote data.
   * @param dataUrl Local data file path or remote data url.
   * @param parseOptions Data parse options.
   * @param loadData Load data callback.
   */
  public getData(dataUrl: string, parseOptions: any, loadData: Function): void {
    let data: any = [];
    try {
      let content: string = fileUtils.readDataFile(dataUrl, 'utf8');
      data = yaml.load(content);
    }
    catch (error) {
      this.logger.logMessage(LogLevel.Error, `getData(): Error parsing '${dataUrl}' \n\t Error:`, error.message);
      window.showErrorMessage(`Unable to parse data file: '${dataUrl}'. \n\t Error: ${error.message}`);
    }
    loadData(jsonUtils.convertJsonData(data));
  }

  /**
   * Gets data table names for data sources with multiple data sets.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataTableNames(dataUrl: string): Array<string> {
    return []; // none for .yml data files
  }

  /**
   * Gets data schema in json format for file types that provide it.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataSchema(dataUrl: string): any {
    return null; // none for .yml data files
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
