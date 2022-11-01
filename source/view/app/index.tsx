/*
 *
 * index.tsx
 * Main file that actually defines and renders the catseye webview panel.
 * Note in webpack.config.js that this is the file pointed at for entry into the extension.
 *
 */
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import CatseyePanel from './catseye'
import { Annotation } from '../../constants/constants'
import { ColorTheme } from 'vscode'

declare global {
    // data that we want to pass from the extension into the webview
    interface Window {
        acquireVsCodeApi(): any
        data: Annotation[]
        colorTheme: ColorTheme
        userId: string
        username: string
        currentFile: string
        currentProject: string
        selection: string
        login: boolean
        newUser: boolean
        addEventListener(): any
    }
}

const vscode = window.acquireVsCodeApi()

// methods to recreate/re-render the webview
window.addEventListener('message', (event) => {
    const message = event.data
    // console.log('got this message', message, 'window', window)
    if (message.command === 'init') {
        ReactDOM.render(
            <CatseyePanel
                vscode={vscode}
                window={window}
                // showLogIn={window.login}
            />,
            document.getElementById('root')
        )
        return
    } else if (message.command === 'reload') {
        ReactDOM.render(
            <CatseyePanel
                vscode={vscode}
                window={window}
                // showLogIn={window.login}
                username={message.payload.username}
                userId={message.payload.userId}
            />,
            document.getElementById('root')
        )
    }
})

// render the panel
ReactDOM.render(
    <CatseyePanel
        vscode={vscode}
        window={window}
        // showLogIn={window.login}
    />,
    document.getElementById('root')
)
