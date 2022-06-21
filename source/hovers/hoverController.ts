// import { CancellationToken, languages, Range, Disposable, Hover, Uri, MarkdownString, Position, TextDocument, DecorationOptions } from 'vscode';
// const maxSmallIntegerV8 = 2 ** 30; // Max number that can be stored in V8's smis (small integers)
// export class HoverController implements Disposable {
//     // private readonly _disposable: Disposable;
//     private _hoverProviderDisposable: Disposable | undefined;
//     private _uri: Uri | undefined;

//     constructor() {
//         // this._disposable;
//         this.register();
//     }

//     dispose() {
//         this._uri = undefined;
//         this._hoverProviderDisposable?.dispose();
//     }

//     async provideAnnotationCreationHover(
//         document: TextDocument,
//         position: Position,

//     ) : Promise<Hover | undefined> {

//         const range = document.validateRange(
//             new Range(
//                 position.line,
//                 position.character,
//                 position.line,
//                 maxSmallIntegerV8
//             )
//         )

//         console.log('creating hover???');

//         return new Hover(createAnnotationWebviewLink, range);


//     }

//     private register() {
//         const subscriptions = [];

//         subscriptions.push(
//             languages.registerHoverProvider(
//                 { scheme: "file" },
//                 {
//                     provideHover: this.provideAnnotationCreationHover
//                 },
//             ),
//         );
		

// 		this._hoverProviderDisposable = Disposable.from(...subscriptions);
//     }

//     // private annotationCreationMarkdown() {
     
//     //    return createAnnotationWebviewLink;
//     // }
// }