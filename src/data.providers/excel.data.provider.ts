import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import * as config from '../config';
import * as fileUtils from '../utils/file.utils';
import {Logger} from '../logger';
import {IDataProvider} from '../data.manager';

/**
 * Excel data provider.
 */
export class ExcelDataProvider implements IDataProvider {

  // TODO: add mime types later for http data loading
  public supportedDataFileTypes: Array<string> = 
    ['.dif', '.ods', '.xls', '.xlsb', '.xlsm', '.xlsx', '.xml', '.html'];

  private logger: Logger = new Logger('excel.data.provider:', config.logLevel);

  // local table names cache with dataUrl/tableNames array key/values
  private dataTableNamesMap = {};

  /**
   * Creates data provider for Excel data files.
   */
  constructor() {
    this.logger.debug('created for:', this.supportedDataFileTypes);
  }

  /**
   * Gets local or remote Excel file data.
   * @param dataUrl Local data file path or remote data url.
   * @param parseOptions Data parse options.
   * @param loadData Load data callback.
   */
  public getData(dataUrl: string, parseOptions: any, loadData: Function): void {
    // load Excel workbook
    const dataFileName: string = path.basename(dataUrl);
    const dataFileType: string = dataUrl.substr(dataUrl.lastIndexOf('.')); // file extension
    const dataBuffer: Buffer = fileUtils.readDataFile(dataUrl);
    const workbook: xlsx.WorkBook = xlsx.read(dataBuffer, {
      cellDates: true,
    });

    // load data sheets
    let dataRows: Array<any> = [];
    this.dataTableNamesMap[dataUrl] = [];
    if (workbook.SheetNames.length > 0) {
      if (workbook.SheetNames.length > 1) {
        // cache sheet names
        this.dataTableNamesMap[dataUrl] = workbook.SheetNames;
        this.logger.debug(`getData(): file: ${dataFileName} sheetNames:`, workbook.SheetNames);
      }

      // determine spreadsheet to load
      let sheetName:string = workbook.SheetNames[0];
      if (parseOptions.dataTable.length > 0 && 
          workbook.SheetNames.indexOf(parseOptions.dataTable) >= 0) {
        // reset to requested table name
        sheetName = parseOptions.dataTable;
      }
      
      // get worksheet data row objects array
      const worksheet: xlsx.Sheet = workbook.Sheets[sheetName];
      dataRows = xlsx.utils.sheet_to_json(worksheet);

      // create json data file for binary Excel file text data preview
      if (parseOptions.createJsonFiles && config.supportedBinaryDataFiles.test(dataFileName)) {
        // create json data file path
        let jsonFilePath: string = dataUrl.replace(dataFileType, '.json');
        if (parseOptions.dataTable.length > 0 && workbook.SheetNames.length > 1) {          
          // append table name to the generated json data file name
          jsonFilePath = jsonFilePath.replace('.json', `-${parseOptions.dataTable}.json`);
        }
        if (!fs.existsSync(jsonFilePath)) {
          fileUtils.createJsonFile(jsonFilePath, dataRows);
        }
      }
    }    
    loadData(dataRows);
  } // end of getData()

  /**
   * Gets data table names for data sources with multiple data sets.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataTableNames(dataUrl: string): Array<string> {
    return this.dataTableNamesMap[dataUrl];
  }

  /**
   * Gets data schema in json format for file types that provide it.
   * @param dataUrl Local data file path or remote data url.
   */
  public getDataSchema(dataUrl: string): any {
    // TODO: return headers row for Excel data ???
    return null; // none for Excel data files
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
