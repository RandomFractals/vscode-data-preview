import {window} from 'vscode';
import * as fs from 'fs';
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
   * @param parseOptions Data parse options.
   * @param loadData Load data callback.
   */
  public getData(dataUrl: string, parseOptions: any, loadData: Function): void {
    let dataRows: Array<any> = [];
    const dataBlockDecoder: avro.streams.BlockDecoder = avro.createFileDecoder(dataUrl);
    dataBlockDecoder.on('metadata', (dataSchema: any) => {
      this.logger.debug('metadata', dataSchema);
      // create schema.json file for Avro metadata preview
      const dataSchemaFilePath: string = dataUrl.replace('.avro', '.schema.json');
      if (parseOptions.createJsonSchema && !fs.existsSync(dataSchemaFilePath)) {
        fileUtils.createJsonFile(dataSchemaFilePath, dataSchema);
      }
    });
		dataBlockDecoder.on('data', (data: any) => dataRows.push(data));
    dataBlockDecoder.on('end', () => {
      // create data json file for Avro text data preview
      const jsonFilePath: string = dataUrl.replace('.avro', '.json');
      if (parseOptions.createJsonFiles && !fs.existsSync(jsonFilePath)) {
        fileUtils.createJsonFile(jsonFilePath, dataRows);
      }
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
   * Saves Avro data.
   * @param filePath Local data file path.
   * @param fileData Raw data to save.
   * @param tableName Table name for data files with multiple tables support.
   * @param showData Show saved data callback.
   */
  public saveData(filePath: string, fileData: any, tableName: string, showData?: Function): void {
    // TODO
  }

}
