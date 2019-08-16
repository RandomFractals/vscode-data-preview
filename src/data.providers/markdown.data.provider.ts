import * as fs from 'fs';
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
   * @param parseOptions Data parse options.
   * @param loadData Load data callback.
   */
  public getData(dataUrl: string, parseOptions: any, loadData: Function): void {
    let content: string = '';
    try {
      // read markdown file content
      content = fileUtils.readDataFile(dataUrl, 'utf8');
      
      // convert it to to CSV for loading into data view
      content = this.markdownToCsv(dataUrl, content, parseOptions.dataTable);
    }
    catch (error) {
      this.logger.error(`getMarkdownData(): Error parsing '${dataUrl}'. \n\t Error: ${error.message}`);
      window.showErrorMessage(`Unable to parse data file: '${dataUrl}'. \n\t Error: ${error.message}`);
    }
    loadData(content);
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
   * Saves CSV as markdown table data.
   * @param filePath Local data file path.
   * @param fileData Raw data to save.
   * @param tableName Table name for data files with multiple tables support.
   * @param showData Show saved data callback.
   */
  public saveData(filePath: string, fileData: any, tableName: string, showData?: Function): void {
    // convert CSV text to markdown table
    fileData = this.csvToMarkdownTable(fileData);
    if ( fileData.length > 0) {
      // TODO: change this to async later
      fs.writeFile(filePath, fileData, (error) => showData(error));
    }
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

  /**
   * Converts CSV to markdown table.
   * @param {string} csvContent Csv/tsv data content.
   * @param {string} delimiter Csv/tsv delimiter.
   * @param {boolean} hasTableHeaderRow Has table header row.
   * @returns {string} Markdown table content.
   */
  private csvToMarkdownTable(csvContent: string, delimiter: string = ',', hasTableHeaderRow: boolean = true) : string {
    if (delimiter !== '\t') {
      // replace all tabs with spaces
      csvContent = csvContent.replace(/\t/g, '    ');
    }

    // extract table rows and data from csv content
    const csvRows: Array<string> = csvContent.split('\n');
    const tableData: string[][] = [];
    const maxColumnLength: number[] = []; // for pretty markdown table cell spacing
    const cellRegExp: RegExp = new RegExp(delimiter + '(?![^"]*"\\B)');
    const doubleQuotes: RegExp = new RegExp(/("")/g);
    this.logger.debug('csvToMarkdownTable(): csv rows:', csvRows);
    csvRows.forEach((row, rowIndex) => {
      if (typeof tableData[rowIndex] === 'undefined') {
        // create new table row cells data array
        tableData[rowIndex] = [];
      }
      // extract row cells data from csv text line
      const cells: Array<string> = row.replace('\r', '').split(cellRegExp);
      cells.forEach((cell, columnIndex) => {
        if (typeof maxColumnLength[columnIndex] === 'undefined') {
          // set initial column size to 0
          maxColumnLength[columnIndex] = 0;
        }

        // strip out leading and trailing quotes
        if (cell.startsWith('"')) {
          cell = cell.substring(1);
        }
        if (cell.endsWith('"')) {
          cell = cell.substring(0, cell.length - 1);
        }

        // replace escaped double quotes that come from csv text data format
        cell = cell.replace(doubleQuotes, '"');

        // update max column length for pretty markdwon table cells spacing
        maxColumnLength[columnIndex] = Math.max(maxColumnLength[columnIndex], cell.length);

        // save extracted cell data for table rows output
        tableData[rowIndex][columnIndex] = cell;
      });
    });

    // create markdown table header and separator text lines
    let tableHeader: string = '';
    let tableHeaderSeparator: string = '';
    maxColumnLength.forEach((columnLength) => {
      const columnHeader = Array(columnLength + 1 + 2);
      tableHeader += '|' + columnHeader.join(' ');
      tableHeaderSeparator += '|' + columnHeader.join('-');
    });
    // end table header and separator text lines
    tableHeader += '| \n';
    tableHeaderSeparator += '| \n';
    if (hasTableHeaderRow) {
      // reset: use table data instead
      tableHeader = '';
    }

    // create markdown table data text lines
    let tableRows = '';
    tableData.forEach((row, rowIndex) => {
      maxColumnLength.forEach((columnLength, columnIndex) => {
        const cellData: string = typeof row[columnIndex] === 'undefined' ? '' : row[columnIndex];
        const cellSpacing: string = Array((columnLength - cellData.length) + 1).join(' ');
        const cellString: string = `| ${cellData}${cellSpacing} `;
        if (hasTableHeaderRow && rowIndex === 0) {
          tableHeader += cellString;
        } else {
          tableRows += cellString;
        }
      });
    
  // end table header or data row text line
      if (hasTableHeaderRow && rowIndex === 0) {
        tableHeader += '| \n';
      } else {
        tableRows += '| \n';
      }
    });

    return `${tableHeader}${tableHeaderSeparator}${tableRows}`;
  } // end of csvToMarkdownTable()

}
