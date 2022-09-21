/*
 *
 * viewUtils.ts
 * Random functions the webview can access for random data finagling tasks
 * We need to use this as opposed to the regular utils.ts file since the webview
 * uses it's own tsconfig and building strategy.
 *
 */
import * as vscode from 'vscode'
import {
    AnchorObject,
    // AnchorOnCommit,
    Annotation,
    // PotentialAnchorObject,
    Scope,
    Sort,
} from '../../../constants/constants'

const translateAnnotationAnchorStandard = (
    annoInfo: any
): { [key: string]: any } => {
    return {
        id: annoInfo.id,
        annotation: annoInfo.annotation,
        anchors: [
            {
                anchor: {
                    startLine: annoInfo.startLine,
                    startOffset: annoInfo.startOffset,
                    endLine: annoInfo.endLine,
                    endOffset: annoInfo.endOffset,
                },
                anchorText: annoInfo.anchorText,
                html: annoInfo.html,
                filename: annoInfo.filename,
                gitUrl: annoInfo.gitUrl,
                stableGitUrl: annoInfo.stableGitUrl,
                visiblePath: annoInfo.visiblePath,
                anchorPreview: annoInfo.anchorPreview,
                programmingLang: annoInfo.programmingLang,
                anchorId: annoInfo.id + '-anchor-1',
                originalCode: annoInfo.originalCode,
                parentId: annoInfo.id,
            },
        ],
        deleted: annoInfo.deleted,
        outOfDate: annoInfo.outOfDate,
        authorId: annoInfo.authorId,
        createdTimestamp: annoInfo.createdTimestamp,
        gitRepo: annoInfo.gitRepo,
        gitBranch: annoInfo.gitBranch,
        gitCommit: annoInfo.gitCommit,
        projectName: annoInfo.projectName,
        githubUsername: annoInfo.githubUsername,
        replies: annoInfo.replies,
        outputs: annoInfo.outputs,
        codeSnapshots: annoInfo.codeSnapshots,
        sharedWith: annoInfo.sharedWith,
        selected: annoInfo.selected,
    }
}

export const buildAnnotation = (
    annoInfo: any,
    range: vscode.Range | undefined = undefined
): Annotation => {
    let annoObj = null
    if (
        annoInfo.hasOwnProperty('anchor') ||
        annoInfo.hasOwnProperty('anchorText')
    ) {
        annoObj = translateAnnotationAnchorStandard(annoInfo)
    } else if (!annoInfo.hasOwnProperty('lastEditTime')) {
        annoObj = { ...annoInfo, lastEditTime: new Date().getTime() }
    } else {
        annoObj = annoInfo
    }

    return new Annotation(
        annoObj['id'],
        annoObj['annotation'],
        annoObj['anchors'],
        annoObj['deleted'],
        annoObj['outOfDate'],
        annoObj['authorId'],
        annoObj['createdTimestamp'],
        annoObj['gitRepo'],
        annoObj['gitBranch'],
        annoObj['gitCommit'],
        annoObj['projectName'],
        annoObj['githubUsername'],
        annoObj['replies'],
        annoObj['outputs'],
        annoObj['codeSnapshots'],
        annoObj['sharedWith'],
        annoObj['selected'],
        annoObj['needToUpdate'],
        annoObj['lastEditTime'],
        annoObj['types'],
        annoObj['resolved']
    )
}

export const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
    ]
    const year = date.getFullYear()
    const month = months[date.getMonth()]
    const day = date.getDate()
    const hour = date.getHours()
    const min =
        date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()
    const time = hour + ':' + min + ' ' + day + ' ' + month + ' ' + year
    return time
}

export const areListsTheSame = (obj1: any, obj2: any): boolean => {
    for (var p in obj1) {
        //Check property exists on both objects
        if (obj1.hasOwnProperty(p) !== obj2.hasOwnProperty(p)) return false

        switch (typeof obj1[p]) {
            //Deep compare objects
            case 'object':
                if (areListsTheSame(obj1[p], obj2[p])) return false
                break
            //Compare function code
            case 'function':
                if (
                    typeof obj2[p] == 'undefined' ||
                    (p != 'compare' && obj1[p].toString() != obj2[p].toString())
                )
                    return false
                break
            //Compare values
            default:
                if (obj1[p] != obj2[p]) return false
        }
    }

    //Check object 2 for any extra properties
    for (var p in obj2) {
        if (typeof obj1[p] == 'undefined') return false
    }
    return true
}

