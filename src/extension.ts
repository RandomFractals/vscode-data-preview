"use strict";
import {
  window, 
  workspace, 
  commands, 
  ExtensionContext,
  Disposable,
  Uri, 
  ViewColumn, 
  TextDocument,
  TextDocumentChangeEvent,
  TextDocumentContentProvider  
} from 'vscode';
import * as path from 'path';
import * as config from './config';
import {Logger, LogLevel} from './logger';
import {DataPreview, DataPreviewSerializer} from './data.preview';
import {previewManager} from './preview.manager';
import {Template, ITemplateManager, TemplateManager} from './template.manager';

// supported data file extensions
const DATA_FILE_EXTENSIONS: string[] = [
  '.json',
  '.arrow',
  '.arr',
  '.avro',
  '.parquet',
  '.parq',
  '.config',
  '.csv',
  '.tsv',
  '.txt',
  '.tab',
  '.ods',
  '.prn',
  '.slk',
  '.xls',
  '.xlsb',
  '.xlsx',
  '.xlsm',
  '.xml',
  '.html'
];

const logger: Logger = new Logger('data.preview:', config.logLevel);

/**
 * Activates this extension per rules set in package.json.
 * @param context vscode extension context.
 * @see https://code.visualstudio.com/api/references/activation-events for more info.
 */
export function activate(context: ExtensionContext) {
  const extensionPath: string = context.extensionPath;
  logger.debug('activate(): activating from extPath:', context.extensionPath);

  // initialize data preview webview panel html template
  const templateManager: ITemplateManager = new TemplateManager(context.asAbsolutePath('templates'));
  const dataViewTemplate: Template = templateManager.getTemplate('data.view.html');
  
  // register Data preview serializer for restore on vscode restart
  window.registerWebviewPanelSerializer('data.preview', 
    new DataPreviewSerializer('data.preview', extensionPath, dataViewTemplate));

  // Preview Data command
  const dataWebview: Disposable = 
    createDataPreviewCommand('data.preview', extensionPath, dataViewTemplate);
  context.subscriptions.push(dataWebview);

  // refresh associated preview on data file save
  workspace.onDidSaveTextDocument((document: TextDocument) => {
    if (isDataFile(document)) {
      const uri: Uri = document.uri.with({scheme: 'data'});
      const preview: DataPreview = previewManager.find(uri);
      if (preview) {
        preview.refresh();
      }
    }
  });

  // reset associated preview on data file change
  workspace.onDidChangeTextDocument((changeEvent: TextDocumentChangeEvent) => {
    if (isDataFile(changeEvent.document)) {
      const uri: Uri = changeEvent.document.uri.with({scheme: 'data'});
      const preview: DataPreview = previewManager.find(uri);
      if (preview && changeEvent.contentChanges.length > 0) {
        // TODO: add refresh interval before enabling this
        // preview.refresh();
      }
    }
  });

  // reset all previews on config change
  workspace.onDidChangeConfiguration(() => {
    previewManager.configure();
  });

  logger.debug('activate(): activated! extPath:', context.extensionPath);
} // end of activate()

/**
 * Deactivates this vscode extension to free up resources.
 */
export function deactivate() {
  // TODO: add extension cleanup code, if needed
}

/**
 * Creates a data preview command.
   * @param viewType Preview command type.
   * @param extensionPath Extension path for loading scripts, examples and data.
   * @param viewTemplate Preview html template.
 */
function createDataPreviewCommand(
  viewType: string, 
  extensionPath: string, 
  viewTemplate: Template): Disposable {
  const dataWebview: Disposable = commands.registerCommand(viewType, (uri) => {
    let resource: any = uri;
    let viewColumn: ViewColumn = getViewColumn();
    if (!(resource instanceof Uri)) {
      if (window.activeTextEditor) {
        resource = window.activeTextEditor.document.uri;
      } else {
        window.showInformationMessage('Open a data file to Preview.');
        return;
      }
    }
    const preview: DataPreview = new DataPreview(viewType,
      extensionPath, resource, 
      '', // default data table
      {}, // data view config
      {}, // other data views
      viewColumn, viewTemplate);
    previewManager.add(preview);
    return preview.webview;
  });
  return dataWebview;
}

/**
 * Checks if the vscode text document is a data file.
 * @param document The vscode text document to check.
 */
function isDataFile(document: TextDocument): boolean {
  const fileName: string = path.basename(document.uri.fsPath);
  const fileExt: string = fileName.substr(fileName.lastIndexOf('.'));
  logger.debug('isDataFile(): document:', document);
  logger.debug('isDataFile(): file:', fileName);
  return DATA_FILE_EXTENSIONS.findIndex(dataFileExt => dataFileExt === fileExt) >= 0;
}

/**
 * Gets active editor view column for data preview display.
 */
function getViewColumn(): ViewColumn {
  const activeEditor = window.activeTextEditor;
  return activeEditor ? (activeEditor.viewColumn) : ViewColumn.One;
}
