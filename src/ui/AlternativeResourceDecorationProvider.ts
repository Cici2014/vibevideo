import * as vscode from 'vscode';
import * as path from 'path';
import { isAlternativeResourceFileName } from '../utils/resourceNaming';

export class AlternativeResourceDecorationProvider implements vscode.FileDecorationProvider {
  readonly onDidChangeFileDecorations?: vscode.Event<vscode.Uri | vscode.Uri[] | undefined>;

  provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
    const fileName = path.basename(uri.fsPath);
    if (isAlternativeResourceFileName(fileName)) {
      let tooltip = '备选文件';
      if (fileName.includes('-angle-')) {
        tooltip = '角度变体文件';
      } else if (fileName.includes('.o-')) {
        tooltip = '备选文件';
      } else if (fileName.includes('-edited')) {
        tooltip = '编辑后的文件';
      }
      return {
        tooltip,
        color: new vscode.ThemeColor('disabledForeground')
      };
    }
    return undefined;
  }
}

