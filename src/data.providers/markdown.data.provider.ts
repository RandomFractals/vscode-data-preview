import * as path from 'path';
import * as config from '../config';
import * as fileUtils from '../utils/file.utils';
import {Logger, LogLevel} from '../logger';
import {IDataProvider} from '../data.manager';
import {window} from 'vscode';

/**
 * Markdown tables data provider.
 */
export class MarkdownDataProvider implements IDataProvider {

  // TODO: add mime types later for http data loading
  public supportedDataFileTypes: Array<string> = ['.md'];

  private logger: Logger = new Logger('markdown.data.provider:', config.logLevel);

  // local table names cache with dataUrl/tableNames array key/values
  private dataTableNamesMap = {};

  /**
   * Creates data provider for Excel data files.
   */
  constructor() {
    this.logger.debug('created for:', this.supportedDataFileTypes);
  }

  /**
   * Gets local or remote markdown file table data.
   * @param dataUrl Local data file path or remote data url.
   */
  public getData(dataUrl: string, dataTable?: string): any {
    let content: string = '';
    try {
      // read markdown file content
      content = fileUtils.readDataFile(dataUrl, 'utf8');
      
      // convert it to to CSV for loading into data view
      content = this.markdownToCsv(dataUrl, content, dataTable);
    }
    catch (error) {
      this.logger.error(`getMarkdownData(): Error parsing '${dataUrl}'. \n\t Error: ${error.message}`);
      window.showErrorMessage(`Unable to parse data file: '${dataUrl}'. \n\t Error: ${error.message}`);
    }
    return content;
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
    // TODO: return md table headers row later ???
    return null; // none for .md data files
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

  /**
   * Converts markdown content to csv data for display in data view.
   * @param dataUrl Local data file path or remote data url.
   * @param markdownContent Markdown file content to convert to csv string.
   * @param dataTable Markdown data table name to load.
   */
  private markdownToCsv(dataUrl:string, markdownContent: string, dataTable: string): string {
    // extract markdown sections and tables
    const sections: Array<string> = markdownContent.split('\n#');
    const sectionMarker: RegExp = new RegExp(/(#)/g);
    const quotes: RegExp = new RegExp(/(")/g);
    const tableHeaderSeparator: RegExp = new RegExp(/((\|)|(\:)|(\-)|(\s))+/g);
    const tableRowMarkdown: RegExp = new RegExp(/((\|[^|\r\n]*)+\|(\r?\n|\r)?)/g);
    const tablesMap: any = {};
    let tableNames: Array<string> = [];
    sections.forEach(section => {
      // get section title
      let sectionTitle: string = '';
      const sectionLines: Array<string> = section.split('\n');
      if (sectionLines.length > 0) {
        sectionTitle = sectionLines[0].replace(sectionMarker, '').trim(); // strip out #'s and trim
      }

      // create section text blocks
      const textBlocks: Array<string> = [];
      let textBlock: string = '';
      sectionLines.forEach(textLine => {
        if (textLine.trim().length === 0) {
          // create new text block
          textBlocks.push(textBlock);
          textBlock = '';
        }
        else {
          // append to the current text block
          textBlock += textLine + '\n';
        }
      });

      // extract section table data from each section text block
      const tables: Array<Array<string>> = []; // two-dimensional array of table rows
      textBlocks.forEach(textBlock => {
        // extract markdown table data rows from a text block
        const tableRows: Array<string> = textBlock.match(tableRowMarkdown);
        if (tableRows) {
          // add matching markdown table rows to the tables array
          tables.push(tableRows);
          this.logger.debug('markdownToCsv(): section:', sectionTitle);
          this.logger.debug('markdownToCsv(): extractred markdown table rows:', tableRows);
        }  
      });

      // process markdown tables
      tables.forEach((table, tableIndex) => {
        // process markdown table row strings
        const tableRows: Array<string> = [];
        table.forEach(row => {
          // trim markdown table text row lines
          row = row.trim();
          // strip out leading | table row sign
          if (row.startsWith('| ')) {
            row = row.slice(2);
          }
          // strip out trailing | table row sign
          if (row.endsWith(' |')) {
            row = row.slice(0, row.length-2);
          }
          // check for a table header separator row
          const isTableHeaderSeparator: boolean = (row.replace(tableHeaderSeparator, '').length === 0);
          if (!isTableHeaderSeparator && row.length > 0) {
            // add data table row
            tableRows.push(row);
          }
        });

        if (tableRows.length > 0 ) {
          // create table title
          let tableTitle: string = sectionTitle;
          if (tables.length > 1) {
            // append table index
            tableTitle += '-table-' + (tableIndex + 1);
          }
          // update table list for data view display
          tablesMap[tableTitle] = tableRows;
          tableNames.push(tableTitle);
          this.logger.debug(`markdownToCsv(): created data table: '${tableTitle}' rows: ${tableRows.length}`);
        }
      }); // end of tables.forEach(row)
    }); // end of sections.forEach(textBlock/table)

    // get requested table data
    let table: Array<string> = tablesMap[tableNames[0]]; // default to 1st table in the loaded tables list
    if (dataTable && dataTable.length > 0) {
      table = tablesMap[dataTable];
      this.logger.debug(`markdownToCsv(): requested data table: '${dataTable}'`);
    }

    if (tableNames.length === 1) {
      // clear table names if only one markdown table is present
      tableNames = [];
    }
    // update table names cache
    this.dataTableNamesMap[dataUrl] = tableNames;

    // convert requested markdown table to csv for data view display
    let csvContent: string = '';
    if (table) {
      this.logger.debug('markdownToCsv(): markdown table rows:', table);
      table.forEach(row => {
        const cells: Array<string> = row.split(' | ');
        const csvCells: Array<string> = [];
        cells.forEach(cell => {
          cell = cell.trim();
          const cellHasQuotes: boolean = quotes.test(cell);
          if (cellHasQuotes) {
            // escape quotes for csv
            cell = cell.replace(quotes, '""'); // double quote for csv quote escape
          }
          if (cellHasQuotes || cell.indexOf(',') >= 0) {
            // quote cell string
            cell = `"${cell}"`;
          }
          csvCells.push(cell);
        });
        const csvRow = csvCells.join(',');
        csvContent += csvRow + '\n';
      });
      this.logger.debug('markdownToCsv(): final csv table content string for data.view load:\n', csvContent);
    }
    return csvContent;
  } // end of markdownToCsv()

}
