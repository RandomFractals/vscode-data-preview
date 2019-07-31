import * as config from './config';
import {Logger} from './logger';
import {JsonDataProvider} from './data.providers/json.data.provider';

/**
 * Data manager api interface.
 */
export interface IDataManager {

  /**
   * Gets IDataProvider instance for the specified file type/extension.
   * @param fileType The data file type/extension to get data provider instance for.
   */
  getDataProvider(fileType: string): IDataProvider;
}

/**
 * Data Provider API interface.
 */
export interface IDataProvider {

  /**
   * Data provider name.
   */
  name: string;

  /**
   * Gets data format data.
   * @param dataUrl Local data file path or remote data url.
   * @param parseFunction Optional data parse function override.
   * @param parseOptions Optional data parsing options.
   */
  getData(dataUrl: string, parseFunction: Function, parseOptions: any): any;
 

  /**
   * Saves raw Data Provider data.
   * @param filePath Data file path. 
   * @param fileData Raw data to save.
   * @param stringifyFunction Optional stringify function override.
   */
  saveData(filePath: string, fileData: any, stringifyFunction: Function): void;
}

/**
 * IDataManager implementation. 
 * TODO: make this pluggable via data.preview.data.manager setting later on.
 */
export class DataManager implements IDataManager {
  
  // singleton instance
  private static _instance: DataManager;
  private _dataProviders: {}; // loaded data providers map
  private _logger: Logger = new Logger('data.manager:', config.logLevel);

  /**
   * Creates new Data manager instance and loads IDataProvider's
   * for the supported data formats listed in package.json.
   */
  private constructor() {
    this._dataProviders = this.loadDataProviders();
  }

  /**
   * Creates Data manager singleton instance.
   */
  public static get Instance() {
    if (!this._instance) {
      this._instance = new this();
    }
    return this._instance;
  }

  /**
   * Initializes data providers for the supported data formats.
   */
  private loadDataProviders(): any {
    this._logger.debug('loadDataProviders(): loading data providers...');

    // create data providers instances for the supported data formats
    const dataProviders: any = {};
    const jsonDataProvider: IDataProvider = new JsonDataProvider('.json');
    dataProviders['.json'] = jsonDataProvider;
    // ...
    this._logger.debug('loadDataProviders(): loaded data providers:', Object.keys(dataProviders));
    return dataProviders;
  }

  /**
   * Gets IDataProvider instance for the specified file type/extension.
   * @param fileType The data file type/extension to get data provider instance for.
   */
  getDataProvider(fileType: string): IDataProvider {
    if (this._dataProviders.hasOwnProperty(fileType)) {
      return this._dataProviders[fileType];
    }
    throw new Error(`No matching data provider found for file type: ${fileType}`);
  }
}

// export Data manager singleton
export const dataManager = DataManager.Instance;
