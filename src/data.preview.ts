'use strict';

// vscode imports
import {
  commands, 
  window,
  workspace, 
  Disposable,
  StatusBarItem, 
  Uri, 
  ViewColumn, 
  WorkspaceFolder, 
  Webview,
  WebviewPanel, 
  WebviewPanelOnDidChangeViewStateEvent, 
  WebviewPanelSerializer
} from 'vscode';

// fs data parsing imports
import * as fs from 'fs';
import * as path from 'path';
import {Table} from 'apache-arrow';
import * as avro from 'avsc';
import * as hjson from 'hjson';
import * as json5 from 'json5';
import * as xlsx from 'xlsx';
import * as yaml from 'js-yaml';
import * as snappy from 'snappy';
import * as props from 'properties';
//import * as parquet from 'parquetjs';

// local ext. imports
import * as config from './config';
import * as fileUtils from './utils/file.utils';
import * as jsonUtils from './utils/json.utils';
import {Logger, LogLevel} from './logger';
import {dataManager} from './data.manager';
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
   * @param status Status bar item for data loading updates.
   */
  constructor(private viewType: string, private extensionPath: string, 
    private htmlTemplate: Template, 
    private status: StatusBarItem) {
    const logLevel: string = <string>workspace.getConfiguration('data.preview').get('log.level');
    this._logger = new Logger(`${this.viewType}.serializer:`, 
      (logLevel === 'info') ? LogLevel.Info: LogLevel.Debug);
  }

  /**
   * Restores webview panel on vscode reload for data previews.
   * @param webviewPanel Webview panel to restore.
   * @param state Saved web view panel state.
   */
  async deserializeWebviewPanel(webviewPanel: WebviewPanel, state: any) {
    const dataTable: string = state.table;
    this.status.text = '🈸 Restoring data preview...';
    this._logger.debug(`deserializeWeviewPanel(): \n data table: '${dataTable}' \n data url:`, 
      state.uri.toString());
    this._logger.debug(`deserializeWeviewPanel(): config:`, state.config);
    this._logger.debug(`deserializeWeviewPanel(): views:`, state.views);

    // create new data preview
    const dataPreview: DataPreview = new DataPreview(
      this.viewType,
      this.extensionPath, 
      Uri.parse(state.uri),
      dataTable,
      state.config, // data view config
      state.views, // other data views for data files with multiple data sets
      webviewPanel.viewColumn, 
      this.htmlTemplate,
      webviewPanel
    );

    // set status bar item for data load updates
    dataPreview.status = this.status;

    // add new data preview to preview manager for config updates, etc.
    previewManager.add(dataPreview);
  }
} // end of DataPreviewSerializer()

/**
 * Main data preview webview implementation for this vscode extension.
 */
export class DataPreview {

  // webview vars
  protected _disposables: Disposable[] = [];
  private _extensionPath: string;
  private _uri: Uri;
  private _previewUri: Uri;
  private _fileName: string;
  private _fileExtension: string;
  private _fileSize: number;
  private _title: string;
  private _html: string;
  private _panel: WebviewPanel;
  private _status: StatusBarItem;
  private _logger: Logger;

  // data view vars
  private _dataUrl: string;
  private _dataSchema: any;
  private _isRemoteData: boolean = false;
  private _tableNames: Array<string> = [];
  private _dataViews: any = {};
  private _viewConfig: any = {};
  private _dataTable: string = '';
  private _rowCount: number = 0;
  private _columns: string[] = [];
  private _charts: string = 'd3fc';
  private _dataLoadStartTime: Date = new Date();
  private _dataLoadEndTime: Date = new Date(this._dataLoadStartTime.getTime());

