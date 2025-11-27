import * as vscode from 'vscode';
import * as path from 'path';
import { isAlternativeResourceFileName } from '../utils/resourceNaming';

export class AlternativeResourceDecorationProvider implements vscode.FileDecorationProvider {
  readonly onDidChangeFileDecorations?: vscode.Event<vscode.Uri | vscode.Uri[] | undefined>;

  provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
    const fileName = path.basename(uri.fsPath);
    if (isAlternativeResourceFileName(fileName)) {
      return {
        tooltip: '备选文件',
        color: new vscode.ThemeColor('disabledForeground')
      };
    }
    return undefined;
  }
}

