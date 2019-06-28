'use strict';

// vscode imports
import {
  commands, 
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
import {Logger, LogLevel} from './logger';
import {previewManager} from './preview.manager';
import {Template} from './template.manager';
import * as fileUtils from './utils/file.utils';
import * as jsonUtils from './utils/json.utils';

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
    const dataTable: string = state.table;
    this._logger.debug(`deserializeWeviewPanel(${dataTable}): uri:`, state.uri.toString());
    this._logger.debug(`deserializeWeviewPanel(${dataTable}): config:`, state.config);
    this._logger.debug(`deserializeWeviewPanel(${dataTable}): views:`, state.views);
    previewManager.add(
      new DataPreview(
        this.viewType,
        this.extensionPath, 
        Uri.parse(state.uri),
        dataTable,
        state.config, // data view config
        state.views, // other data views for data files with multiple data sets
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

  // webview vars
  protected _disposables: Disposable[] = [];
  private _extensionPath: string;
  private _uri: Uri;
  private _previewUri: Uri;
  private _fileName: string;
  private _fileExtension: string;
  private _title: string;
  private _html: string;
  private _panel: WebviewPanel;
  private _logger: Logger;

  // data view vars
  private _dataUrl: string;
  private _dataSchema: any;
  private _isRemoteData: boolean = false;
  private _tableList: Array<string> = [];
  private _dataViews: any = {};
  private _viewConfig: any = {};
  private _dataTable: string = '';
  private _charts: string = 'd3fc';

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

    // save ext path, document uri, view config, and create preview uri
    this._extensionPath = extensionPath;
    this._uri = uri;
    this._dataUrl = uri.toString(true).replace('file:///', ''); // skip uri encoding, strip out file scheme
    this._isRemoteData = (this._dataUrl.startsWith('http://') || this._dataUrl.startsWith('https://'));
    this._dataTable = (table !== undefined) ? table: '';
    this._dataViews = (views !== undefined) ? views: {};
    this._viewConfig = viewConfig;
    this._fileName = path.basename(uri.fsPath);    
    this._fileExtension = this._fileName.substr(this._fileName.lastIndexOf('.'));
    this._previewUri = this._uri.with({scheme: 'data'});
    this._title = `${this._fileName} 🈸`;
    this._logger = new Logger(`${viewType}:`, config.logLevel);
    this._logger.debug('(): creating data.preview:', this._dataUrl);

    // initilize charts plugin
    this._charts = this.charts;
    if (viewConfig && viewConfig.hasOwnProperty('view') && viewConfig.view.startsWith('d3')) {
      // reset it to highcharts for older ext v.s configs
      this._charts = 'highcharts';
    }

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
    }
    this._logger.debug('initWebview(): data.view created:', this._dataUrl);

    // dispose preview panel handler
    this._panel.onDidDispose(() => {
      this.dispose();
    }, null, this._disposables);

    // TODO: handle view state changes later
    this._panel.onDidChangeViewState(
      (viewStateEvent: WebviewPanelOnDidChangeViewStateEvent) => {
      let active = viewStateEvent.webviewPanel.visible;
    }, null, this._disposables);

    // load matching view config, if available
    const viewConfigFilePath:string = this._dataUrl.replace(this._fileExtension, '.config');
    if (!this._isRemoteData && 
      !this._viewConfig.hasOwnProperty('view') && // blank view config
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
        case 'saveData':
          // saves data view config, or filtered json or csv data
          this.saveData(message.fileType, message.data);
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
    this._logger.debug('postDataInfo(): data url:', this._dataUrl);
    try {
      // update web view
      this.webview.postMessage({
        command: 'dataInfo',
        fileName: this._fileName,
        uri: this._dataUrl,
        config: this.config,
        schema: this.schema,
        tableList: this._tableList,
        views: this._dataViews,
        table: this._dataTable
      });
    }
    catch (error) {
      this._logger.logMessage(LogLevel.Error, 'postDataInfo():', error.message);
    }
  }

  /**
   * Launches new view via commands.executeCommand interface.
   * @param viewName View name to launch.
   * @param url View document url parameter.
   * @see https://code.visualstudio.com/api/extension-guides/command
   */
  private loadView(viewName: string, url: string): void {
    try {
      // strip out file scheme
      url = url.replace('file:///', '');
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // launch requested remote data view command
        this._logger.debug(`loadView():executeCommand: ${viewName}`, url);
        commands.executeCommand(viewName, Uri.parse(url));
      }
      else if (fs.existsSync(url)) {
        // launch requested local data view command
        this._logger.debug(`loadView():executeCommand: ${viewName}`, url);
        commands.executeCommand(viewName, Uri.parse(url));
      } 
      else {
        // try to find requested data file(s) in open workspace
        workspace.findFiles(`**/${url}`).then(files => {
          if (files.length > 0) {
            // pick the 1st matching file from the workspace
            const dataUri: Uri = files[0];
            // launch requested view command
            this._logger.debug(`loadView():executeCommand: ${viewName}`, dataUri.toString(true)); // skip encoding
            commands.executeCommand(viewName, dataUri);
          } else {
            this._logger.logMessage(LogLevel.Error, `loadView(): no such files in workspace:`, url);
            window.showErrorMessage(`${url} file doesn't exist in this workspace!`);
          }
        });
      }
    } catch (error) {
      this._logger.logMessage(LogLevel.Error, `loadView(${url}):`, error.message);
      window.showErrorMessage(`Failed to load '${viewName}' for document: ${url}! ${error.message}`);
    }
  }

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
    // see: data.view.html/this.refresh();
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

    if (dataTable.length >  0) {
      // save requested data table
      this._dataTable = dataTable;
    }

    // read and send updated data to webview
    // workspace.openTextDocument(this.uri).then(document => {
      this._logger.debug(`refresh(${this._dataTable}): data url:`, this._dataUrl);
      //const textData: string = document.getText();
      let data = [];
      try {
        // get file data
        data = this.getFileData(this._dataUrl);
      }
      catch (error) {
        this._logger.logMessage(LogLevel.Error, `refresh(${this._dataTable}):`, error.message);
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
          uri: this._dataUrl,
          config: this.config,
          schema: this.schema,
          tableList: this._tableList,
          views: this._dataViews,
          table: this._dataTable,
          data: data
        });
    }
    catch (error) {
      this._logger.logMessage(LogLevel.Error, 'loadData():', error.message);
      this.webview.postMessage({error: error});
    }
  }

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
    if (this._uri.fsPath.indexOf(viewConfig.dataFileName) >=0) {
      // save loaded view config, and data table reference if present
      this._viewConfig = viewConfig.config;
      this._dataTable = (viewConfig.dataTable === undefined) ? '': viewConfig.dataTable;
      this._logger.debug('loadConfig(): loaded view config:', this._viewConfig);
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
        data = fileUtils.readDataFile(dataUrl, 'utf8'); // file encoding to read data as string
        break;
      case '.dif':
      case '.ods':
      case '.slk':
      case '.xls':
      case '.xlsb':
      case '.xlsx':
      case '.xlsm':
      case '.xml':
      case '.html':        
        data = this.getExcelData(dataUrl);
        break;
      case '.env':
        data = jsonUtils.configToPropertyArray(fs.readFileSync(dataUrl, 'utf8'));
        break;
      case '.properties':
        data = this.getPropertiesData(dataUrl);
        break;
      case '.ini':
          data = this.getIniData(dataUrl);
          break;  
      case '.config':
        data = this.getConfigData(dataUrl);
        break;
      case '.json':
        data = this.getJsonData(dataUrl);
        break;
      case '.json5':
        data = this.getJson5Data(dataUrl);
        break;
      case '.hjson':
        data = this.getHJsonData(dataUrl);
        break;
      case '.yaml':
      case '.yml':
        data = this.getYamlData(dataUrl);
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
    const dataSchema = null;
    if (workbook.SheetNames.length > 0) {
      if (workbook.SheetNames.length > 1) {
        // save sheet names for table list UI display
        this._tableList = workbook.SheetNames;
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

      if (this.createJsonFiles) {
        // create json data file for Excel text data preview
        let jsonFilePath: string = this._uri.fsPath.replace(this._fileExtension, '.json');
        if (this._dataTable.length > 0 && this._tableList.length > 1) {
          // append sheet name to generated json data file name
          jsonFilePath = jsonFilePath.replace('.json', `-${sheetName}.json`);
        }
        fileUtils.createJsonFile(jsonFilePath, dataRows);
      }
      this.logDataStats(dataSchema, dataRows);
    }
    return dataRows;
  } // end of getExcelData()

  /**
   * Gets binary Arrow file data.
   * @param dataFilePath Arrow data file path.
   * @returns Array of row objects.
   */
  private getArrowData(dataFilePath: string): any[] {
    // get binary arrow data
    const dataBuffer: Buffer = fileUtils.readDataFile(dataFilePath);
    // create typed octet data array
    const octetDataArray: Uint8Array = new Uint8Array(dataBuffer);
    // create arrow table
    const dataTable: Table = Table.from(octetDataArray);
    // post typed array to data.view for data load
    //this.webview.postMessage(octetDataArray);

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

    // create arrow data .json for text arrow data preview
    let dataRows: Array<any> = [];
    //if (this.createJsonFiles && !fs.existsSync(dataFilePath.replace('.arrow', '.json'))) {
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
    //}

    // log arrow data stats and gracefully return :)
    this.logDataStats(dataTable.schema, dataRows);
    return dataRows;
  } // end of getArrowData()

  /**
   * Gets binary Avro file data.
   * @param dataFilePath Avro data file path.
   * @returns Array of row objects.
   */
  private getAvroData(dataFilePath: string): any[] {
    let dataSchema: any = {};
    let dataRows: Array<any> = [];
    const dataBlockDecoder: avro.streams.BlockDecoder = avro.createFileDecoder(dataFilePath);
    dataBlockDecoder.on('metadata', (type: any) => dataSchema = type);
		dataBlockDecoder.on('data', (data: any) => dataRows.push(data));
    dataBlockDecoder.on('end', () => {
      this.logDataStats(dataSchema, dataRows);
      // update web view: flatten data rows for now since Avro format has hierarchical data structure
      dataRows = dataRows.map(rowObject => jsonUtils.flattenObject(rowObject));
      this.loadData(dataRows);
      if (this.createJsonSchema) {
        // create schema.json file for text data preview
        fileUtils.createJsonFile(this._uri.fsPath.replace(this._fileExtension, '.schema.json'), dataSchema);
      }
      if (this.createJsonFiles) {
        // create data json file for text data preview
        fileUtils.createJsonFile(this._uri.fsPath.replace(this._fileExtension, '.json'), dataRows);
      }
    });
    return dataRows;
  }

  /**
   * Gets .config data array or config object.
   * @param dataFilePath Config data file path.
   * @see https://github.com/lorenwest/node-config/wiki/Configuration-Files
   */
  private getConfigData(dataFilePath: string): any {
    let data: any = JSON.parse(fileUtils.readDataFile(dataFilePath, 'utf8'));
    return jsonUtils.convertJsonData(data);
  }

  /**
   * Gets JSON data array or config object.
   * @param dataFilePath Json data file path.
   * @see http://json.org/
   */
  private getJsonData(dataFilePath: string): any {
    let data: any = JSON.parse(fileUtils.readDataFile(dataFilePath, 'utf8'));
    return jsonUtils.convertJsonData(data);
  }

  /**
   * Gets JSON5 data array or config object.
   * @param dataFilePath Json5 data file path.
   * @see https://json5.org
   */
  private getJson5Data(dataFilePath: string): any {
    let data: any = json5.parse(fileUtils.readDataFile(dataFilePath, 'utf8'));
    return jsonUtils.convertJsonData(data);
  }

  /**
   * Gets HJSON data array or config object.
   * @param dataFilePath HJson data file path.
   * @see https://github.com/hjson/hjson-js
   */
  private getHJsonData(dataFilePath: string): any {
    let data: any = hjson.parse(fileUtils.readDataFile(dataFilePath, 'utf8'));
    return jsonUtils.convertJsonData(data);
  }

  /**
   * Gets YAML data array or config object.
   * @param dataFilePath YAML data file path.
   */
  private getYamlData(dataFilePath: string): any {
    let data: any = yaml.load(fileUtils.readDataFile(dataFilePath, 'utf8'));
    return jsonUtils.convertJsonData(data);
  }

  /**
   * Gets properties data array with key/value pairs.
   * @param dataFilePath Properties data file path.
   */
  private getPropertiesData(dataFilePath: string): any {
    const dataString: string = fileUtils.readDataFile(dataFilePath, 'utf8');
    const data: any = jsonUtils.convertJsonData(
      props.parse(dataString, {sections: true}));
    return data;
  }

  /**
   * Gets INI properties data array with key/value pairs.
   * @param dataFilePath INI file path.
   * @see https://github.com/gagle/node-properties#ini
   */
  private getIniData(dataFilePath: string): any {
    const dataString: string = fileUtils.readDataFile(dataFilePath, 'utf8');
    const data: any = jsonUtils.convertJsonData(
      props.parse(dataString, {sections: true, comments: [';', '#']})); // NOTE: some INI files consider # as a comment
    return data;
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
    this.logDataStats(dataSchema, dataRows);
    // update web view
    this.loadData(dataRows);
    return dataRows;
  } */

  /**
   * Logs data stats for debug.
   * @param dataSchema metadata.
   * @param dataRows data rows.
   */
  private logDataStats(dataSchema: any, dataRows: Array<any>): void {
    if (config.logLevel === LogLevel.Debug) {
      if (dataSchema !== null) {
        // this._logger.debug(`logDataStats(): ${this._fileName} data schema:`, dataSchema);
        this._logger.debug('logDataStats(): data view schema:', this._dataSchema);
      }
      this._logger.debug('logDataStats(): records count:', dataRows.length);
      if (dataRows.length > 0) {
        const firstRow = dataRows[0];
        this._logger.debug('logDataStats(): 1st row:', firstRow);
      }
    }
  }

  /**
   * Saves posted data from data view.
   * @param fileType Data file type.
   * @param fileData File data to save.
   */
  private async saveData(fileType: string, fileData: any): Promise<void> {
    let dataFilePath: string = this._uri.fsPath.replace(this._fileExtension, '');
    if (this._dataTable.length > 0) {
      // append data table name to new config or data export file name
      dataFilePath += `-${this._dataTable}`;
    }
    // add requested data file ext.
    dataFilePath += fileType;
    this._logger.debug('saveData(): saving data file:', dataFilePath);

    // display save file dialog
    const dataFileUri: Uri = await window.showSaveDialog({
      defaultUri: Uri.parse(dataFilePath).with({scheme: 'file'})
    });

    if (dataFileUri) {
      const dataFileExtension = dataFilePath.substr(dataFilePath.lastIndexOf('.'));
      switch (dataFileExtension) {
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
        case '.yml':
          // convert to yaml. see: https://github.com/nodeca/js-yaml#safedump-object---options-
          fileData = yaml.dump(fileData, {skipInvalid: true});
          break;
        case '.properties':
          if (fileData.length > 0 && 
            fileData[0].hasOwnProperty('key') && fileData[0].hasOwnProperty('value')) { // data in properties format
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
            window.showWarningMessage(`Preview data is not a Properties collection. Use Save JSON or YAML format to save it.`);
          }
          break;
      }

      if (fileData.length > 0) {
        // save exported data
        // TODO: change this to async later
        fs.writeFile(dataFileUri.fsPath, fileData, (error) => {
          if (error) {
            const errorMessage: string = `Failed to save file: ${dataFileUri.fsPath}`;
            this._logger.logMessage(LogLevel.Error, 'saveData():', errorMessage);
            window.showErrorMessage(errorMessage);
          }
        });
      }
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
}
