import * as fs from 'fs';
import {Table} from 'apache-arrow';
import * as config from '../config';
import * as fileUtils from '../utils/file.utils';
import {Logger} from '../logger';
import {IDataProvider} from '../data.manager';

/**
 * Arrow data provider.
 */
export class ArrowDataProvider implements IDataProvider {

  // TODO: add mime types later for http data loading
  public supportedDataFileTypes: Array<string> = ['.arr', '.arrow'];

  // local Arrow data view schema cache with dataUrl/schema key/mapping entries
  private dataSchemaMap = {};
  private logger: Logger = new Logger('arrow.data.provider:', config.logLevel);

  /**
   * Creates data provider for Apache Arrow data files.
   * @see https://arrow.apache.org/ for more info.
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
  public getData(dataUrl: string, parseOptions: any, loadData: Function): void {
    const dataFileType: string = dataUrl.substr(dataUrl.lastIndexOf('.')); // file extension

    // get binary arrow data
    const dataBuffer: Buffer = fileUtils.readDataFile(dataUrl);

    // create typed data array
    const dataArray: Uint8Array = new Uint8Array(dataBuffer);
    this.logger.debug('getData(): data size in bytes:', dataArray.byteLength.toLocaleString());

    // create arrow table
    const dataTable: Table = Table.from(dataArray);

    // remap arrow data schema to columns for data viewer
    const dataSchema = {};
    dataTable.schema.fields.map(field => {
      let fieldType: string = field.type.toString();
      const typesIndex: number = fieldType.indexOf('<');
      if (typesIndex > 0) {
        fieldType = fieldType.substring(0, typesIndex);
      }
      dataSchema[field.name] = config.dataTypes[fieldType];
    });
    // cache arrow data view schema
    this.dataSchemaMap[dataUrl] = dataSchema;

    // create Arrow schema.json file for data schema text data preview
    const dataSchemaFilePath: string = dataUrl.replace(dataFileType, '.schema.json');
    if (parseOptions.createJsonSchema && !fs.existsSync(dataSchemaFilePath)) {
      fileUtils.createJsonFile(dataSchemaFilePath, dataTable.schema);
    }

    // create arrow data.json for text arrow data preview
    let dataRows: Array<any> = [];
    const jsonFilePath: string = dataUrl.replace(dataFileType, '.json');
    if (parseOptions.createJsonFiles && !fs.existsSync(jsonFilePath)) {
      // convert arrow table data to array of objects (happens only on the 1st run :)
      dataRows = Array(dataTable.length);
      const fields = dataTable.schema.fields.map(field => field.name);
      for (let i=0, n=dataRows.length; i<n; ++i) {
        const proto = {};
        fields.forEach((fieldName, index) => {
          const column = dataTable.getColumnAt(index);
          proto[fieldName] = column.get(i);
        });
        dataRows[i] = proto;
      }
      fileUtils.createJsonFile(jsonFilePath, dataRows);
    }

    loadData(dataArray);
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
   * Saves raw Data Provider data.
   * @param filePath Data file path. 
   * @param fileData Raw data to save.
   * @param stringifyFunction Optional stringiy function override.
   */
  public saveData(filePath: string, fileData: any, stringifyFunction: Function): void {
    // TODO
  }
}
