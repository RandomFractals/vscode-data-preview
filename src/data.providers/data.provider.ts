import * as fs from 'fs';
import * as path from 'path';
import * as config from '../config';
import {Logger, LogLevel} from '../logger';

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
