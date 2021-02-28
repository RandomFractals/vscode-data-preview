import * as fs from 'fs';
import {ParquetSchema, ParquetWriter, ParquetReader} from 'parquets';
import * as config from '../config';
import * as fileUtils from '../utils/file.utils';
import {Logger} from '../logger';
import {IDataProvider} from '../data.manager';

/**
 * Parquet data provider.
 */
export class ParquetDataProvider implements IDataProvider {

  // TODO: add mime types later for http data loading
  public supportedDataFileTypes: Array<string> = ['.parq', '.parquet'];

  // local Arrow data view schema cache with dataUrl/schema key/mapping entries
  private dataSchemaMap = {};
  private logger: Logger = new Logger('parquet.data.provider:', config.logLevel);

  /**
   * Creates data provider for Parquet data files.
   * @see https://github.com/apache/parquet-format for more info.
   */
  constructor() {
    this.logger.debug('created for:', this.supportedDataFileTypes);
  }

  /**
   * Gets local or remote binary Arrow file data.
   * @param dataUrl Local data file path or remote data url.
   * @param parseOptions Data parse options.
   * @param loadData Load data callback.
   */
  public async getData(dataUrl: string, parseOptions: any, loadData: Function): Promise<void> {
    const dataFileType: string = dataUrl.substr(dataUrl.lastIndexOf('.')); // file extension
    
    // read parquet data
    let dataRows: Array<any> = [];
    let reader = await ParquetReader.openFile(dataUrl);
    let cursor = reader.getCursor();
    let record = null;
    while (record = await cursor.next()) {
      dataRows.push(record);
    }
    await reader.close();

    // create parquet data.json for text data preview
    const jsonFilePath: string = dataUrl.replace(dataFileType, '.json');
    if (parseOptions.createJsonFiles && !fs.existsSync(jsonFilePath)) {
      fileUtils.createJsonFile(jsonFilePath, dataRows);
    }

    loadData(dataRows);
  } // end of getData()

  /**
   * Gets data table names for data sources with multiple data sets.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataTableNames(dataUrl: string): Array<string> {
    return []; // none for Arrow data for now
  }

  /**
   * Gets data schema in json format for file types that provide it.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataSchema(dataUrl: string): any {
    return this.dataSchemaMap[dataUrl];
  }

  /**
   * Saves parquet data.
   * @param filePath Local data file path.
   * @param fileData Raw data to save.
   * @param tableName Table name for data files with multiple tables support.
   * @param showData Show saved data callback.
   */
  public saveData(filePath: string, fileData: any, tableName: string, showData?: Function): void {
    fileData = Buffer.from(fileData);
    this.logger.debug('saveData(): arrow parquet data size in bytes:', fileData.byteLength.toLocaleString());
    if ( fileData.length > 0) {
      // TODO: change this to async later
      fs.writeFile(filePath, fileData, (error) => showData(error));
    }
  }

}
