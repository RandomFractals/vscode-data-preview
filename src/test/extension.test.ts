import * as vscode from 'vscode';
import * as assert from 'assert';
// see https://mochajs.org/ for help

suite('Data Preview Extension Tests', function() {
  test('should find extension', async () => {
    const extension = await vscode.extensions.getExtension('randomfractalsinc.vscode-data-preview');
    assert(extension);
  });
});
