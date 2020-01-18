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
//import * as parquet from 'parquetjs';

// data preview imports
import * as config from './config';
import * as fileUtils from './utils/file.utils';
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
  private _html: string;
  private _panel: WebviewPanel;
  private _status: StatusBarItem;
  private _logger: Logger;

  // data view vars
  private _dataUrl: string;
  private _dataSchema: any = null;
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
    this._isRemoteData = fileUtils.isRemoteDataUrl(this._dataUrl);
    this._dataTable = (table !== undefined) ? table: '';
    this._dataViews = (views !== undefined) ? views: {};
    this._viewConfig = viewConfig;
    this._fileName = path.basename(uri.fsPath);
    this._fileExtension = path.extname(this._fileName); // file extension
    this._previewUri = this._uri.with({scheme: 'data'});

    // parse view config
    viewConfig = this.parseConfig(viewConfig);
    if (viewConfig && viewConfig.hasOwnProperty('view')) {
      // initilize charts plugin
      this._charts = this.charts;
      if (viewConfig.view !== 'grid' && viewConfig.view !== 'hypergrid' &&
          !viewConfig.view.startsWith('d3')) {
        // reset it to highcharts for older ext v.s configs
        this._charts = 'highcharts';
      }
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
      themeColor: this.themeColor,
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
      this._panel = window.createWebviewPanel(viewType, this._fileName, viewColumn, this.getWebviewOptions());
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
    let fileSizeString: string = '';
    if (!this._isRemoteData) {
      fileSizeString = `\tFileSize: ${fileUtils.formatBytes(this._fileSize, 2)}`; // decimals
    }
    this.updateStatus(`${dataStats}${fileSizeString}\tLoadTime: ${dataLoadTime.toLocaleString()} sec`);
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
      this.loadView('data.preview', selectedFiles[0].toString(true)); // skip encoding
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
      this._logger.debug(`loadView(): loading view... \n ${viewName}`, url); 
        //fileUri.toString(true)); // skip encoding
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
      this._viewConfig = this.parseConfig(viewConfig);
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
  public refresh(dataTable: string = ''): void {
    // reveal corresponding data preview panel
    this._panel.reveal(this._panel.viewColumn, true); // preserve focus
    this._status.show();
    this.updateStatus('Loading data...');
    if (dataTable.length >  0) {
      // save requested data table
      this._dataTable = dataTable;
    }
    const dataUrl: string = (this._isRemoteData) ? this._dataUrl: this._uri.fsPath; // local data file path
    this._logger.debug(`refresh(): \n dataTable: '${this._dataTable}' \n dataUrl:`, dataUrl);
    try {
      this.getData(dataUrl, this._dataTable);
    }
    catch (error) {
      this._logger.error(`refresh(${this._dataTable}): Error:\n`, error.message);
      this.webview.postMessage({error: error});
    }
  } // end of refresh()

  /**
   * Loads binary, string or JSON data into data view.
   */
  private loadData(data: any): void {
    if (data === undefined || data.length <= 0) {
      // no valid data to load
      return;
    }
    this._logger.debug(
      `loadData(): loading data... \n dataTable: '${this._dataTable}' \n dataUrl:`, this._dataUrl);
    try {
      if (data.constructor === Uint8Array) {
        // send initial data info to data view
        this.postDataInfo();
        // post raw binary typed array to data.view for data load
        this.webview.postMessage(Array.from(data));
      }
      else { // update web view for csv or json data load
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
    }
    catch (error) {
      this._logger.error('loadData(): Error:\n', error.message);
      this.webview.postMessage({error: error});
    }
  } // end of loadData()

  /*------------------------------ Load Config Methods ---------------------------------------*/

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
      this._viewConfig = this.parseConfig(viewConfig.config);
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

  /**
   * Parses data view config by converting config string properties 
   * to arrays and objects for the data viewer web component attributes.
   * @param viewConfig View config object to parse.
   */
  private parseConfig(viewConfig: any): any {
    // patch view config
    if (viewConfig.hasOwnProperty('view')) {
      // set new view config plugin attribute
      viewConfig['plugin'] = viewConfig['view'];
      // delete deprecated view config property
      // delete viewConfig['view'];
    }
    // create clean view config instance
    const config: any = {};
    Object.keys(viewConfig).forEach(key => {
      config[key] = viewConfig[key];
      if (typeof viewConfig[key] === 'string') {
        const attribute: string = String(viewConfig[key]);
        if (attribute.startsWith('{') || attribute.startsWith('[')) {
          // parse config object or array
          config[key] = JSON.parse(attribute);
        }
      }
    });
    return config;
  }

  /*------------------------------ Get/Save Data Methods ---------------------------------------*/

  /**
   * Loads actual data file content.
   * @param dataUrl Local data file path or remote data url.
   * @param dataTable Optional data table name for files with multiple data sets.
   * @returns string for text data or Array of row objects.
   */
  private getData(dataUrl: string, dataTable: string = ''): any {
    let data: any = [];
    if (this._fileExtension === '.parquet') {
      // TODO: sort out node-gyp lzo lib loading for parquet data files parse
      window.showInformationMessage('Parquet Data Preview 🈸 coming soon!');        
      // data = this.getParquetData(dataFilePath);
    }
    else { // get data, table names, and data schema via data.manager api
      dataManager.getData(dataUrl, {
          dataTable: dataTable,
          createJsonFiles: this.createJsonFiles,
          createJsonSchema: this.createJsonSchema
        }, (data: any) => {
        this._tableNames = dataManager.getDataTableNames(dataUrl);
        this._dataSchema = dataManager.getDataSchema(dataUrl);
        this.loadData(data);
        // log data stats
        if (typeof data === 'string') {
          const dataLines: Array<string> = data.split('\n');
          this.logDataStats(dataLines);
        }
        else {
          this.logDataStats(data, this._dataSchema);
        }    
      });
    }
    return data;
  } // end of getData()

  /**
   * Logs data stats and optional data schema or metadata for debug 
   * and updates data preview status bar item.
   * @param dataRows Data rows array.
   * @param dataSchema Optional data schema or metadata for debug logging.
   */
  private logDataStats(dataRows: Array<any>, dataSchema: any = null): void {
    // get data file size in bytes
    this._fileSize = fileUtils.getFileSize(this._uri.fsPath); //this._dataUrl);
    this._rowCount = dataRows.length;
    this.updateStats(this._columns, this._rowCount);
    if (this.logLevel === 'debug') {
      if (dataSchema) {
        this._logger.debug('logDataStats(): data view schema:', dataSchema);
      }
      if (dataRows.length > 0 && dataRows.constructor !== Uint8Array) {
        const firstRow = dataRows[0];
        this._logger.debug('logDataStats(): 1st row:', firstRow);
        this._logger.debug('logDataStats(): rowCount:', this._rowCount);
      }
    }
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
   * Saves posted data from data view.
   * @param fileData File data to save.
   * @param fileType Data file type.
   */
  private async saveData(fileData: any, fileType: string): Promise<void> {
    let dataFileName: string = this._fileName.replace(this._fileExtension, '');
    if (this._dataTable.length > 0) {
      // append data table name to new config or data export file name
      dataFileName += `-${this._dataTable}`;
    }
    // add requested data file extension
    dataFileName += fileType;

    // create full data file path for saving data
    let dataFilePath: string = path.dirname(this._uri.fsPath);
    const workspaceFolders: Array<WorkspaceFolder> = workspace.workspaceFolders;
    if (this._isRemoteData && workspaceFolders && workspaceFolders.length > 0) {
      // use 'rootPath' workspace folder for saving remote data file
      dataFilePath = workspace.workspaceFolders[0].uri.fsPath;
    }
    dataFilePath = path.join(dataFilePath, dataFileName);
    this._logger.debug('saveData(): saving data file:', dataFilePath);

    // display save file dialog
    const dataFileUri: Uri = await window.showSaveDialog({
      defaultUri: Uri.parse(dataFilePath).with({scheme: 'file'})
    });

    if (dataFileUri) { // save data
      dataManager.saveData(dataFileUri.fsPath, fileData, this._dataTable, (error) => {
        if (error) {
          this._logger.error(`saveData(): Error saving '${dataFileUri.fsPath}'. \n\t Error:`, error.message);
          window.showErrorMessage(`Unable to save data file: '${dataFileUri.fsPath}'. \n\t Error: ${error.message}`);
        }
        else if (this.openSavedFileEditor) {
          this.loadView('vscode.open', dataFileUri.with({scheme: 'file'}).toString(false)); // skip encoding
        }
      });
    }
  } // end of saveData()

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
    let dataViewTheme: string = 'material'; // default light theme
    if (uiTheme.startsWith('dense')) {
      // append dense UI theme name
      dataViewTheme += '-dense';
    }
    if (uiTheme.endsWith('dark') || uiTheme.endsWith('.dark')) {
      dataViewTheme += '.dark'; // material dark theme
    } else {
      dataViewTheme = uiTheme; // custom data view theme
    }
    return dataViewTheme;
  }

  /** 
   * Gets UI theme color for the Data View dropdowns background color override.
   */
  get themeColor(): string {
    let themeColor: string = '#eee'; // default light theme color
    if (this.theme.endsWith('.dark')) {
      themeColor = '#2f3136';
    }
    else {
      themeColor = 'none'; // for the custom themes
    }
    return themeColor;
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