export const getAllAnnotationFilenames = (
    annotationList: Annotation[]
): string[] => {
    let allFiles: string[] = []
    annotationList.forEach((a: Annotation) => {
        const files: string[] = [...new Set(a.anchors.map((a) => a.filename))]
        if (!allFiles.some((f) => files.includes(f))) {
            allFiles = [...new Set(allFiles.concat(files))]
        }
    })
    return allFiles
    // return [ ... new Set (annotationList.flatMap(a => a.anchors.map(a => a.filename))) ];
}

export const getAllAnnotationStableGitUrls = (
    annotationList: Annotation[] | Annotation
): string[] => {
    return Array.isArray(annotationList)
        ? [
              ...new Set(
                  annotationList.flatMap((a) =>
                      a.anchors.map((a) => a.stableGitUrl)
                  )
              ),
          ]
        : [...new Set(annotationList.anchors.map((a) => a.stableGitUrl))]
}

const sortAnchorsByLocation = (anchors: AnchorObject[]): AnchorObject[] => {
    return anchors.sort((a: AnchorObject, b: AnchorObject) => {
        return b.anchor.startLine - a.anchor.startLine === 0
            ? b.anchor.startOffset - a.anchor.startOffset
            : b.anchor.startLine - a.anchor.startLine
    })
}

// export const sortAnnotationsByLocation = (
//     annotationList: Annotation[]
// ): Annotation[] => {
//     const sortedAnchors: string[] = sortAnchorsByLocation(
//         annotationList.flatMap((a) => a.anchors)
//     ).map((a) => a.parentId)
//     annotationList.sort((a: Annotation, b: Annotation) => {
//         return sortedAnchors.indexOf(b.id) - sortedAnchors.indexOf(a.id)
//     })

//     return annotationList
// }

declare module '@mui/material/styles' {
    interface BreakpointOverrides {
        xs: true
        sm: true
        md: true
        lg: true
        xl: true
        code: true
    }
}

export const breakpoints = {
    values: {
        xs: 0,
        sm: 315,
        md: 350,
        lg: 650,
        xl: 900,
        code: 435,
    },
}

export const defaultSort = Sort.location

export const defaultScope = Scope.project

export const objectsEqual = (o1: any, o2: any): boolean =>
    typeof o1 === 'object' && Object.keys(o1).length > 0
        ? Object.keys(o1).length === Object.keys(o2).length &&
          Object.keys(o1).every((p) => objectsEqual(o1[p], o2[p]))
        : o1 === o2

// export const getAllAnnotationStableGitUrls = (
//         annotationList: Annotation[]
//     ): string[] => {
//     return [
//         ...new Set(
//             annotationList.flatMap((a) => a.anchors?.map((a) => a.stableGitUrl))
//         ),
//     ]
// }

export const getAnnotationsWithStableGitUrl = (
    annotationList: Annotation[],
    stableGitUrl: string
): Annotation[] => {
    return annotationList.filter((a) => {
        const annoUrls = getAllAnnotationStableGitUrls([a])
        return annoUrls.includes(stableGitUrl)
    })
}

export const getAnnotationsNotWithGitUrl = (
    annotationList: Annotation[],
    gitUrl: string
): Annotation[] => {
    return annotationList.filter((a) => {
        const annoUrls = getAllAnnotationStableGitUrls([a])
        return !annoUrls.includes(gitUrl)
    })
}

export const sortAnnotationsByLocation = (
    annotationList: Annotation[],
    gitUrl: string // pass
): Annotation[] => {
    const inFile: Annotation[] = getAnnotationsWithStableGitUrl(
        annotationList,
        gitUrl
    )
    const notInFile: Annotation[] = getAnnotationsNotWithGitUrl(
        annotationList,
        gitUrl
    )
    const sortedAnchors: string[] = sortAnchorsByLocation(
        //inFile
        inFile.flatMap((a) => {
            return a.anchors
        })
    ).map((a) => a.parentId)
    //inFile
    inFile.sort((a: Annotation, b: Annotation) => {
        return sortedAnchors.indexOf(b.id) - sortedAnchors.indexOf(a.id)
    })
    notInFile.sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    // inFile.concat(notInFile)

    return inFile.concat(notInFile)
}

export const sortAnnotationsByTime = (
    annotationList: Annotation[]
): Annotation[] => {
    // const sortedAnchors: string[] = sortAnchorsByLocation(
    //     annotationList.flatMap((a) => {
    //         return a.anchors
    //     })
    // ).map((a) => a.parentId)
    // annotationList.sort((a: Annotation, b: Annotation) => {
    //     return sortedAnchors.indexOf(b.id) - sortedAnchors.indexOf(a.id)
    // })

    return annotationList.sort(
        (a, b) => b.createdTimestamp - a.createdTimestamp
    )
}

