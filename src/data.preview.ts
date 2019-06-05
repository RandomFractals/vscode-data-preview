'use strict';
import { 
  window,
  workspace, 
  Disposable, 
  Uri, 
  ViewColumn, 
  WorkspaceFolder, 
  Webview,
  WebviewPanel, 
  WebviewPanelOnDidChangeViewStateEvent, 
  WebviewPanelSerializer
} from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as avro from 'avsc';
import * as snappy from 'snappy';
import * as xlsx from 'xlsx';
import {Table} from 'apache-arrow';
//import * as parquet from 'parquetjs';
import * as config from './config';
import {Logger, LogLevel} from './logger';
import {previewManager} from './preview.manager';
import {Template} from './template.manager';

/**
 * Data preview web panel serializer for restoring previews on vscode reload.
 */
export class DataPreviewSerializer implements WebviewPanelSerializer {

  private _logger: Logger;
  
  /**
   * Creates new webview serializer.
   * @param viewType Web view type.
   * @param extensionPath Extension path for loading scripts, examples and data.
   * @param htmlTemplate Webview preview html template.
   */
  constructor(private viewType: string, private extensionPath: string, private htmlTemplate: Template) {
    this._logger = new Logger(`${this.viewType}.serializer:`, config.logLevel);
  }

  /**
   * Restores webview panel on vscode reload for data previews.
   * @param webviewPanel Webview panel to restore.
   * @param state Saved web view panel state.
   */
  async deserializeWebviewPanel(webviewPanel: WebviewPanel, state: any) {
    if (config.logLevel === LogLevel.Debug) {
      this._logger.debug('deserializeWeviewPanel(): url:', state.uri.toString());
      this._logger.debug('deserializeWeviewPanel(): config:', state.config);
    }
    previewManager.add(
      new DataPreview(
        this.viewType,
        this.extensionPath, 
        Uri.parse(state.uri),
        state.config, // view config
        webviewPanel.viewColumn, 
        this.htmlTemplate,
        webviewPanel
    ));
  }
}

/**
 * Main data preview webview implementation for this vscode extension.
 */
export class DataPreview {
    
  protected _disposables: Disposable[] = [];
  private _extensionPath: string;
  private _uri: Uri;
  private _previewUri: Uri;
  private _fileName: string;
  private _fileExtension: string;
  private _title: string;
  private _html: string;
  private _schema: any;
  private _panel: WebviewPanel;
  private _logger: Logger;
  private _config: any = {};

  /**
   * Creates new data preview.
   * @param viewType Preview webview type, i.e. data.preview.
   * @param extensionPath Extension path for loading webview scripts, etc.
   * @param uri Source data file uri to preview.
   * @param viewConfig Data preview config.
   * @param viewColumn vscode IDE view column to display data preview in.
   * @param htmlTemplate Webview html template reference.
   * @param panel Optional webview panel reference for restore on vscode IDE reload.
   */
  constructor(
    viewType: string,
    extensionPath: string, 
    uri: Uri,
    viewConfig: any, 
    viewColumn: ViewColumn, 
    htmlTemplate: Template, 
    panel?: WebviewPanel) {

    // save ext path, document uri, config, and create prview uri
    this._extensionPath = extensionPath;
    this._uri = uri;
    this._config = viewConfig;
    this._fileName = path.basename(uri.fsPath);
    this._fileExtension = this._fileName.substr(this._fileName.lastIndexOf('.'));
    this._previewUri = this._uri.with({scheme: 'data'});
    this._logger = new Logger(`${viewType}:`, config.logLevel);

    // create preview panel title
    switch (viewType) {
      case 'data.preview':
        this._title = `Data Preview ${this._fileName} 🈸`;
        break;
      default: // TODO: data.help
        this._title = 'Data Help';
        break;
    }

    // create html template for data preview with local scripts, styles and theme params replaced
    const scriptsPath: string = Uri.file(path.join(this._extensionPath, 'scripts'))
      .with({scheme: 'vscode-resource'}).toString(true);
    const stylesPath: string = Uri.file(path.join(this._extensionPath, 'styles'))
      .with({scheme: 'vscode-resource'}).toString(true);
    this._html = htmlTemplate.replace({
      scripts: scriptsPath,
      styles: stylesPath,
      theme: this.theme,
      charts: this.charts
    });

    // initialize webview panel
    this._panel = panel;
    this.initWebview(viewType, viewColumn);
    this.configure();
  } // end of constructor()

