import * as fs from 'fs';
import * as path from 'path';
import * as config from '../config';
import {Logger, LogLevel} from '../logger';
import {IDataProvider} from './data.provider';
import { JsonDataProvider } from './json.data.provider';

/**
 * Data provider manager api interface.
 */
export interface IDataProviderManager {

  /**
   * Gets IDataProvider instance for the specified file type/extension.
   * @param fileType The data file type/extension to get data provider instance for.
   */
  getDataProvider(fileType: string): IDataProvider;
}

/**
 * IDataProviderManager implementation. 
 * TODO: make this pluggable via data.preview.data.provider.manager setting later on.
 */
export class DataProviderManager implements IDataProviderManager {
  
  private dataProviders: Array<IDataProvider>; // loaded templates
  private logger: Logger = new Logger('data.provider.manager:', config.logLevel);

  /**
   * Creates new IDataProviderManager and loads IDataProvider's
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
