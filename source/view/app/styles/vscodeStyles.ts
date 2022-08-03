// plain text color
export const vscodeTextColor: string = getComputedStyle(
    document.body
).getPropertyValue('--vscode-foreground')

// disabled text color
export const vscodeDisableTextColor: string = getComputedStyle(
    document.body
).getPropertyValue('--vscode-disabledForeground')

export const editorForeground: string = getComputedStyle(
    document.body
).getPropertyValue('--vscode-editor-foreground')

export const editorDescForeground: string = getComputedStyle(
    document.body
).getPropertyValue('--vscode-descriptionForeground')

export const editorBackground: string = getComputedStyle(
    document.body
).getPropertyValue('--vscode-editor-background')

export const hoverBackground: string = getComputedStyle(
    document.body
).getPropertyValue('--vscode-button-secondaryHoverBackground')

export const iconColor: string = getComputedStyle(
    document.body
).getPropertyValue('--vscode-icon-foreground')

export const vscodeBorderColor: string = getComputedStyle(
    document.body
).getPropertyValue('--vscode-focusBorder')

export const hoverText: string = getComputedStyle(
    document.body
).getPropertyValue('--vscode-input-foreground')

export const codeColor: string = getComputedStyle(
    document.body
).getPropertyValue('--vscode-input-foreground')

export const disabledIcon: string = getComputedStyle(
    document.body
).getPropertyValue('--vscode-disabledForeground')
