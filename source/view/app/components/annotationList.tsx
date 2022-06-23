/*
 *
 * annotationList.tsx
 * Component that takes annotations and segments them into each list we currently support
 * including pinned, current file, current project, other projects -> projects.
 *
 */
import styles from '../styles/adamite.module.css'
import { Annotation } from '../../../constants/constants'
import {
    // getAllAnnotationFilenames,
    getAllAnnotationStableGitUrls,
} from '../utils/viewUtils'
import ReactAnnotation from '../components/annotation'
import * as React from 'react'

interface AnnoListProps {
    annotations: Annotation[]
    vscode: any
    window: Window
    currentFile: string
    currentProject: string
    username: string
    userId: string
}

const AnnotationList: React.FC<AnnoListProps> = ({
    annotations,
    vscode,
    window,
    currentFile,
    currentProject,
    username,
    userId,
}) => {
    // console.log('currentFile in webview', currentFile);
    React.useEffect(() => {
        if (annotations.length) {
            createClusters()
        }
    }, [])

    React.useEffect(() => {}, [annotations])

    const showHideCluster = (e: any) => {
        const div = e.target.nextElementSibling
            ? e.target.nextElementSibling
            : e.target.parentNode.nextElementSibling
        if (div.classList.contains(styles['showing'])) {
            div.classList.remove(styles['showing'])
            div.classList.add(styles['hiding'])
        } else {
            div.classList.remove(styles['hiding'])
            div.classList.add(styles['showing'])
        }
    }

    // create "Other Projects" list and the nested lists shown underneath
    const createProjectsClusters = (otherProjects: {
        [key: string]: any
    }): React.ReactElement => {
        const projects: React.ReactElement[] = []
        const iterable = Object.keys(otherProjects)
            .sort()
            .reduce((obj: { [key: string]: any }, k: string) => {
                obj[k] = otherProjects[k]
                return obj
            }, {})
        for (const project in iterable) {
            let innerProject: React.ReactElement
            const header =
                otherProjects[project].length === 1
                    ? `${project} (${otherProjects[project].length} annotation)`
                    : `${project} (${otherProjects[project].length} annotations)`
            innerProject = (
                <div key={header + project}>
                    <div
                        onClick={showHideCluster}
                        id={header + '-wrapper'}
                        className={`${styles['subheading']} ${styles['sublist']}`}
                    >
                        {header}
                    </div>
                    <div className={styles['hiding']}>
                        {otherProjects[project]
                            .sort((a: Annotation, b: Annotation) =>
                                a.createdTimestamp < b.createdTimestamp ? 1 : -1
                            )
                            .map((a: Annotation) => {
                                return (
                                    <ReactAnnotation
                                        key={
                                            'annotationlist-project-cluster' +
                                            a.id
                                        }
                                        annotation={a}
                                        vscode={vscode}
                                        window={window}
                                        username={username}
                                        userId={userId}
                                    />
                                )
                            })}
                    </div>
                </div>
            )
            projects.push(innerProject)
        }

        return (
            <>
                <div
                    onClick={showHideCluster}
                    id={'other-projects-outer'}
                    className={`${styles['subheading']} ${styles['showing']}`}
                >
                    Other Projects ({projects.length} projects)
                </div>
                <ul style={{ margin: 0, padding: '0px 0px 0px 0px' }}>
                    {projects}
                </ul>
            </>
        )
    }

    // create all clusters
    const createClusters = (): React.ReactElement<any>[] => {
        const output: { [key: string]: any } = {
            Pinned: [],
            'Current File': [],
            'Current Project': [],
            'Other Projects': {},
        }
        annotations.forEach((a: Annotation) => {
            // const annoFiles = getAllAnnotationFilenames([a]);
            const annoFiles = getAllAnnotationStableGitUrls(a)
            if (a.selected) {
                output['Pinned'].push(a)
            } else if (annoFiles.includes(currentFile)) {
                output['Current File'].push(a)
            } else if (a.projectName === currentProject) {
                output['Current Project'].push(a)
            } else {
                output['Other Projects'][a.projectName] = output[
                    'Other Projects'
                ].hasOwnProperty(a.projectName)
                    ? [...output['Other Projects'][a.projectName], a]
                    : [a]
            }
        })
        const jsx: React.ReactElement[] = []
        for (const key in output) {
            if (key === 'Other Projects') {
                jsx.push(createProjectsClusters(output[key]))
            } else {
                const header =
                    output[key].length === 1 ? 'annotation' : 'annotations'
                const annotations =
                    key !== 'Current File'
                        ? output[key].sort((a: Annotation, b: Annotation) =>
                              a.createdTimestamp < b.createdTimestamp ? 1 : -1
                          )
                        : output[key]
                jsx.push(
                    <div key={key + '-annotationList'}>
                        <div
                            onClick={showHideCluster}
                            id={key}
                            className={styles['subheading']}
                        >
                            {key} ({output[key].length} {header})
                        </div>
                        <div className={styles['showing']}>
                            {annotations.map((a: Annotation) => {
                                return (
                                    <ReactAnnotation
                                        key={'annotationList-tsx-' + a.id}
                                        annotation={a}
                                        vscode={vscode}
                                        window={window}
                                        username={username}
                                        userId={userId}
                                    />
                                )
                            })}
                        </div>
                    </div>
                )
            }
        }
        return jsx
    }

    return (
        <ul style={{ margin: 0, padding: '0px 0px 0px 0px' }}>
            {createClusters()}
        </ul>
    )
}

export default AnnotationList
