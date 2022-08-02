import * as React from 'react'
import { TbAnchor, TbAnchorOff } from 'react-icons/tb'
import IconButton from '@mui/material/IconButton'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'
import ShareIcon from '@mui/icons-material/Share'
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined'
import PushPinIcon from '@mui/icons-material/PushPin'
import { Annotation } from '../../../../constants/constants'
import UserProfile from './userProfile'
import { codeColor } from '../../styles/vscodeStyles'
import styles from '../../styles/annotation.module.css'
import AdamiteButton from './AdamiteButton'
import { createTheme } from '@mui/material'
import { useMediaQuery } from '@material-ui/core'
import { breakpoints } from '../../utils/viewUtils'

interface Props {
    expanded: boolean
    setExpanded: (e: boolean) => void
    anchored: boolean
    anno: Annotation
    resolveAnnotation: (e: React.SyntheticEvent) => void
    deleteAnnotation: (e: React.SyntheticEvent) => void
    pinAnnotation: (e: React.SyntheticEvent) => void
    shareAnnotation: (e: React.SyntheticEvent) => void
}

const CardHeader = ({
    expanded,
    setExpanded,
    anchored,
    anno,
    resolveAnnotation,
    deleteAnnotation,
    pinAnnotation,
    shareAnnotation,
}: Props) => {
    const [annotation, setAnnotation] = React.useState<Annotation>(anno)
    React.useEffect(() => {
        console.log('card anno', anno)
        setAnnotation(anno)
    }, [anno])

    const theme = createTheme({
        breakpoints: breakpoints,
    })

    const codeSize = useMediaQuery(theme.breakpoints.up('code'))
    const smCodeSize = useMediaQuery(theme.breakpoints.up('sm'))
    const slicedText: number = codeSize ? 30 : smCodeSize ? 15 : 4

    console.log('sliced?', slicedText)
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
            }}
            onClick={() => setExpanded(!expanded)}
        >
            {expanded === false ? (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexGrow: 1,
                        flexWrap: 'wrap',
                    }}
                >
                    <IconButton size="small">
                        {anchored === true ? <TbAnchor /> : <TbAnchorOff />}
                    </IconButton>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div>
                            <mark>
                                {' '}
                                {annotation.anchors[0]?.anchorText.slice(
                                    0,
                                    slicedText
                                )}
                                {annotation.anchors[0]?.anchorText.length >
                                slicedText
                                    ? '...'
                                    : ''}{' '}
                            </mark>
                        </div>
                        <div>{annotation.annotation}</div>
                    </div>
                </div>
            ) : (
                <UserProfile
                    githubUsername={annotation.githubUsername}
                    createdTimestamp={annotation.createdTimestamp}
                />
            )}
            <div
                style={{
                    display: 'flex',
                }}
            >
                {expanded === true ? (
                    <AdamiteButton
                        buttonClicked={pinAnnotation}
                        name="Pin"
                        icon={<PushPinIcon fontSize="small" />}
                    />
                ) : null}
                {expanded === true ? (
                    <AdamiteButton
                        buttonClicked={shareAnnotation}
                        name="Share"
                        icon={<ShareIcon fontSize="small" />}
                    />
                ) : null}
                <AdamiteButton
                    buttonClicked={resolveAnnotation}
                    name="Resolve"
                    icon={<CheckIcon fontSize="small" />}
                />
                <AdamiteButton
                    buttonClicked={deleteAnnotation}
                    name="Delete"
                    icon={<DeleteIcon fontSize="small" />}
                />
            </div>
        </div>
    )
}

export default CardHeader
