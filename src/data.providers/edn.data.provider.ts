import {window} from 'vscode';
import * as fs from 'fs';
import * as config from '../config';
import * as fileUtils from '../utils/file.utils';
import * as jsonUtils from '../utils/json.utils';
import {Logger, LogLevel} from '../logger';
import {IDataProvider} from '../data.manager';
import { parseEDNString, toEDNStringFromSimpleObject } from 'edn-data';
import { ParseOptions } from 'edn-data/dist/parse';

const defaultEDNParseOptions: ParseOptions = {
    charAs: 'string',
    keywordAs: 'string',
    listAs: 'array',
    mapAs: 'object',
    setAs: 'set',
}

/**
 * EDN data provider.
 * @see https://github.com/edn-format/edn
 */
export class EDNDataProvider implements IDataProvider {

  // TODO: add mime types later for http data loading
  public supportedDataFileTypes: Array<string> = ['.edn'];  
  private logger: Logger = new Logger('edn.data.provider:', config.logLevel);

  /**
   * Creates new EDN data provider for .edn data files.
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
  public async getData(dataUrl: string, parseOptions: any, loadData: Function): Promise<void> {
    let data: any = [];
    let lineIndex = 1;
    try {
      let content: string = String(await fileUtils.readDataFile(dataUrl, 'utf8'));
      data = parseEDNString(content, {
        ...defaultEDNParseOptions,
        ...parseOptions,
      });
    }
    catch (error) {
      this.logger.logMessage(LogLevel.Error, `getData(): Error parsing '${dataUrl}' \
        \n\t line #: ${lineIndex} Error:`, error.message);
      window.showErrorMessage(`Unable to parse data file: '${dataUrl}'. \
        \n\t Line #: ${lineIndex} Error: ${error.message}`);
    }
    loadData(jsonUtils.convertJsonData(data));
  }

  /**
   * Gets data table names for data sources with multiple data sets.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataTableNames(dataUrl: string): Array<string> {
    return []; // none for edn data files
  }

  /**
   * Gets data schema in json format for file types that provide it.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataSchema(dataUrl: string): any {
    // TODO: auto-gen json schema ???
    return null; // none for edn data files
  }

  /**
   * Saves EDN data.
   * @param filePath Local data file path.
   * @param fileData Raw data to save.
   * @param tableName Table name for data files with multiple tables support.
   * @param showData Show saved data callback.
   */
  public saveData(filePath: string, fileData: any, tableName: string, showData?: Function): void {
    fileData = toEDNStringFromSimpleObject(fileData, {keysAs: 'keyword'});
    if ( fileData.length > 0) {
      // TODO: change this to async later
      fs.writeFile(filePath, fileData, (error) => showData ? showData(error) : null);
    }
  }

}
