import * as fs from 'fs';
import * as path from 'path';
import * as config from '../config';
import {Logger, LogLevel} from '../logger';
import {IDataProvider} from './data.provider';
import { JsonDataProvider } from './json.data.provider';

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