export const buildEmptyAnnotation = (): Annotation => {
    const createdTimestamp = new Date().getTime()
    return buildAnnotation({
        id: '',
        annotation: '',
        anchors: [],
        deleted: false,
        outOfDate: false,
        authorId: '',
        createdTimestamp,
        gitRepo: '',
        gitCommit: '',
        gitBranch: '',
        projectName: '',
        githubUsername: '',
        replies: [],
        outputs: [],
        codeSnapshots: [],
        sharedWith: 'private',
        selected: false,
        needToUpdate: false,
        lastEditTime: createdTimestamp,
        types: [],
        resolved: false,
    })
}

// https://stackoverflow.com/questions/57102484/find-difference-between-two-strings-in-javascript
export function getStringDifference(a: string, b: string): string {
    var i = 0
    var j = 0
    var result = ''

    while (j < b.length) {
        if (a[i] != b[j] || i == a.length) result += b[j]
        else i++
        j++
    }
    return result
}

export const getActiveIndicatorIconProps = (versionsToRender: any[]): any => {
    return versionsToRender.length === 1
        ? { display: 'none' }
        : {
              color: 'white',
              '&:hover': {
                  color: '#7fae4285',
              },
              transition: '200ms',
          }
}

export const getIndicatorIconProps = (versionsToRender: any[]): any => {
    return versionsToRender.length === 1
        ? { display: 'none' }
        : {
              color: '#e3dfdf91',
              '&:hover': {
                  color: '##e3dfdf40',
              },
              transition: '200ms',
          }
}

export const pSBC = (p: any, c0: any, c1: any, l: any) => {
    let r: any,
        g: any,
        b: any,
        P: any,
        f: any,
        t: any,
        h: any,
        m = Math.round,
        a: any = typeof c1 == 'string'
    if (
        typeof p != 'number' ||
        p < -1 ||
        p > 1 ||
        typeof c0 != 'string' ||
        (c0[0] != 'r' && c0[0] != '#') ||
        (c1 && !a)
    )
        return null
    ;(h = c0.length > 9),
        (h = a ? (c1.length > 9 ? true : c1 == 'c' ? !h : false) : h),
        (f = pSBC.pSBCr(c0)),
        (P = p < 0),
        (t =
            c1 && c1 != 'c'
                ? pSBC.pSBCr(c1)
                : P
                ? { r: 0, g: 0, b: 0, a: -1 }
                : { r: 255, g: 255, b: 255, a: -1 }),
        (p = P ? p * -1 : p),
        (P = 1 - p)
    if (!f || !t) return null
    if (l)
        (r = m(P * f.r + p * t.r)),
            (g = m(P * f.g + p * t.g)),
            (b = m(P * f.b + p * t.b))
    else
        (r = m((P * f.r ** 2 + p * t.r ** 2) ** 0.5)),
            (g = m((P * f.g ** 2 + p * t.g ** 2) ** 0.5)),
            (b = m((P * f.b ** 2 + p * t.b ** 2) ** 0.5))
    ;(a = f.a),
        (t = t.a),
        (f = a >= 0 || t >= 0),
        (a = f ? (a < 0 ? t : t < 0 ? a : a * P + t * p) : 0)
    if (h)
        return (
            'rgb' +
            (f ? 'a(' : '(') +
            r +
            ',' +
            g +
            ',' +
            b +
            (f ? ',' + m(a * 1000) / 1000 : '') +
            ')'
        )
    else
        return (
            '#' +
            (
                4294967296 +
                r * 16777216 +
                g * 65536 +
                b * 256 +
                (f ? m(a * 255) : 0)
            )
                .toString(16)
                .slice(1, f ? undefined : -2)
        )
}

pSBC.pSBCr = (d: any) => {
    const i = parseInt
    let n: number = d.length,
        x: any = {}
    if (n > 9) {
        const [r, g, b, a] = (d = d.split(','))
        n = d.length
        if (n < 3 || n > 4) return null
        ;(x.r = i(r[3] == 'a' ? r.slice(5) : r.slice(4))),
            (x.g = i(g)),
            (x.b = i(b)),
            (x.a = a ? parseFloat(a) : -1)
    } else {
        if (n == 8 || n == 6 || n < 4) return null
        if (n < 6)
            d =
                '#' +
                d[1] +
                d[1] +
                d[2] +
                d[2] +
                d[3] +
                d[3] +
                (n > 4 ? d[4] + d[4] : '')
        d = i(d.slice(1), 16)
        if (n == 9 || n == 5)
            (x.r = (d >> 24) & 255),
                (x.g = (d >> 16) & 255),
                (x.b = (d >> 8) & 255),
                (x.a = Math.round((d & 255) / 0.255) / 1000)
        else
            (x.r = d >> 16), (x.g = (d >> 8) & 255), (x.b = d & 255), (x.a = -1)
    }
    return x
}