  /**
   * Creates new data preview.
   * @param viewType Preview webview type, i.e. data.preview.
   * @param extensionPath Extension path for loading webview scripts, etc.
   * @param uri Source data file uri to preview.
   * @param table Data table name.
   * @param viewConfig Data view config.
   * @param views Other data table views.
   * @param viewColumn vscode IDE view column to display data preview in.
   * @param htmlTemplate Webview html template reference.
   * @param panel Optional webview panel reference for restore on vscode IDE reload.
   */
  constructor(
    viewType: string,
    extensionPath: string, 
    uri: Uri,
    table: string,
    viewConfig: any,
    views: any,
    viewColumn: ViewColumn, 
    htmlTemplate: Template, 
    panel?: WebviewPanel) {
    
    // save ext path, document uri, view config, preview uri, title, etc.
    this._extensionPath = extensionPath;
    this._uri = uri;
    this._dataUrl = uri.toString(true); // skip uri encoding
    this._isRemoteData = (this._dataUrl.startsWith('http://') || this._dataUrl.startsWith('https://'));
    this._dataTable = (table !== undefined) ? table: '';
    this._dataViews = (views !== undefined) ? views: {};
    this._viewConfig = viewConfig;
    this._fileName = path.basename(uri.fsPath);    
    this._fileExtension = this._fileName.substr(this._fileName.lastIndexOf('.'));
    this._previewUri = this._uri.with({scheme: 'data'});
    this._title = `${this._fileName}`;

    // initilize charts plugin
    this._charts = this.charts;
    if (viewConfig && viewConfig.hasOwnProperty('view') && viewConfig.view.startsWith('d3')) {
      // reset it to highcharts for older ext v.s configs
      this._charts = 'highcharts';
    }

    // initialize data preview logger
    this._logger = new Logger(`${viewType}:`, (this.logLevel === 'info') ? LogLevel.Info: LogLevel.Debug);
    this._logger.debug(`(): creating data.preview... \n theme: '${this.theme}' \n charts: '${this._charts}' \
      \n dataUrl:`, this._dataUrl);

    // create html template for data preview with local scripts, styles and theme params replaced
    const scriptsPath: string = Uri.file(path.join(this._extensionPath, 'scripts'))
      .with({scheme: 'vscode-resource'}).toString(true);
    const stylesPath: string = Uri.file(path.join(this._extensionPath, 'styles'))
      .with({scheme: 'vscode-resource'}).toString(true);
    this._html = htmlTemplate.replace({
      title: this._fileName,
      scripts: scriptsPath,
      styles: stylesPath,
      theme: this.theme,
      themeColor: (this.theme === '.dark') ? '#2f3136': '#eee', // for viewer dropdowns background
      charts: this._charts
    });

    // initialize webview panel
    this._panel = panel;
    this.initWebview(viewType, viewColumn);
    this.configure();
  } // end of constructor()

  /**
   * Updates data preview status bar item text.
   */
  private updateStatus(statusMessage: string): void {
    this._status.text = `🈸 ${statusMessage}`;
  }

  /**
   * Disposes this data preview resources.
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

  /*---------------------- Data Preview Initialization Methods ---------------------------------*/

