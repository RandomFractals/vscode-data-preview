import {Uri} from 'vscode';
import {getUri, fileRead} from '../file.utils.test';
import * as assert from 'assert';
import {AvroContentProvider} from "../../data.providers/avro.data.provider";

suite('Avro Data Provider Tests', () => {

  test('gets Avro data as json', (done) => {
    const avroJsonDataProvider = new AvroContentProvider('avro.data.json'); // view type
    ['person-10'].forEach(async (fileName) => {
      const avroJsonData = getUri(`${fileName}.avro`).then(avroFileUri => {
        return avroJsonDataProvider.provideTextDocumentContent(avroFileUri);
      });
      const expectedJsonData = fileRead(`${fileName}.avro.json`);
      Promise.all([avroJsonData, expectedJsonData])
        .then((values) => assert.strictEqual(values[0], values[1]))
        .then(done, done);
    });
  });

  test('error on missing Avro data file input', async () => {
    const avroJsonDataProvider = new AvroContentProvider('avro.data.json');
    return avroJsonDataProvider.provideTextDocumentContent(Uri.parse('file://.')).then(data => {
      assert(false, 'should not get here');
    }, (error: string) => {
      assert(error.indexOf('error when running avro data transform') !== -1);
    });
  });

  test('gets Avro data schema as json', (done) => {
    const avroJsonDataProvider = new AvroContentProvider('avro.data..schema.json'); // view type
    ['person-10'].forEach(async (fileName) => {
      const avroJsonData = getUri(`${fileName}.avro`).then(avroFileUri => {
        return avroJsonDataProvider.provideTextDocumentContent(avroFileUri);
      });
      const expectedJsonData = fileRead(`${fileName}.avro.schema.json`);
      Promise.all([avroJsonData, expectedJsonData])
        .then((values) => assert.strictEqual(values[0], values[1]))
        .then(done, done);
    });
  });

  test('error on missing Avro data file input', async () => {
    const avroJsonDataProvider = new AvroContentProvider('avro.data.schema.json');
    return avroJsonDataProvider.provideTextDocumentContent(Uri.parse('file://.')).then(data => {
      assert(false, 'should not get here');
    }, (error: string) => {
      assert(error.indexOf('error when running avro data transform') !== -1);
    });
  });

});
