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

export const textBoxBackground: string = lightenDarkenColor(
    getComputedStyle(document.body).getPropertyValue(
        '--vscode-editor-background'
    ),
    10
)

export const adamiteGreen: string = '#7fae42'

function lightenDarkenColor(col, amt) {
    var usePound = false

    if (col[0] == '#') {
        col = col.slice(1)
        usePound = true
    }

    var num = parseInt(col, 16)

    var r = (num >> 16) + amt

    if (r > 255) r = 255
    else if (r < 0) r = 0

    var b = ((num >> 8) & 0x00ff) + amt

    if (b > 255) b = 255
    else if (b < 0) b = 0

    var g = (num & 0x0000ff) + amt

    if (g > 255) g = 255
    else if (g < 0) g = 0

    return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16)
}
