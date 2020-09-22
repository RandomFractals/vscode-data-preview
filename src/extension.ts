"use strict";
import {
  window, 
  workspace, 
  commands, 
  Disposable,
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  TextDocument,
  TextDocumentChangeEvent,
  TextDocumentContentProvider,
  Uri, 
  ViewColumn
} from 'vscode';
import * as path from 'path';
import * as config from './config';
import {Logger, LogLevel} from './logger';
import {DataPreview, DataPreviewSerializer} from './data.preview';
import {previewManager} from './preview.manager';
import {Template, ITemplateManager, TemplateManager} from './template.manager';

const logger: Logger = new Logger('data.preview:', config.logLevel);
let status: StatusBarItem;

/**
 * Activates this extension per rules set in package.json.
 * @param context vscode extension context.
 * @see https://code.visualstudio.com/api/references/activation-events for more info.
 */
export function activate(context: ExtensionContext) {
  const extensionPath: string = context.extensionPath;
  logger.debug('activate(): activating from extPath:', context.extensionPath);

  // initialize data preview webview panel html template
  const templateManager: ITemplateManager = new TemplateManager(context.asAbsolutePath('web'));
  const dataViewTemplate: Template = templateManager.getTemplate('data.view.html');
  
  // create extension status bar items
  status = window.createStatusBarItem(StatusBarAlignment.Right, 300); // left align priority
  status.text = ''; // '🈸 Activated!';
  status.show();
  
  // register Data preview serializer for restore on vscode restart
  window.registerWebviewPanelSerializer('data.preview', 
    new DataPreviewSerializer('data.preview', extensionPath, dataViewTemplate, status));

  // add Preview Data command
  const dataWebview: Disposable = 
    createDataPreviewCommand('data.preview', 'data.preview', extensionPath, dataViewTemplate);
  context.subscriptions.push(dataWebview);

  // add Preview Data on Side command
  const dataWebviewOnSide: Disposable = 
    createDataPreviewCommand('data.preview.on.side', 'data.preview', extensionPath, dataViewTemplate);
  context.subscriptions.push(dataWebviewOnSide);

  // add Preview Remote data command
  const dataWebviewRemote: Disposable = commands.registerCommand('data.preview.remote', () => {
    window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: 'https://',
      prompt: 'Enter remote data url'
    }).then((dataUrl: string) => {
      if (dataUrl && dataUrl !== undefined && dataUrl.length > 0) {
        const dataUri: Uri = Uri.parse(dataUrl);
        // launch new data preview
        commands.executeCommand('data.preview', dataUri);
      }  
    });
  });
  context.subscriptions.push(dataWebviewRemote);

  // refresh associated preview on data file save
  workspace.onDidSaveTextDocument((document: TextDocument) => {
    if (isDataFile(document)) {
      const dataUri: Uri = document.uri; // .with({scheme: 'data'});
      const previews: Array<DataPreview> = previewManager.find(dataUri);
      previews.forEach(preview => preview.refresh());
    }
  });

  // reset associated preview on data file change
  workspace.onDidChangeTextDocument((changeEvent: TextDocumentChangeEvent) => {
    if (isDataFile(changeEvent.document)) {
      const dataUri: Uri = changeEvent.document.uri; //.with({scheme: 'data'});
      const previews: Array<DataPreview> = previewManager.find(dataUri);
      if (previews && changeEvent.contentChanges.length > 0) {
        // TODO: add refresh interval before enabling this
        // previews.forEach(preview => preview.refresh());
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
  status.text = '';
  status.hide();
  // add other extension cleanup code here, if needed
}

/**
 * Creates a data preview command.
 * @param commandType Preview Data command type: data.preview || data.preview.on.side for now. 
 * @param viewType Preview Data view type: only data.preview for now. might add maps & help later.
 * @param extensionPath Extension path for loading scripts, styles, images and data templates.
 * @param viewTemplate Preview html template.
 */
function createDataPreviewCommand(
  commandType: string,
  viewType: string,
  extensionPath: string, 
  viewTemplate: Template): Disposable {
  const dataWebview: Disposable = commands.registerCommand(commandType, (uri) => {
    let resource: any = uri;
    let viewColumn: ViewColumn = getViewColumn();
    if (commandType.endsWith('.on.side')) {
      // bump view column
      viewColumn++;
    }
    if (!(resource instanceof Uri)) {
      if (window.activeTextEditor) {
        resource = window.activeTextEditor.document.uri;
      } else {
        window.showInformationMessage('Open a Data file to Preview.');
        return;
      }
    }
    const preview: DataPreview = new DataPreview(viewType,
      extensionPath, resource, 
      '', // default data table
      {}, // data view config
      {}, // other data views
      viewColumn, viewTemplate);
    preview.status = status;
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
  logger.debug('isDataFile(): document:', document);
  logger.debug('isDataFile(): file:', fileName);
  return config.supportedDataFiles.test(fileName);
}

/**
 * Gets active editor view column for data preview display.
 */
function getViewColumn(): ViewColumn {
  const activeEditor = window.activeTextEditor;
  return activeEditor ? (activeEditor.viewColumn) : ViewColumn.One;
}
