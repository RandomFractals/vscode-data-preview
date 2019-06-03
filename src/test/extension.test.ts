import * as vscode from 'vscode';
import * as assert from 'assert';
// see https://mochajs.org/ for help

suite("Data Preview Extension Tests", function() {
  test("Should find extension", async () => {
    const extension = await vscode.extensions.getExtension('RandomFractalsInc.vscode-data-preview');
    assert(extension);
  });
});