  /**
   * Initializes data preview webview panel.
   * @param viewType Preview webview type, i.e. data.preview.
   * @param viewColumn vscode IDE view column to display preview in.
   */
  private initWebview(viewType: string, viewColumn: ViewColumn): void {
    if (!this._panel) {
      // create new webview panel
      this._panel = window.createWebviewPanel(viewType, this._title, viewColumn, this.getWebviewOptions());
    }

    // dispose preview panel handler
    this._panel.onDidDispose(() => {
      this.dispose();
    }, null, this._disposables);

    // TODO: handle view state changes later
    this._panel.onDidChangeViewState(
      (viewStateEvent: WebviewPanelOnDidChangeViewStateEvent) => {
      let active = viewStateEvent.webviewPanel.visible;
    }, null, this._disposables);

    // process web view messages
    this.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'refresh':
          // reload file data for preview
          this.refresh();
          break;
        case 'config':
          // save data viewer config for restore on code reload
          this._config = message.config;
          if (config.logLevel === LogLevel.Debug) {
            this._logger.debug('configUpdate(): config:', message.config);
          }
          break;
      }
    }, null, this._disposables);
  } // end of initWebview()

  /**
   * Creates webview options with local resource roots, etc
   * for data preview webview display.
   */
  private getWebviewOptions(): any {
    return {
      enableScripts: true,
      enableCommandUris: true,
      retainContextWhenHidden: true,
      localResourceRoots: this.getLocalResourceRoots()
    };
  }

  /**
   * Creates local resource roots for loading scripts in data preview webview.
   */
  private getLocalResourceRoots(): Uri[] {
    const localResourceRoots: Uri[] = [];
    const workspaceFolder: WorkspaceFolder = workspace.getWorkspaceFolder(this.uri);
    if (workspaceFolder) {
      localResourceRoots.push(workspaceFolder.uri);
    }
    else if (!this.uri.scheme || this.uri.scheme === 'file') {
      localResourceRoots.push(Uri.file(path.dirname(this.uri.fsPath)));
    }
    
    // add data preview js scripts
    localResourceRoots.push(Uri.file(path.join(this._extensionPath, 'scripts')));

    // add data preview styles
    localResourceRoots.push(Uri.file(path.join(this._extensionPath, 'styles')));

    this._logger.logMessage(LogLevel.Debug, 'getLocalResourceRoots():', localResourceRoots);
    return localResourceRoots;
  }

  /**
   * Configures webview html for preview.
   */
  public configure(): void {
    this.webview.html = this.html;
    // NOTE: let webview fire refresh message
    // when data preview DOM content is initialized
    // see: this.refresh();
  }

  /**
   * Reloads data preview on data file save changes or vscode IDE reload.
   */
  public refresh(): void {
    // reveal corresponding data preview panel
    this._panel.reveal(this._panel.viewColumn, true); // preserve focus

    // read and send updated data to webview
    // workspace.openTextDocument(this.uri).then(document => {
      this._logger.debug('refresh(): file:', this._fileName);
      //const textData: string = document.getText();
      let data = [];
      try {
        // get file data
        data = this.getFileData(this._fileName);
      }
      catch (error) {
        this._logger.logMessage(LogLevel.Error, 'refresh():', error.message);
        this.webview.postMessage({error: error});
      }
      this.loadData(data);
    // });
  }

  /**
   * Loads string or JSON data into data view.
   */
  private loadData(data: any): void {
    if (data === undefined || data.length <= 0) {
      // no valid data to load
      return;
    }    
    try {
        // update web view
        this.webview.postMessage({
          command: 'refresh',
          fileName: this._fileName,
          uri: this._uri.toString(),
          config: this.config,
          schema: this.schema,
          data: data
        });
    }
    catch (error) {
      this._logger.logMessage(LogLevel.Error, 'loadData():', error.message);
      this.webview.postMessage({error: error});
    }
  }

  /**
   * Loads actual local data file content.
   * @param filePath Local data file path.
   * @returns CSV/JSON string or Array of row objects.
   * TODO: change this to async later
   */
  private getFileData(filePath: string): any {
    let data: any = null;
    const dataFilePath = path.join(path.dirname(this._uri.fsPath), filePath);
    if (!fs.existsSync(dataFilePath)) {
      this._logger.logMessage(LogLevel.Error, 'getFileData():', `${filePath} doesn't exist!`);
      window.showErrorMessage(`${filePath} doesn't exist!`);
      return data;
    }

    // read file data
    // TODO: rework this to using fs.ReadStream for large data files support later
    switch (this._fileExtension) {
      case '.csv':
      case '.tsv':
      case '.txt':
      case '.tab':
      case '.json':
        data = fs.readFileSync(dataFilePath, 'utf8'); // file encoding to read data as string
        break;
      case '.xls':
      case '.xlsb':
      case '.xlsx':
      case '.xlsm':
      case '.slk':
      case '.ods':
      case '.prn':
        data = this.getBinaryExcelData(dataFilePath);
        break;
      case '.dif':
      case '.xml':
      case '.html':
        data = this.getTextExcelData(dataFilePath);
        break;
      case '.arrow':
        data = this.getArrowData(dataFilePath);
        break;
      case '.avro':
        data = this.getAvroData(dataFilePath);
        break;
      case '.parquet':
        // TODO: sort out node-gyp lzo lib loading for parquet data files parse
        window.showInformationMessage('Parquet data format support coming soon!');        
        //data = this.getParquetData(dataFilePath);
        break;
    }
    return data;
  } // end of getFileData()

  /**
   * Gets binary Excel file data.
   * @param dataFilePath Excel file path.
   * @returns Array of row objects.
   */  
  private getBinaryExcelData(dataFilePath: string): any[] {
    // load Excel workbook
    const workbook: xlsx.WorkBook = xlsx.readFile(dataFilePath, {
      type: 'binary',
      cellDates: true,
    });
    return this.getExcelData(workbook);
  }

  /**
   * Gets text Excel file data.
   * @param dataFilePath Excel file path.
   * @returns Array of row objects.
   */  
  private getTextExcelData(dataFilePath: string): any[] {
    // load Excel workbook
    const workbook: xlsx.WorkBook = xlsx.readFile(dataFilePath, {
      type: 'file',
      cellDates: true,
    });
    return this.getExcelData(workbook);
  }

  /**
   * Gets binary Excel file data.
   * @param workbook Excel workbook.
   * @returns Array of row objects.
   */
  private getExcelData(workbook: xlsx.WorkBook): any[] {
    this._logger.debug(`getExcelData(): file: ${this._fileName} sheetNames:`, workbook.SheetNames);
    // read first worksheet data rows
    let rows = [];
    const dataSchema = null;
    if (workbook.SheetNames.length > 0) {
      // get first worksheet row data
      // TODO: add option to preview data for all worksheets later
      const firstSheetName = workbook.SheetNames[0];
      const worksheet: xlsx.Sheet = workbook.Sheets[firstSheetName];
      rows = xlsx.utils.sheet_to_json(worksheet);
      this.createJsonFile(this._uri.toString().replace(this._fileExtension, '.json'), rows);
      this.logDataStats(dataSchema, rows);
    }
    return rows;
  }

  /**
   * Gets binary Arrow file data.
   * @param dataFilePath Arrow data file path.
   * @returns Array of row objects.
   */
  private getArrowData(dataFilePath: string): any[] {
    const dataBuffer = fs.readFileSync(dataFilePath);
    const dataTable: Table = Table.from(new Uint8Array(dataBuffer));
    const rows: Array<any> = Array(dataTable.length);
    const fields = dataTable.schema.fields.map(field => field.name);
    for (let i=0, n=rows.length; i<n; ++i) {
      const proto = {};
      fields.forEach((fieldName, index) => {
        const column = dataTable.getColumnAt(index);
        proto[fieldName] = column.get(i);
      });
      rows[i] = proto;
    }

    // remap arrow data schema to columns for data viewer
    this._schema = {};
    dataTable.schema.fields.map(field => {
      let fieldType: string = field.type.toString();
      const typesIndex: number = fieldType.indexOf('<');
      if (typesIndex > 0) {
        fieldType = fieldType.substring(0, typesIndex);
      }
      this._schema[field.name] = config.dataTypes[fieldType];
    });

    // initialized typed data set columns config
    // this._config['columns'] = dataTable.schema.fields.map(field => field.name);
    this.createJsonFile(this._uri.toString().replace(this._fileExtension, '.json'), rows);
    this.createJsonFile(this._uri.toString().replace(this._fileExtension, '.schema.json'), dataTable.schema);
    this.logDataStats(dataTable.schema, rows);
    return rows;
  } // end of getArrowData()

  /**
   * Gets binary Avro file data.
   * @param dataFilePath Avro data file path.
   * @returns Array of row objects.
   */
  private getAvroData(dataFilePath: string): any[] {
    let dataRows: Array<any> = [];
    let dataSchema: any = {};
    let rows: Array<any> = [];
    const dataBlockDecoder: avro.streams.BlockDecoder = avro.createFileDecoder(dataFilePath);
    dataBlockDecoder.on('metadata', (type: any) => dataSchema = type);
		dataBlockDecoder.on('data', (data: any) => dataRows.push(data));
    dataBlockDecoder.on('end', () => {
      rows = dataRows.map(rowObject => this.flattenObject(rowObject));
      const fileExt: string = this._fileName.substr(this._fileName.lastIndexOf('.'));
      this.createJsonFile(this._uri.toString().replace(this._fileExtension, '.json'), dataRows);
      this.createJsonFile(this._uri.toString().replace(this._fileExtension, '.schema.json'), dataSchema);
      this.logDataStats(dataSchema, rows);
      // update web view
      this.loadData(rows);
    });
    return rows;
  }

  /**
   * Gets binary Parquet file data.
   * @param dataFilePath Parquet data file path.
   * @returns Array of row objects.
   */ /*
  private async getParquetData(dataFilePath: string) {
    let dataRows: Array<any> = [];
    let dataSchema: any = {};
    let rows: Array<any> = [];
    const parquetReader = await parquet.ParquetReader.openFile(dataFilePath);
    const cursor = parquetReader.getCursor();
    // read all records
    let record = null;
    while (record = await cursor.next()) {
      dataRows.push(record);
    }
    await parquetReader.close();
    rows = dataRows.map(rowObject => this.flattenObject(rowObject));    
    this.logDataStats(dataSchema, rows);
    // update web view
    this.loadData(rows);
    return rows;
  } */

  /**
   * Flattens objects with nested properties for data view display.
   * @param obj Object to flatten.
   * @returns Flat Object.
   */
  private flattenObject (obj: any): any {
    const flatObject: any = {};
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        Object.assign(flatObject, this.flattenObject(obj[key]));
      } else {
        flatObject[key] = obj[key];
      }
    });
    return flatObject;
  }

  /**
   * Logs data stats for debug.
   * @param dataSchema metadata.
   * @param dataRows data rows.
   */
  private logDataStats(dataSchema: any, dataRows: Array<any>): void {
    if (config.logLevel === LogLevel.Debug) {
      if (dataSchema !== null) {
        this._logger.debug(`logDataStats(): ${this._fileName} data schema:`, dataSchema);
        this._logger.debug('logDataStats(): data view schema:', this._schema);
      }
      this._logger.debug('logDataStats(): records count:', dataRows.length);
      if (dataRows.length > 0) {
        const firstRow = dataRows[0];
        this._logger.debug('logDataStats(): 1st row:', firstRow);
      }
    }
  }

  /**
   * Creates JSON data or schema file.
   * @param jsonFilePath Json file path.
   * @param jsonData Json file data.
   */
  private createJsonFile(jsonFilePath: string, jsonData: any): void {
    const jsonString: string = JSON.stringify(jsonData, null, 2);
    if (!fs.existsSync(jsonFilePath)) {
      fs.writeFile(jsonFilePath, jsonString, (error) => {
        if (error) {
          const errorMessage: string = `Failed to save file: ${jsonFilePath}`;
          this._logger.logMessage(LogLevel.Error, 'crateJsonFile():', errorMessage);
          window.showErrorMessage(errorMessage);
        }
      });
    }
  }

  /**
   * Disposes this preview resources.
   */
  public dispose() {
    previewManager.remove(this);
    this._panel.dispose();
    while (this._disposables.length) {
      const item = this._disposables.pop();
      if (item) {
        item.dispose();
      }
    }
  }

  /**
   * Gets preview panel visibility status.
   */
  get visible(): boolean {
    return this._panel.visible;
  }

  /**
   * Gets the underlying webview instance for this preview.
   */
  get webview(): Webview {
    return this._panel.webview;
  }
    
  /**
   * Gets the source data doc uri for this preview.
   */
  get uri(): Uri {
    return this._uri;
  }

  /**
   * Gets the preview uri to load on data preview command triggers or vscode IDE reload. 
   */
  get previewUri(): Uri {
    return this._previewUri;
  }
  
  /**
   * Gets the html content to load for this preview.
   */
  get html(): string {
    return this._html;
  }

  /**
   * Gets data viewer config for data preview settings restore on vscode reload.
   */
  get config(): any {
    return this._config;
  }

  /**
   * Gets data schema for typed data sets.
   */
  get schema(): any {
    return this._schema;
  }

  /**
   * Gets UI theme to use for Data Preview display from workspace config.
   * see package.json 'configuration' section for more info.
   */
  get theme(): string {
    return <string>workspace.getConfiguration('data.preview').get('theme');
  }
  /**
   * Gets charts plugin preference for Data Preview display from workspace config.
   * see package.json 'configuration' section for more info.
   */
  get charts(): string {
    return <string>workspace.getConfiguration('data.preview').get('charts.plugin');
  }

  get createJsonFiles(): boolean {
    return <boolean>workspace.getConfiguration('data.preview').get('create.json.files');
  }
}
