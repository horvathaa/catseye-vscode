import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as JSON5 from 'json5'

interface CommentConfig {
    lineComment?: string
    blockComment?: [string, string]
}

export class CommentConfigHandler {
    private readonly languageToConfigPath = new Map<string, string>()
    private readonly commentConfig = new Map<
        string,
        CommentConfig | undefined
    >()

    public constructor() {
        this.updateLanguagesDefinitions()
    }

    /**
     * Generate a map of language configuration file by language defined by extensions
     * External extensions can override default configurations os VSCode
     */
    public updateLanguagesDefinitions() {
        this.commentConfig.clear()

        for (const extension of vscode.extensions.all) {
            const packageJSON = extension.packageJSON as any
            if (packageJSON.contributes && packageJSON.contributes.languages) {
                for (const language of packageJSON.contributes.languages) {
                    if (language.configuration) {
                        const configPath = path.join(
                            extension.extensionPath,
                            language.configuration
                        )
                        this.languageToConfigPath.set(language.id, configPath)
                    }
                }
            }
        }
    }

    /**
     * Return the comment config for `languageCode`
     * @param languageCode The short code of the current language
     */
    public getCommentConfig(languageCode: string): CommentConfig | undefined {
        if (this.commentConfig.has(languageCode)) {
            return this.commentConfig.get(languageCode)
        }

        if (!this.languageToConfigPath.has(languageCode)) {
            return undefined
        }

        const file = this.languageToConfigPath.get(languageCode) as string
        // console.log('file', file)
        const content = fs.readFileSync(file, { encoding: 'utf8' })
        // console.log('content', content)
        try {
            // Using normal JSON because json5 behaved buggy.
            // Might need JSON5 in the future to parse language jsons with comments.
            // const config = JSON.parse(content)
            const config = JSON5.parse(content)

            this.commentConfig.set(languageCode, config.comments)
            return config.comments
        } catch (error) {
            console.error('error', error)
            this.commentConfig.set(languageCode, undefined)
            return undefined
        }
    }
}
