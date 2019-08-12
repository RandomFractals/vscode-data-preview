import {window} from 'vscode';
import * as path from 'path';
import * as avro from 'avsc';
import * as config from '../config';
import * as fileUtils from '../utils/file.utils';
import * as jsonUtils from '../utils/json.utils';
import {Logger, LogLevel} from '../logger';
import {IDataProvider} from '../data.manager';

/**
 * Avro data provider.
 */
export class AvroDataProvider implements IDataProvider {

  // TODO: add mime types later for http data loading
  public supportedDataFileTypes: Array<string> = ['.avro'];

  private logger: Logger = new Logger('avro.data.provider:', config.logLevel);

  /**
   * Creates data provider for Avro data files.
   */
  constructor() {
    this.logger.debug('created for:', this.supportedDataFileTypes);
  }

  /**
   * Gets local or remote Avro file data.
   * @param dataUrl Local data file path or remote data url.
   * @param dataTable Data table name for data sources with multiple data sets.
   * @param loadData Load data callback.
   */
  public getData(dataUrl: string, dataTable: string = '', loadData: Function): void {
    let dataSchema: any = {};
    let dataRows: Array<any> = [];
    const dataBlockDecoder: avro.streams.BlockDecoder = avro.createFileDecoder(dataUrl);
    dataBlockDecoder.on('metadata', (type: any) => {
      dataSchema = type;
      this.logger.debug('metadata', dataSchema);
    });
		dataBlockDecoder.on('data', (data: any) => dataRows.push(data));
    dataBlockDecoder.on('end', () => {
      // Note: flatten data rows for now since Avro format has hierarchical data structure
      dataRows = dataRows.map(rowObject => jsonUtils.flattenObject(rowObject));
      loadData(dataRows);
    });
  } // end of getData()

  /**
   * Gets data table names for data sources with multiple data sets.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataTableNames(dataUrl: string): Array<string> {
    return []; // none for Avro data for now
  }

  /**
   * Gets data schema in json format for file types that provide it.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataSchema(dataUrl: string): any {
    // TODO: convert avro metadata to data view schema
    return null; // none for avro data files
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
