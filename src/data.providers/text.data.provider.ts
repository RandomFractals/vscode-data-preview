import {window} from 'vscode';
import * as config from '../config';
import * as fileUtils from '../utils/file.utils';
import {Logger, LogLevel} from '../logger';
import {IDataProvider} from '../data.manager';

/**
 * Text data provider.
 */
export class TextDataProvider implements IDataProvider {

  // TODO: add mime types later for http data loading
  // TODO: consider implementing separate data provider for each config/json data file type
  public supportedDataFileTypes: Array<string> = ['.csv', '.tsv', '.txt', '.tab'];

  private logger: Logger = new Logger('text.data.provider:', config.logLevel);

  /**
   * Creates new text data provider for .json, .json5 and .hjson data files.
   */
  constructor() {
    this.logger.debug('created for:', this.supportedDataFileTypes);
  }

  /**
   * Gets local or remote data.
   * @param dataUrl Local data file path or remote data url.
   * TODO: change this to async later.
   */
  public getData(dataUrl: string): any {
    let data: any = [];
    try {
      // TODO: change this to streaming text data read later
      data = fileUtils.readDataFile(dataUrl, 'utf8'); // file encoding to read data as string
    }
    catch (error) {
      this.logger.logMessage(LogLevel.Error, `getData(): Error parsing '${dataUrl}' \n\t Error:`, error.message);
      window.showErrorMessage(`Unable to parse data file: '${dataUrl}'. \n\t Error: ${error.message}`);
    }
    return data;
  }

  /**
   * Gets data table names for data sources with multiple data sets.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataTableNames(dataUrl: string): Array<string> {
    return []; // none for text data files
  }

  /**
   * Gets data schema in json format for file types that provide it.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataSchema(dataUrl: string): any {
    // TODO: return headers row for text data ???
    return null; // none for text data files
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
