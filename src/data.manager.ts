import * as config from './config';
import {Logger, LogLevel} from './logger';
import {JsonDataProvider} from './data.providers/json.data.provider';

/**
 * Data Manager API interface.
 */
export interface IDataManager {

  /**
   * Gets IDataProvider instance for the specified data file mime type or extension.
   * @param fileType Data file mime type or extension to get IDataProvider instance for.
   */
  getDataProvider(fileType: string): IDataProvider;

  /**
   * Gets local or remote data.
   * @param dataUrl Local data file path or remote data url.
   */
  getData(dataUrl: string): any;
}

/**
 * Data Provider API interface.
 */
export interface IDataProvider {

  /**
   * Supported data provider file mime types or extensions.
   */
  supportedDataFileTypes: Array<string>;

  /**
   * Gets local or remote data.
   * @param dataUrl Local data file path or remote data url.
   */
  getData(dataUrl: string): any;
 
  /**
   * Saves raw data provider data.
   * @param filePath Local data file path. 
   * @param fileData Raw data to save.
   * @param stringifyFunction Optional stringify function override.
   */
  saveData(filePath: string, fileData: any, stringifyFunction?: Function): void;
}

/**
 * IDataManager implementation. 
 * TODO: make this pluggable via data.preview.data.manager setting later.
 */
export class DataManager implements IDataManager {
  
  // singleton instance
  private static _instance: DataManager;
  private _dataProviders: {}; // loaded data providers map
  private _logger: Logger = new Logger('data.manager:', config.logLevel);

  /**
   * Creates new data manager instance and loads IDataProvider's
   * for the supported data formats listed in package.json.
   */
  private constructor() {
    this._dataProviders = this.loadDataProviders();
  }

  /**
   * Creates data manager singleton instance.
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
    const dataProviders: any = {};
    // create data providers instances for the supported data formats
    this.addDataProvider(dataProviders, new JsonDataProvider());
    // TODO: add other data providers loading and initialization here:
    // text.data.provider, excel.data.provider, markdown, arrow, avro, etc.
    // ...
    if (this._logger.logLevel === LogLevel.Debug) {
      this._logger.debug('loadDataProviders(): loaded data providers:', Object.keys(this._dataProviders));
    }
    return dataProviders;
  }

  /**
   * Adds new data provider to the provider/file types map.
   * @param dataProviderMap Data provider map to update.
   * @param dataProvider Data provider to add.
   */
  private addDataProvider(dataProviderMap: any, dataProvider: IDataProvider): void {
    dataProvider.supportedDataFileTypes.forEach(fileType => {
      dataProviderMap[fileType] = dataProvider;
    });
  }

  /**
   * Gets IDataProvider instance for the specified file mime type or extension.
   * @param fileType The data file mime type or extension to get data provider instance for.
   */
  public getDataProvider(fileType: string): IDataProvider {
    if (this._dataProviders.hasOwnProperty(fileType)) {
      return this._dataProviders[fileType];
    }
    throw new Error(`No matching data provider found for file type: ${fileType}`);
  }

  /**
   * Gets local or remote data.
   * @param dataUrl Local data file path or remote data url.
   */
  public getData(dataUrl: string, parseOptions?: any): any {
    // TODO: add mime types later for remote http data loading
    const dataFileType: string = dataUrl.substr(dataUrl.lastIndexOf('.')); // get file extension for now
    const dataProvider: IDataProvider = this.getDataProvider(dataFileType);
    return dataProvider.getData(dataUrl);
  }

}

// export Data manager singleton
export const dataManager = DataManager.Instance;
