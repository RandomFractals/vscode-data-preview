import { Uri, workspace } from "vscode";
import { readFile } from 'fs';
import * as assert from 'assert';

export async function getUri(fileName: String): Promise<Uri> {
  const testFiles = await workspace.findFiles(`**/${fileName}`);
  assert.equal(testFiles.length, 1);
  return testFiles[0];
}

export async function fileRead(fileName: string): Promise<string> {
  return getUri(fileName).then(uri => {
    return new Promise<string>(resolve => {
      readFile(uri.path, 'utf8', (err, data) => {
        assert.ifError(err);
        resolve(data);
      });
    });
  });
}
