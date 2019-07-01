import * as fs from 'fs';
import * as path from 'path';
import * as config from '../config';
import {Logger, LogLevel} from '../logger';

/**
 * Data Provider API interface.
 */
export interface IDataProvider {

  /**
   * Gets data format data.
   * @param dataUrl Local data file path or remote data url.
   */
  getData(dataUrl: string): any;

  /**
   * Saves raw Data Provider data.
   * @param filePath Data file path. 
   * @param fileData Raw data to save.
   */
  saveData(fileData: any): void;
}
