
	// // console.log('splce', splice);

	// let numLinesStart = 0;
	// let numCharactersStart = 0;
	// let numCharactersEnd = 0;
	// let tabSize = 4;
	// if(userTabSize && typeof userTabSize === 'number') {
	// 	tabSize = userTabSize;
	// }

	// if(isSingleLine) {
	// 	const substr = changeText.substring(0, changeText.indexOf(tokenizedAnchor[0]));
	// 	numLinesStart = substr.includes('\n') ? (substr.match(/\n/g) || []).length : 0;
	// 	for(let i = 0; i < substr.length; i++) {
	// 		switch(substr[i]) {
	// 			case ('\t'):
	// 				numCharactersStart += tabSize; // may need to get tab size from vscode somehow
	// 				break;
	// 			case ('\r'):
	// 				break;
	// 			default:
	// 				numCharactersStart++;
	// 				break;
	// 		}
	// 	}
	// 	const start = range.start.character + numCharactersStart - numWhiteSpacePreceding < 0 ? 0 : range.start.character + numCharactersStart - numWhiteSpacePreceding;
	// 	const newAnchor = { 
	// 		startLine: range.start.line + numLinesStart, 
	// 		startOffset: start, 
	// 		endLine: range.start.line + numLinesStart,
	// 		endOffset: range.start.character + numCharactersStart + anchor.length + numWhiteSpaceFollowing
	// 	}

	// 	return newAnchor;
	// }

	// if(arr !== -1 && backArr !== -1) {
	// 	const substr = changeText.substring(0, changeText.indexOf(tokenizedAnchor[0]))
	// 	numLinesStart = substr.includes('\n') ? (substr.match(/\n/g) || []).length : 0;
	// 	const lineIndex = numLinesStart ? substr.lastIndexOf('\n') : 0;
	// 	for(let i = lineIndex; i < substr.length - lineIndex; i++) {
	// 		switch(substr[i]) {
	// 			case ('\t'):
	// 				numCharactersStart += tabSize; // may need to get tab size from vscode somehow
	// 				break;
	// 			case ('\r'):
	// 				break;
	// 			default:
	// 				numCharactersStart++;
	// 				break;
	// 		}
	// 	}

	// 	// start of anchor should be {startLine: range.start.line + numLines, startOffset: numCharacters}

	// 	const backSubstr = anchor.includes('\n') ? anchor.substring(anchor.indexOf('\n')) : anchor;

	// 	const backLineIndex = anchor.includes('\n') ? backSubstr.lastIndexOf('\n') : 0;
	// 	const endOfAnchor = backSubstr.substring(backLineIndex + 1);

	// 	// now compare end of anchor to changeText to find where this occurs
	// 	const changeTextByNewline = changeText.split('\n').reverse();
	// 	const num = changeTextByNewline.findIndex((token: string) => token === endOfAnchor || token.includes(endOfAnchor));
	// 	let anchorEnd = 0;
	// 	if(num !== -1) {
	// 		const index = changeTextByNewline[num].indexOf(endOfAnchor);
	// 		anchorEnd = index + endOfAnchor.length;
	// 	}

	// 	for(let i = 0; i < anchorEnd; i++) {
	// 		switch(changeTextByNewline[num][i]) {
	// 			case ('\t'):
	// 				numCharactersEnd += tabSize; // may need to get tab size from vscode somehow
	// 				break;
	// 			case ('\r'):
	// 				break;
	// 			default:
	// 				numCharactersEnd++;
	// 				break;
	// 		}
	// 	}
	// }

	// const start = range.start.character + numCharactersStart - numWhiteSpacePreceding < 0 ? 0 : range.start.character + numCharactersStart - numWhiteSpacePreceding;
	// // console.log('start?', start, 'comp', range.start.character + numCharactersStart - numWhiteSpacePreceding)
	// const newAnchor = { 
	// 	startLine: range.start.line + numLinesStart, 
	// 	startOffset: start, 
	// 	endLine: range.start.line + anchorLength + numLinesStart,
	// 	endOffset: numCharactersEnd + numWhiteSpaceFollowing
	// }

	// // console.log('built this range', newAnchor)

	// return newAnchor;

	// const findBoundariesOfAnchor = (tokenizedText: string[], tokenizedSearchString: string[], startText: string, endText: string, broadSearch: boolean = false) : {[key: string] : any} => {
	// 	let tokenStart: number = 0;
	// 	let tokenEnd: number = 0;
	// 	let startCondition: boolean = false;
	// 	tokenizedText.forEach((t: string, index: number) => {
	// 		startCondition = broadSearch ? t.includes(startText) : t === startText;
	// 		if(startCondition) {
	// 			let i = index;
	// 			let j = 0;
	// 			let endCondition: boolean = false;
	// 			// ensure anchor text matches in its entirety
	// 			while(tokenizedText[i] && tokenizedSearchString[j] && broadSearch ? tokenizedText[i].includes(tokenizedSearchString[j]) : tokenizedText[i] === tokenizedSearchString[j]) {
	// 				endCondition = broadSearch ? tokenizedText[i].includes(endText) : tokenizedText[i] === endText;
	// 				if(endCondition) {
	// 					tokenStart = index;
	// 					tokenEnd = i;
	// 					break;
	// 				}
	// 				i++;
	// 				j++;
	// 			}
	// 		}
	// 	});
	
	// 	return {
	// 		tokenStart,
	// 		tokenEnd
	// 	};
	
	// }