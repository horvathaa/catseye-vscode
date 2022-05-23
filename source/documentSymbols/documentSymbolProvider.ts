import * as vscode from 'vscode';
import { DocumentSymbolProvider } from 'vscode';

class ADocumentSymbolProvider implements DocumentSymbolProvider {
    symbolStrList: string[];

    constructor(symbolStr: string[]) {
        this.symbolStrList = symbolStr;
    }

    public provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ) : vscode.SymbolInformation[] {

        const result: vscode.SymbolInformation[] = [];
        const symbolRegexps: RegExp[] = this.symbolStrList.map(str => new RegExp(str));

        for (let line = 0; line < document.lineCount; line++) {
            const { text } = document.lineAt(line);

            symbolRegexps.forEach(regexp => {
                let reg = regexp.exec(text);
                if (reg !== null) {
                    result.push(
                        new vscode.SymbolInformation(
                            reg[0],
                            vscode.SymbolKind.String,
                            reg[0],
                            new vscode.Location(document.uri, new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, text.length - 1)))
                        ));
                }
            });
        }

        return result;
    }


}

export const handleRegisterDocumentSymbolProvider = () : void => {
    vscode.languages.registerDocumentSymbolProvider(['*'], new ADocumentSymbolProvider(['*']));
}