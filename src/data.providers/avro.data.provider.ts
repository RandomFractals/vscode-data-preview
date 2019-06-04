import {
  window,
  EventEmitter,
  TextDocumentContentProvider,
  Uri
} from "vscode";
import * as fs from 'fs';
import * as avro from 'avsc';
import * as config from '../config';
import {Logger, LogLevel} from '../logger';

export class AvroContentProvider implements TextDocumentContentProvider {
  private logger = new Logger(`avro.data.provider:`, config.logLevel);

  /**
   * Creates new Avro data content provider for viewing 
   * Avro data and schema as json in a text editor.
   * @param viewType avro.data.json || avro.data.schema.json
   */
  constructor(private viewType: string = 'avro.data.json') {
    this.logger.debug('(): created for:', viewType);
  }

  /**
   * Provides Avro data JSON content.
   * @param uri Avro data file uri.
   */
  async provideTextDocumentContent(uri: Uri): Promise<string> {
    if (!uri && window.activeTextEditor !== undefined) { 
      // use open text editor uri
      uri = window.activeTextEditor.document.uri;
    }
    this.logger.debug('provideTextDocumentContent(): uri:', uri);

    return new Promise<string>((resolve, reject) => {
      // create json data file path
      const dataFilePath: string = uri.toString();
      let jsonFilePath: string = dataFilePath.replace('.avro', `.avro.json`);
      if (this.viewType === 'avro.data.schema.json') {
        jsonFilePath = dataFilePath.replace('.avro', `.avro.schema.json`);
      }

      // load Avro file data as JSON
      let dataRows: Array<any> = [];
      let dataSchema: any = {};
      let jsonString: string = '';
      this.logger.debug('provideTextDocumentContent(): loading Avro data...', dataFilePath);
      const dataBlockDecoder: avro.streams.BlockDecoder = avro.createFileDecoder(dataFilePath);
      dataBlockDecoder.on('metadata', (type: any) => {
        dataSchema = type;
        this.logger.debug('getAvroData(): data schema:', dataSchema);
        // save generated Avro data schema json
        jsonString = JSON.stringify(dataSchema, null, 2);
        fs.writeFile(jsonFilePath, jsonString, (error) => {
          if (error) {
            const errorMessage: string = `Failed to save file: ${jsonFilePath}`;
            this.logger.logMessage(LogLevel.Error, 'provideTextDocumentContent():', errorMessage);
            window.showErrorMessage(errorMessage);
          }
        });
        // post Avro schema json
        resolve(jsonString);
      });

      // process Avro data
      dataBlockDecoder.on('data', (data: any) => {
        dataRows.push(data);
      });
      dataBlockDecoder.on('end', () => {
        // save generated Avro data json
        jsonString = JSON.stringify(dataRows, null, 2);
        fs.writeFile(jsonFilePath, jsonString, (error) => {
          if (error) {
            const errorMessage: string = `Failed to save file: ${jsonFilePath}`;
            this.logger.logMessage(LogLevel.Error, 'provideTextDocumentContent():', errorMessage);
            window.showErrorMessage(errorMessage);
          }
        });
        // post Avro data json
        resolve(jsonString);
      });

      // TODO: add Avro data file load error handler
      // window.showErrorMessage(message);
      // reject(message);
    });
  }
}
