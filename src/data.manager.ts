import {window} from 'vscode';
import * as config from './config';
import {Logger, LogLevel} from './logger';

// data provider imports
import {AvroDataProvider} from './data.providers/avro.data.provider';
import {ArrowDataProvider} from './data.providers/arrow.data.provider';
import {ExcelDataProvider} from './data.providers/excel.data.provider';
import {HjsonDataProvider} from './data.providers/hjson.data.provider';
import {JsonDataProvider} from './data.providers/json.data.provider';
import {Json5DataProvider} from './data.providers/json5.data.provider';
import {MarkdownDataProvider} from './data.providers/markdown.data.provider';
import {TextDataProvider} from './data.providers/text.data.provider';
import {PropertiesDataProvider} from './data.providers/properties.data.provider';
import {YamlDataProvider} from './data.providers/yaml.data.provider';

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
   * @param parseOptions Data parse options.
   * @param loadData Load data callback.
   */
  getData(dataUrl: string, parseOptions: any, loadData: Function): void;

  /**
   * Gets data table names for data sources with multiple data sets.
   * @param dataUrl Local data file path or remote data url.
   */
  getDataTableNames(dataUrl: string): Array<string>;

  /**
   * Gets data schema in json format for file types that provide it.
   * @param dataUrl Local data file path or remote data url.
   */
  getDataSchema(dataUrl: string): any;

  /**
   * Saves raw data provider data.
   * @param filePath Local data file path. 
   * @param fileData Raw data to save.
   * @param tableName Table name for data files with multiple tables support.
   * @param showData Show saved data callback.
   */
  saveData(filePath: string, fileData: any, tableName: string, showData?: Function): void;

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
   * @param parseOptions Data parse options.
   * @param loadData Load data callback.
   */
  getData(dataUrl: string, parseOptions: any, loadData: Function): void;
 
  /**
   * Gets data table names for data sources with multiple data sets.
   * @param dataUrl Local data file path or remote data url.
   */
  getDataTableNames(dataUrl: string): Array<string>;

  /**
   * Gets data schema in json format for file types that provide it.
   * @param dataUrl Local data file path or remote data url.
   */
  getDataSchema(dataUrl: string): any;

  /**
   * Saves raw data provider data.
   * @param filePath Local data file path. 
   * @param fileData Raw data to save.
   * @param tableName Table name for data files with multiple tables support.
   * @param showData Show saved data callback.
   */
  saveData(filePath: string, fileData: any, tableName: string, showData?: Function): void;
}

/**
 * IDataManager implementation. 
 * TODO: make this pluggable via data.preview.data.manager setting later.
 */
export class DataManager implements IDataManager {
  
  // singleton instance
  private static _instance: DataManager;
  private _dataProviders: Map<string, IDataProvider>;
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
   * @see package.json and config.ts for more info.
   */
  private loadDataProviders(): any {
    this._logger.debug('loadDataProviders(): loading data providers...');
    // create data provider instances for the supported data formats
    const dataProviders: Map<string, IDataProvider> = new Map<string, IDataProvider>();
    this.addDataProvider(dataProviders, new AvroDataProvider());
    this.addDataProvider(dataProviders, new ArrowDataProvider());
    this.addDataProvider(dataProviders, new ExcelDataProvider());
    this.addDataProvider(dataProviders, new HjsonDataProvider());
    this.addDataProvider(dataProviders, new JsonDataProvider());
    this.addDataProvider(dataProviders, new Json5DataProvider());
    this.addDataProvider(dataProviders, new MarkdownDataProvider());
    this.addDataProvider(dataProviders, new TextDataProvider());
    this.addDataProvider(dataProviders, new PropertiesDataProvider());
    this.addDataProvider(dataProviders, new YamlDataProvider());
    this._logger.debug('loadDataProviders(): loaded data providers:', Object.keys(dataProviders));
    return dataProviders;
  }

  /**
   * Adds new data provider to the provider/file types map.
   * @param dataProviderMap Data provider map to update.
   * @param dataProvider Data provider to add.
   */
  private addDataProvider(dataProviderMap: Map<string, IDataProvider>, 
    dataProvider: IDataProvider): void {
    dataProvider.supportedDataFileTypes.forEach(fileType => {
      dataProviderMap.set(fileType, dataProvider);
    });
  }

  /**
   * Gets IDataProvider instance for the specified file mime type or extension.
   * @param fileType The data file mime type or extension to get data provider instance for.
   */
  public getDataProvider(fileType: string): IDataProvider {
    if (this._dataProviders.has(fileType)) {
      return this._dataProviders.get(fileType);
    }
    const errorMessage: string = `No matching Data Provider found for the File Type: '${fileType}'`;
    window.showErrorMessage(errorMessage);
    throw new Error(errorMessage);
  }

  /**
   * Gets local or remote data.
   * @param dataUrl Local data file path or remote data url.
   * @param parseOptions Data parse options.
   * @param loadData Load data callback.
   */
  public getData(dataUrl: string, parseOptions: any, loadData: Function): void {
    // TODO: add mime types later for remote http data loading
    const dataFileType: string = dataUrl.substr(dataUrl.lastIndexOf('.')); // file extension
    const dataProvider: IDataProvider = this.getDataProvider(dataFileType);
    dataProvider.getData(dataUrl, parseOptions, loadData);
  }

  /**
   * Gets data table names for data sources with multiple data sets.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataTableNames(dataUrl: string): Array<string> {
    const dataFileType: string = dataUrl.substr(dataUrl.lastIndexOf('.')); // file extension
    const dataProvider: IDataProvider = this.getDataProvider(dataFileType);
    return dataProvider.getDataTableNames(dataUrl);
  }

  /**
   * Gets data schema in json format for file types that provide it.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataSchema(dataUrl: string): any {
    const dataFileType: string = dataUrl.substr(dataUrl.lastIndexOf('.')); // file extension
    const dataProvider: IDataProvider = this.getDataProvider(dataFileType);
    return dataProvider.getDataSchema(dataUrl);
  }

  /**
   * Saves raw data provider data.
   * @param filePath Local data file path.
   * @param fileData Raw data to save.
   * @param tableName Table name for data files with multiple tables support.
   * @param showData Show saved data callback.
   */
  public saveData(filePath: string, fileData: any, tableName: string, showData?: Function): void {
    const dataFileType: string = filePath.substr(filePath.lastIndexOf('.')); // file extension
    const dataProvider: IDataProvider = this.getDataProvider(dataFileType);
    dataProvider.saveData(filePath, fileData, tableName, showData);
  }

}

// export Data manager singleton
export const dataManager = DataManager.Instance;