  /**
   * Initializes data preview webview panel.
   * @param viewType Preview webview type, i.e. data.preview.
   * @param viewColumn vscode IDE view column to display preview in.
   */
  private initWebview(viewType: string, viewColumn: ViewColumn): void {    
    if (!this._panel) {
      // create new webview panel
      this._panel = window.createWebviewPanel(viewType, this._title, viewColumn, this.getWebviewOptions());
      this._panel.iconPath = Uri.file(path.join(this._extensionPath, './images/data-preview.svg'));
    }
    this._logger.debug('initWebview(): data.view created!');

    // dispose preview panel handler
    this._panel.onDidDispose(() => {
      this.dispose();
    }, null, this._disposables);

    // handle view state changes
    this._panel.onDidChangeViewState(
      (viewStateEvent: WebviewPanelOnDidChangeViewStateEvent) => {
      let active = viewStateEvent.webviewPanel.visible;
      if (!active) {
        // hide data preview status display
        this._status.hide();
      } else {
        // show data preview status display
        this._status.show();
        this._status.tooltip = `Data Stats for: ${this._fileName}`;
        // update status bar data stats
        this.updateStats(this._columns, this._rowCount);
      }
    }, null, this._disposables);

    // load matching view config, if available
    const viewConfigFilePath:string = this._dataUrl.replace(this._fileExtension, '.config');
    if (!this._isRemoteData && !this._viewConfig.hasOwnProperty('view') && // is a blank view config
      fs.existsSync(viewConfigFilePath)) {
      this.loadConfigFromFile(viewConfigFilePath, false, false); // don't refresh data, don't show errors
    }

    // process web view messages
    this.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'getDataInfo':
          // post initial data view info
          this.postDataInfo();
          break;
        case 'refresh':
          // reload file data for preview
          this.refresh(message.table);
          break;
        case 'config':
          // save data viewer config for restore on vscode reload
          this.updateConfig(message.config, message.table);
          break;
        case 'stats':
          // update data preview status bar item
          // with loaded rows count and columns info
          this.updateStats(message.columns, message.rowCount);
          break;
        case 'saveData':
          // saves data view config, or filtered .arrow, .csv, .json(s), .md, .yml, etc. data
          this.saveData(message.data, message.fileType);
          break;
        case 'openFile':
          // shows open file dialog for lauching new data preview
          this.openFile();
          break;
        case 'loadView':
          // launch new view
          this.loadView(message.viewName, message.uri);
          break;
        case 'loadConfig':
          // prompts to load saved data view config
          this.loadConfig();
          break;
        case 'undoConfig':
          // TODO: implement view config undo
          break;
        case 'redoConfig':
          // TODO: implement view config redo
          break;    
      }
    }, null, this._disposables);
  } // end of initWebview()

  /**
   * Sends initial data info to data view.
   */
  private postDataInfo(): void {
    this._logger.debug('postDataInfo(): \n dataUrl:', this._dataUrl);
    try {
      // update web view
      this.webview.postMessage({
        command: 'dataInfo',
        fileName: this._fileName,
        uri: this._dataUrl,
        config: this.config,
        schema: this.schema,
        tableNames: this._tableNames,
        views: this._dataViews,
        table: this._dataTable,
        logLevel: this.logLevel
      });
    }
    catch (error) {
      this._logger.error('postDataInfo(): Error:\n', error.message);
    }
  }

  /**
   * Updates data preivew status bar item with loaded data rows count,
   * columns info and loaded data file size in bytes on data view update.
   * @param columns Displayed columns array.
   * @param rowCount Loaded data rows count.
   */
  private updateStats(columns, rowCount) {
    // update columns and rows state vars
    this._columns = columns;
    this._rowCount = rowCount;
    let dataStats: string = `Rows: ${rowCount.toLocaleString()}\tColumns: ${columns.length.toLocaleString()}`;
    if (this._tableNames.length > 0) {
      // add tables count to data preview data stats status display
      dataStats = `Tables: ${this._tableNames.length.toLocaleString()}\t${dataStats}`;
    }
    if (this._dataLoadStartTime.getTime() === this._dataLoadEndTime.getTime()) {
      // update data load time
      this._dataLoadEndTime = new Date();
    }
    const dataLoadTime: number = Math.round(
      (this._dataLoadEndTime.getTime() - this._dataLoadStartTime.getTime()) / 1000 // msecs
    );
    const fileSizeString: string = fileUtils.formatBytes(this._fileSize, 2); // decimals
    this.updateStatus(
      `${dataStats}\tFileSize: ${fileSizeString}\tLoadTime: ${dataLoadTime.toLocaleString()} sec`);
  }

  /**
   * Shows open file dialog for launchign new data preview.
   */
  private async openFile() {
    // display open file dialog
    let openFolderUri: Uri = Uri.parse(this._dataUrl).with({scheme: 'file'});
    const workspaceFolders: Array<WorkspaceFolder> = workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length >= 1) {
      // change open file folder uri to the 1st workspace folder, usuallay workspace root
      openFolderUri = workspaceFolders[0].uri;
    }
    const selectedFiles: Array<Uri> = await window.showOpenDialog({
      defaultUri: openFolderUri,
      canSelectMany: false,
      canSelectFolders: false, 
      filters: config.supportedFilesFilters
    });
    if (selectedFiles && selectedFiles.length >= 1) {
      // launch new data preview for the selected data file
      this.loadView('data.preview', selectedFiles[0].fsPath);
    }
  }

  /**
   * Launches new view via commands.executeCommand interface.
   * @param viewName View name to launch.
   * @param url View document url parameter.
   * @see https://code.visualstudio.com/api/extension-guides/command
   */
  private loadView(viewName: string, url: string): void {
    const fileUri: Uri = Uri.parse(url);
    try {
      this._logger.debug(`loadView(): loading view... \n ${viewName}`, fileUri.toString(true)); // skip encoding
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // launch requested remote data view command
        this._logger.debug(`loadView():executeCommand: \n ${viewName}`, url);
        commands.executeCommand(viewName, fileUri);
      }
      else if (fs.existsSync(fileUri.fsPath)) {
        // launch requested local data view command
        this._logger.debug(`loadView():executeCommand: \n ${viewName}`, fileUri.fsPath);
        commands.executeCommand(viewName, fileUri);
      } 
      else {
        // try to find requested data file(s) in open workspace
        workspace.findFiles(`**/${url}`).then(files => {
          if (files.length > 0) {
            // pick the 1st matching file from the workspace
            const dataUri: Uri = files[0];
            // launch requested view command
            this._logger.debug(`loadView():executeCommand: \n ${viewName}`, dataUri.toString(true)); // skip encoding
            commands.executeCommand(viewName, dataUri);
          } else {
            this._logger.error(`loadView(): Error:\n no such files in this workspace:`, url);
            window.showErrorMessage(`No '**/${url}' file(s) found in this workspace!`);
          }
        });
      }
    } catch (error) {
      this._logger.error(`loadView(${url}): Error:\n`, error.message);
      window.showErrorMessage(`Failed to load '${viewName}' for document: '${url}'! Error:\n${error.message}`);
    }
  } // end of loadView()

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
   * Creates local resource roots for loading assets in data preview webview.
   */
  private getLocalResourceRoots(): Uri[] {
    const localResourceRoots: Uri[] = [];
    const workspaceFolder: WorkspaceFolder = workspace.getWorkspaceFolder(this.uri);
    if (workspaceFolder && workspaceFolder !== undefined) {
      localResourceRoots.push(Uri.file(workspaceFolder.uri.fsPath));
    }
    else if (!this.uri.scheme || this.uri.scheme === 'file') {
      localResourceRoots.push(Uri.file(path.dirname(this.uri.fsPath)));
    }
    
    // add data preview js scripts
    localResourceRoots.push(Uri.file(path.join(this._extensionPath, 'scripts')));

    // add data preview styles
    localResourceRoots.push(Uri.file(path.join(this._extensionPath, 'styles')));
    if (config.logLevel === LogLevel.Debug) {
      this._logger.debug('getLocalResourceRoots():', 
        localResourceRoots.map(uri => uri.path));
    }
    return localResourceRoots;
  }

  /**
   * Configures webview html for preview.
   */
  public configure(): void {
    this.webview.html = this.html;
    // NOTE: let webview fire refresh message
    // when data view DOM content is initialized
    // see: data.view.html/refresh();
  }

  /**
   * Saves updated data viewer config for restore on vscode reload.
   */
  private updateConfig(viewConfig: any, dataTable: string) {
    if (this._dataTable !== dataTable && this._dataViews.hasOwnProperty(dataTable)) {
      // load saved data view for the requested data table
      this._viewConfig = this._dataViews[dataTable];
      this._logger.debug(`updateConfig(${dataTable}): new view config:`, this._viewConfig);
    }
    else if (viewConfig.hasOwnProperty('view') && // not a blank view config
      JSON.stringify(this._viewConfig) !== JSON.stringify(viewConfig)) {
      // update view config for the loaded data table
      this._viewConfig = viewConfig;
      // this._logger.debug(`updateConfig(${this._dataTable}): config:`, this._viewConfig);
      if (this._dataTable.length > 0) {
        // save updated config in data views for reload
        this._dataViews[this._dataTable] = this._viewConfig;
      }
    }
  }

  /**
   * Reloads data preview on data file save changes or vscode IDE reload.
   * @param dataTable Optional data table name for files with multiple data sets.
   */
  public refresh(dataTable = ''): void {
    // reveal corresponding data preview panel
    this._panel.reveal(this._panel.viewColumn, true); // preserve focus
    this._status.show();
    this.updateStatus('Loading data...');

    if (dataTable.length >  0) {
      // save requested data table
      this._dataTable = dataTable;
    }

    // read and send updated data to webview
    // workspace.openTextDocument(this.uri).then(document => {
      this._logger.debug(`refresh(): \n dataTable: '${this._dataTable}' \n dataUrl:`, this._dataUrl);
      //const textData: string = document.getText();
      let data = [];
      try {
        // get file data
        data = this.getFileData(this._dataUrl);
      }
      catch (error) {
        this._logger.error(`refresh(${this._dataTable}): Error:\n`, error.message);
        this.webview.postMessage({error: error});
      }
      this.loadData(data);
    // });
  } // end of refresh()

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
          uri: this._dataUrl,
          config: this.config,
          schema: this.schema,
          tableNames: this._tableNames,
          views: this._dataViews,
          table: this._dataTable,
          logLevel: this.logLevel,
          data: data
        });
    }
    catch (error) {
      this._logger.error('loadData(): Error:\n', error.message);
      this.webview.postMessage({error: error});
    }
  } // end of loadData()

  /**
   * Prompts to load saved data view config.
   */
   private async loadConfig(): Promise<void> {
    // create config files path
    let configFilePath: string = this._uri.fsPath.replace(this._fileExtension, '');
    this._logger.debug('loadConfig(): showing configs:', configFilePath);

    // display open config files dialog
    const configFiles: Uri[] = await window.showOpenDialog({
      canSelectMany: false,
      defaultUri: Uri.parse(configFilePath).with({scheme: 'file'}),
      filters: {'Config': ['config']}
    });

    if (configFiles.length > 0) {
      // load the first selected view config file
      configFilePath = configFiles[0].fsPath;
      this._logger.debug('loadConfig(): loading config:', configFilePath);
      this.loadConfigFromFile(configFilePath);
    }
  } // end of loadConfig()

  /**
   * Loads data view config from local config json file.
   * @param configFilePath Data view config file path.
   * @param refreshData Refreshes data on new view config load.
   * @param showErrors Shows errors messages if data view config doesn't match data preview data file.
   */
  private loadConfigFromFile(configFilePath: string, 
    refreshData: boolean = true, 
    showErrors: boolean = true): void {
    // load view config
    const configString: string = fs.readFileSync(configFilePath, 'utf8'); // file encoding to read data as string
    const viewConfig: any = JSON.parse(configString);

    // check for matching data file
    this._logger.debug('loadConfigFromFile(): loading view config:', configFilePath);
    if (this._uri.fsPath.indexOf(viewConfig.dataFileName) >=0) {
      // save loaded view config, and data table reference if present
      this._viewConfig = viewConfig.config;
      this._dataTable = (viewConfig.dataTable === undefined) ? '': viewConfig.dataTable;
      this._logger.debug('loadConfigFromFile(): loaded view config:', this._viewConfig);
      if (refreshData) {
        // reload data & config for display
        this.refresh(this._dataTable);
      }
    }
    else if (showErrors) {
      window.showErrorMessage(`Config data file '${viewConfig.dataFileName}' doesn't match '${this._fileName}'!`);
    }
  }

  /*------------------------------ Get/Save Data Methods ---------------------------------------*/

  /**
   * Loads actual data file content.
   * @param dataUrl Local data file path or remote data url.
   * @returns CSV/JSON string or Array of row objects.
   * TODO: change this to async later
   */
  private getFileData(dataUrl: string): any {
    // read file data
    // TODO: convert this to data reader/provider factory
    let data: any = null;
    switch (this._fileExtension) {
      case '.csv':
      case '.tsv':
      case '.txt':
      case '.tab':
        data = dataManager.getData(dataUrl);
        const dataLines: Array<string> = data.split('\n');
        this.logDataStats(dataLines);
        break;
      case '.dif':
      case '.ods':
      case '.xls':
      case '.xlsb':
      case '.xlsx':
      case '.xlsm':
      case '.xml':
      case '.html':        
        data = this.getExcelData(dataUrl);
        break;
      case '.md':
        data = this.getMarkdownData(dataUrl);
        break;
      case '.arrow':
        data = this.getArrowData(dataUrl);
        break;
      case '.avro':
        data = this.getAvroData(dataUrl);
        break;
      case '.parquet':
        // TODO: sort out node-gyp lzo lib loading for parquet data files parse
        window.showInformationMessage('Parquet Data Preview 🈸 coming soon!');        
        // data = this.getParquetData(dataFilePath);
        break;
      default: // use new data.manager api for other data file types
        data = dataManager.getData(dataUrl);
        this.logDataStats(data);
        break;
    }
    return data;
  } // end of getFileData()

  // TODO: Move these data loading methods to separate data.provders per file type

  /**
   * Gets Excel file data.
   * @param dataFilePath Excel file path.
   * @returns Array of row objects.
   */
  private getExcelData(dataFilePath: string): any[] {
    // load workbooks
    const dataBuffer: Buffer = fileUtils.readDataFile(dataFilePath);
    const workbook: xlsx.WorkBook = xlsx.read(dataBuffer, {
      cellDates: true,
    });
    this._logger.debug(`getExcelData(): file: ${this._fileName} sheetNames:`, workbook.SheetNames);

    // load data sheets
    let dataRows: Array<any> = [];
    if (workbook.SheetNames.length > 0) {
      if (workbook.SheetNames.length > 1) {
        // save sheet names for table list UI display
        this._tableNames = workbook.SheetNames;
      }

      // determine spreadsheet to load
      let sheetName = workbook.SheetNames[0];
      if (this._dataTable.length > 0) {
        // reset to requested table name
        sheetName = this._dataTable;
      }
      
      // get worksheet data row objects array
      const worksheet: xlsx.Sheet = workbook.Sheets[sheetName];
      dataRows = xlsx.utils.sheet_to_json(worksheet);
      this.logDataStats(dataRows);

      // create json data file for binary Excel file text data preview
      if (this.createJsonFiles && config.supportedBinaryDataFiles.test(this._fileName)) {
        // create Excel spreadsheet json file path
        let jsonFilePath: string = this._uri.fsPath.replace(this._fileExtension, '.json');
        if (this._dataTable.length > 0 && this._tableNames.length > 1) {
          // append sheet name to generated json data file name
          jsonFilePath = jsonFilePath.replace('.json', `-${sheetName}.json`);
        }
        fileUtils.createJsonFile(jsonFilePath, dataRows);
      }
    }
    return dataRows;
  } // end of getExcelData()

  /**
   * Gets markdown data tables array or config object.
   * @param dataFilePath Data file path.
   * @param parseFunction Data parse function for the supported json/config files.
   * @param options Data parsing options.
   */
  private getMarkdownData(dataFilePath: string): any {
    let content: string = '';
    try {
      // read markdown file content
      content = fileUtils.readDataFile(dataFilePath, 'utf8');
      // convert it to to CSV for loading into data view
      content = this.markdownToCsv(content);
      const dataLines: string[] = content.split('\n');
      this.logDataStats(dataLines);
    }
    catch (error) {
      this._logger.error(`getMarkdownData(): Error parsing '${this._dataUrl}'. \n\t Error:`, error.message);
      window.showErrorMessage(`Unable to parse data file: '${this._dataUrl}'. \n\t Error: ${error.message}`);
    }
    return content;
  }

  /**
   * Gets binary Arrow file data.
   * @param dataFilePath Arrow data file path.
   * @returns Array of row objects.
   */
  private getArrowData(dataFilePath: string): any[] {
    // get binary arrow data
    const dataBuffer: Buffer = fileUtils.readDataFile(dataFilePath);

    // create typed data array
    const dataArray: Uint8Array = new Uint8Array(dataBuffer);
    this._logger.debug('getArrowData(): data size in bytes:', dataArray.byteLength.toLocaleString());

    // create arrow table
    const dataTable: Table = Table.from(dataArray);

    // remap arrow data schema to columns for data viewer
    this._dataSchema = {};
    dataTable.schema.fields.map(field => {
      let fieldType: string = field.type.toString();
      const typesIndex: number = fieldType.indexOf('<');
      if (typesIndex > 0) {
        fieldType = fieldType.substring(0, typesIndex);
      }
      this._dataSchema[field.name] = config.dataTypes[fieldType];
    });
    // initialized typed data set columns config
    // this._config['columns'] = dataTable.schema.fields.map(field => field.name);

    if (this.createJsonSchema) {
      // create schema.json file for text data preview
      fileUtils.createJsonFile(this._uri.fsPath.replace(this._fileExtension, '.schema.json'), dataTable.schema);
    }

    // send initial data info to data view
    this.postDataInfo(); 

    // post typed array to data.view for data load
    this.webview.postMessage(Array.from(dataArray));

    // create arrow data.json for text arrow data preview
    let dataRows: Array<any> = [];
    if (this.createJsonFiles && !fs.existsSync(dataFilePath.replace('.arrow', '.json'))) {
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
      fileUtils.createJsonFile(this._uri.fsPath.replace(this._fileExtension, '.json'), dataRows);
    }

    // log arrow data stats and schema, and gracefully return :)
    this.logDataStats(dataRows, dataTable.schema);
    return []; //  dataRows already sent
  } // end of getArrowData()

  /**
   * Gets binary Avro file data.
   * @param dataFilePath Avro data file path.
   * @returns Array of row objects.
   */
  private getAvroData(dataFilePath: string): any[] {
    let dataSchema: any = {};
    let dataRows: Array<any> = [];
    const dataBlockDecoder: avro.streams.BlockDecoder = avro.createFileDecoder(this._uri.fsPath); //dataFilePath);
    dataBlockDecoder.on('metadata', (type: any) => dataSchema = type);
		dataBlockDecoder.on('data', (data: any) => dataRows.push(data));
    dataBlockDecoder.on('end', () => {
      this.logDataStats(dataRows, dataSchema);
      // Note: flatten data rows for now since Avro format has hierarchical data structure
      dataRows = dataRows.map(rowObject => jsonUtils.flattenObject(rowObject));
      this.loadData(dataRows);
      if (this.createJsonSchema) {
        // create schema.json file for Avro metadata preview
        fileUtils.createJsonFile(this._uri.fsPath.replace(this._fileExtension, '.schema.json'), dataSchema);
      }
      if (this.createJsonFiles) {
        // create data json file for Avro text data preview
        fileUtils.createJsonFile(this._uri.fsPath.replace(this._fileExtension, '.json'), dataRows);
      }
    });
    return dataRows;
  }

  /**
   * Gets binary Parquet file data.
   * @param dataFilePath Parquet data file path.
   * @returns Array of row objects.
   */ /*
  private async getParquetData(dataFilePath: string) {
    let dataSchema: any = {};
    let dataRows: Array<any> = [];
    const parquetReader = await parquet.ParquetReader.openFile(dataFilePath);
    const cursor = parquetReader.getCursor();
    // read all records
    let record = null;
    while (record = await cursor.next()) {
      dataRows.push(record);
    }
    await parquetReader.close();
    dataRows = dataRows.map(rowObject => this.flattenObject(rowObject));    
    this.logDataStats(dataRows, dataSchema);
    // update web view
    this.loadData(dataRows);
    return dataRows;
  } */

  /**
   * Logs data stats and optional data schema or metadata for debug 
   * and updates data preview status bar item.
   * @param dataRows Data rows array.
   * @param dataSchema Optional data schema or metadata for debug logging.
   */
  private logDataStats(dataRows: Array<any>, dataSchema: any = null): void {
    // get data file size in bytes
    this._fileSize = fileUtils.getFileSize(this._dataUrl);
    this._rowCount = dataRows.length;
    this.updateStats(this._columns, this._rowCount);
    if (this.logLevel === 'debug') {
      if (dataSchema) {
        // this._logger.debug(`logDataStats(): ${this._fileName} data schema:`, dataSchema);
        this._logger.debug('logDataStats(): data view schema:', this._dataSchema);
      }
      if (dataRows.length > 0) {
        const firstRow = dataRows[0];
        this._logger.debug('logDataStats(): 1st row:', firstRow);
        this._logger.debug('logDataStats(): rowCount:', this._rowCount);
      }
    }
  }

  /**
   * Saves posted data from data view.
   * @param fileData File data to save.
   * @param fileType Data file type.
   */
  private async saveData(fileData: any, fileType: string): Promise<void> {
    let dataFilePath: string = this._uri.fsPath.replace(this._fileExtension, '');
    if (this._dataTable.length > 0) {
      // append data table name to new config or data export file name
      dataFilePath += `-${this._dataTable}`;
    }

    // add requested data file extension
    dataFilePath += fileType;
    this._logger.debug('saveData(): saving data file:', dataFilePath);

    // display save file dialog
    const dataFileUri: Uri = await window.showSaveDialog({
      defaultUri: Uri.parse(dataFilePath).with({scheme: 'file'})
    });

    if (dataFileUri) {
      const dataFileExtension: string = dataFilePath.substr(dataFilePath.lastIndexOf('.'));
      switch (dataFileExtension) {
        case '.arrow':
          fileData = Buffer.from(fileData);
          this._logger.debug('saveData(): arrow data size in bytes:', fileData.byteLength.toLocaleString());
          break;
        case '.md':
            // convert CSV text to markdown table
            fileData = this.csvToMarkdownTable(fileData);
          break;
        case '.csv':
          // do nothing: already in csv text format from data view export
          break;
        case '.config':
        case '.json':
          fileData = JSON.stringify(fileData, null, 2);
          break;
        case '.json5':
          fileData = json5.stringify(fileData, null, 2);
          break;    
        case '.hjson':
          fileData = hjson.stringify(fileData);
          break;
        case '.html':
          fileData = this.jsonToExcelData(fileData, 'html');
          break;  
        case '.ods':
          fileData = this.jsonToExcelData(fileData, 'ods');
          break;
        case '.xml':
          fileData = this.jsonToExcelData(fileData, 'xlml');
          break;    
        case '.xlsb':
          fileData = this.jsonToExcelData(fileData, 'xlsb');
          break;
        case '.xlsx':
          fileData = this.jsonToExcelData(fileData, 'xlsx');
          break;
        case '.yml':
          // convert to yaml. see: https://github.com/nodeca/js-yaml#safedump-object---options-
          fileData = yaml.dump(fileData, {skipInvalid: true});
          break;
        case '.properties':
          // check if data is from Properties Grid Data View
          if (fileData.length > 0 && 
            fileData[0].hasOwnProperty('key') && 
            fileData[0].hasOwnProperty('value')) {
              let propertiesString: string = '';
              const newLineRegExp: RegExp = new RegExp('\n', 'g');
              fileData = fileData.forEach(property => {
                // convert it to properties string
                let propertyLine:string =`${property['key']}=${property['value']}`;
                if (propertyLine.indexOf(`\n`) > 0) {
                  // replace all new lines for multi-line property values with \ next line marker and \n
                  propertyLine = propertyLine.replace(newLineRegExp, '\\\n');
                }
                propertiesString += `${propertyLine}\n`;
              });
              fileData = propertiesString;
          } else {
            // display not a properties collection warning
            fileData = '';
            window.showWarningMessage(`Data loaded in Preview is not a Properties collection. Use other data formats to Save this data.`);
          }
          break;
      }
      
      // save exported data
      if ( fileData.length > 0) {
        // TODO: change this to async later
        fs.writeFile(dataFileUri.fsPath, fileData, (error) => {
          if (error) {
            this._logger.error(`saveData(): Error saving '${dataFileUri.fsPath}'. \n\t Error:`, error.message);
            window.showErrorMessage(`Unable to save data file: '${dataFileUri.fsPath}'. \n\t Error: ${error.message}`);
          }
          else if (this.openSavedFileEditor) {
            this.loadView('vscode.open', dataFileUri.with({scheme: 'file'}).toString(false)); // skip encoding
          }
        });
      }
    }
  } // end of saveData()

  /*-------------------- TODO: move this to new excel.data.provider API later --------------------------*/
  /**
   * Converts json data to Excel data format: .xlsb or .xlsx
   * @param jsonData Json data to convert.
   * @param bookType Excel data file book type: xlsb or xlsx
   */
  private jsonToExcelData(jsonData: any, bookType: xlsx.BookType): any {
    this._logger.debug('jsonToExcelData(): creating excel data:', bookType);
    const workbook: xlsx.WorkBook = xlsx.utils.book_new();
    const worksheet: xlsx.WorkSheet  = xlsx.utils.json_to_sheet(jsonData, {
      header: JSON.parse(this._viewConfig.columns)
    });
    xlsx.utils.book_append_sheet(workbook, worksheet, this._dataTable);
    return xlsx.write(workbook, {
      type: 'buffer',
      compression: true, // use zip compression for zip-based formats
      bookType: bookType
    });
  }

  /*-------------------- TODO: move these to new markdown.data.provider impl. and interface ----------------*/

  /**
   * Converts CSV to markdown table.
   *
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
    this._logger.debug('csvToMarkdownTable(): csv rows:', csvRows);
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


  /**
   * Converts markdown content to csv data for display in data view.
   * @param markdownContent Markdown file content to convert to csv string.
   */
  private markdownToCsv(markdownContent: string): string {
    // clear loaded tables list
    this._tableNames = [];

    // extract markdown sections and tables
    const sections: Array<string> = markdownContent.split('\n#');
    const sectionMarker: RegExp = new RegExp(/(#)/g);
    const quotes: RegExp = new RegExp(/(")/g);
    const tableHeaderSeparator: RegExp = new RegExp(/((\|)|(\:)|(\-)|(\s))+/g);
    const tableRowMarkdown: RegExp = new RegExp(/((\|[^|\r\n]*)+\|(\r?\n|\r)?)/g);
    const tablesMap: any = {};
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
          // this._logger.debug('markdownToCsv(): section:', sectionTitle);
          // this._logger.debug('markdownToCsv(): extractred markdown table rows:', tableRows);
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
          this._tableNames.push(tableTitle);
          this._logger.debug(`markdownToCsv(): created data table: '${tableTitle}' rows: ${tableRows.length}`);
        }
      }); // end of tables.forEach(row)
    }); // end of sections.forEach(textBlock/table)

    // get requested table data
    let table: Array<string> = tablesMap[this._tableNames[0]]; // default to 1st table in the loaded tables list
    if (this._dataTable.length > 0) {
      table = tablesMap[this._dataTable];
      this._logger.debug(`markdownToCsv(): requested data table: '${this._dataTable}'`);
    }

    if (this._tableNames.length === 1) {
      // clear data preview tables list if only one markdown table is present
      this._tableNames = [];
    }

    // convert requested markdown table to csv for data view display
    let csvContent: string = '';
    if (table) {
      this._logger.debug('markdownToCsv(): markdown table rows:', table);
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
      this._logger.debug('markdownToCsv(): final csv table content string for data.view load:\n', csvContent);
    }
    return csvContent;
  } // end of markdownToCsv()

  /*----------------------------- Data Preview Properties ----------------------------*/

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
    return this._viewConfig;
  }

  /**
   * Gets data schema for typed data sets.
   */
  get schema(): any {
    return this._dataSchema;
  }

  /**
   * Gets data table name for data files with multiple data sets on vscode reload.
   */
  get table(): string {
    return this._dataTable;
  }

  /**
   * Gets UI theme to use for Data Preview display from workspace config.
   * see package.json 'configuration' section for more info.
   */
  get theme(): string {
    const uiTheme: string = <string>workspace.getConfiguration('data.preview').get('theme');
    return (uiTheme === 'dark' || uiTheme === '.dark') ? '.dark': ''; // blank for light theme css loading
  }

  /**
   * Gets charts plugin preference for Data Preview display from workspace config.
   * see package.json 'configuration' section for more info.
   */
  get charts(): string {
    return <string>workspace.getConfiguration('data.preview').get('charts.plugin');
  }

  /**
   * Create JSON data files config option for Arrow, Avro & Excel binary data formats.
   */
  get createJsonFiles(): boolean {
    return <boolean>workspace.getConfiguration('data.preview').get('create.json.files');
  }

  /**
   * Create schema.json files config option for Arrow & Avro metadata binary data formats.
   */
  get createJsonSchema(): boolean {
    return <boolean>workspace.getConfiguration('data.preview').get('create.json.schema');
  }

  /**
   * Opens created data file raw Content Editor on Data Save.
   */
  get openSavedFileEditor(): boolean {
    return <boolean>workspace.getConfiguration('data.preview').get('openSavedFileEditor');
  }

  /**
   * Gets data preivew log level setting for troubleshooting user issues.
   */
  get logLevel(): string {
    return <string>workspace.getConfiguration('data.preview').get('log.level');
  }

  /**
   * Set status bar item for data preview data stats display in vscode status bar.
   */
  set status(statusBarItem: StatusBarItem) {
    this._status = statusBarItem;
  }
}
