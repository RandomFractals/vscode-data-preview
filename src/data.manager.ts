import * as config from './config';
import {Logger} from './logger';
import { JsonDataProvider } from './data.providers/json.data.provider';

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
   * @param stringifyFunction Optional stringiy function override.
   */
  saveData(filePath: string, fileData: any, stringifyFunction: Function): void;
}

/**
 * IDataManager implementation. 
 * TODO: make this pluggable via data.preview.data.manager setting later on.
 */
export class DataManager implements IDataManager {
  
  private dataProviders: Array<IDataProvider>; // loaded data providers
  private logger: Logger = new Logger('data.manager:', config.logLevel);

  /**
   * Creates new data manager and loads IDataProvider's
   * for the supported data formats listed in package.json.
   */
  public constructor() {
    this.dataProviders = this.loadDataProviders();
  }

  /**
   * Initializes data providers for the supported data formats.
   */
  private loadDataProviders(): Array<IDataProvider> {
    this.logger.debug('loadDataProviders(): loading data providers...');

    // create data providers instances for the supported data formats
    const dataProviders: Array<IDataProvider> = [];
    const jsonDataProvider: IDataProvider = new JsonDataProvider('.json');
    dataProviders.push(jsonDataProvider);

    this.logger.debug('loadDataProviders(): loaded data providers:', dataProviders);
    return dataProviders;
  }

  /**
   * Gets IDataProvider instance for the specified file type/extension.
   * @param fileType The data file type/extension to get data provider instance for.
   */
  getDataProvider(fileType: string): IDataProvider {
    // TODO: change this to map or set later
    return this.dataProviders.find(dataProvider => dataProvider.name === fileType);
  }
}
