import {window} from 'vscode';
import * as fs from 'fs';
import * as config from '../config';
import * as fileUtils from '../utils/file.utils';
import * as jsonUtils from '../utils/json.utils';
import {Logger, LogLevel} from '../logger';
import {IDataProvider} from '../data.manager';

/**
 * JSON Line data provider.
 * @see http://jsonlines.org/
 */
export class JsonLineDataProvider implements IDataProvider {

  // TODO: add mime types later for http data loading
  public supportedDataFileTypes: Array<string> = ['.jsonl', '.ndjson'];  
  private logger: Logger = new Logger('json.line.data.provider:', config.logLevel);

  /**
   * Creates new JSON Line data provider for .jsonl and .ndjson data files.
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
      const jsonLines: Array<string> = content.split('\n');
      jsonLines.forEach(jsonLine => {
        const trimmedJsonLine: string = jsonLine.trim();
        if (trimmedJsonLine.length > 0) {
          data.push(JSON.parse(trimmedJsonLine));
        }
        lineIndex++;
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
    return []; // none for json data files
  }

  /**
   * Gets data schema in json format for file types that provide it.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataSchema(dataUrl: string): any {
    // TODO: auto-gen json schema ???
    return null; // none for json data files
  }

  /**
   * Saves JSON data.
   * @param filePath Local data file path.
   * @param fileData Raw data to save.
   * @param tableName Table name for data files with multiple tables support.
   * @param showData Show saved data callback.
   */
  public saveData(filePath: string, fileData: any, tableName: string, showData?: Function): void {
    fileData = JSON.stringify(fileData, null, 2);
    if ( fileData.length > 0) {
      // TODO: change this to async later
      fs.writeFile(filePath, fileData, (error) => showData(error));
    }
  }

}
