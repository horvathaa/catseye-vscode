import * as React from 'react'
import { TbAnchor, TbAnchorOff } from 'react-icons/tb'
import IconButton from '@mui/material/IconButton'
import CheckIcon from '@mui/icons-material/Check'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import DeleteIcon from '@mui/icons-material/Delete'
import ShareIcon from '@mui/icons-material/Share'
import PushPinIcon from '@mui/icons-material/PushPin'
import { Annotation } from '../../../../constants/constants'
import UserProfile, { UserIcon } from './userProfile'
import CatseyeButton from './CatseyeButton'
import { createTheme } from '@mui/material'
import { useMediaQuery } from '@material-ui/core'
import { breakpoints } from '../../utils/viewUtils'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import AnchorIcon from '@mui/icons-material/Anchor'

interface Props {
    expanded: boolean
    setExpanded: (e: boolean) => void
    anchored: boolean
    anno: Annotation
    resolveAnnotation: (e: React.SyntheticEvent) => void
    deleteAnnotation: (e: React.SyntheticEvent) => void
    pinAnnotation: (e: React.SyntheticEvent) => void
    shareAnnotation: (e: React.SyntheticEvent) => void
    addAnchor: () => void
    userId: string
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
    addAnchor,
    userId,
}: Props) => {
    const [annotation, setAnnotation] = React.useState<Annotation>(anno)
    React.useEffect(() => {
        setAnnotation(anno)
    }, [anno])

    const theme = createTheme({
        breakpoints: breakpoints,
    })

    const codeSize = useMediaQuery(theme.breakpoints.up('code'))
    const smCodeSize = useMediaQuery(theme.breakpoints.up('sm'))
    const slicedText: number = codeSize ? 30 : 15
    const isOwner = anno.authorId === userId

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
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <UserIcon
                            githubUsername={annotation.githubUsername}
                            style={{
                                width: '20px',
                                height: '20px',
                            }}
                            size={20}
                        />
                        <IconButton size="small">
                            {anchored === true ? <TbAnchor /> : <TbAnchorOff />}
                        </IconButton>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            marginLeft: 10,
                            justifyContent: 'center',
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
                    lastEditTime={annotation.lastEditTime}
                />
            )}
            {(smCodeSize || expanded) && (
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                    }}
                >
                    {expanded === true && anno.sharedWith != 'group' ? (
                        <CatseyeButton
                            buttonClicked={shareAnnotation}
                            name="Share"
                            icon={<ShareIcon fontSize="small" />}
                        />
                    ) : null}
                    {expanded === true && isOwner ? (
                        <CatseyeButton
                            buttonClicked={addAnchor}
                            name="Add Anchor"
                            icon={<AnchorIcon fontSize="small" />}
                        />
                    ) : null}

                    {isOwner ? (
                        anno.selected ? (
                            <CatseyeButton
                                buttonClicked={pinAnnotation}
                                name="Pin"
                                icon={<PushPinIcon fontSize="small" />}
                            />
                        ) : (
                            <CatseyeButton
                                buttonClicked={pinAnnotation}
                                name="Pin"
                                icon={<PushPinOutlinedIcon fontSize="small" />}
                            />
                        )
                    ) : null}
                    {isOwner ? (
                        anno.resolved ? (
                            <CatseyeButton
                                buttonClicked={resolveAnnotation}
                                name="Un-resolve"
                                icon={<CheckBoxIcon fontSize="small" />}
                            />
                        ) : (
                            <CatseyeButton
                                buttonClicked={resolveAnnotation}
                                name="Resolve"
                                icon={<CheckIcon fontSize="small" />}
                            />
                        )
                    ) : null}
                    {isOwner && (
                        <CatseyeButton
                            buttonClicked={deleteAnnotation}
                            name="Delete"
                            icon={<DeleteIcon fontSize="small" />}
                        />
                    )}
                </div>
            )}
        </div>
    )
}

export default CardHeader
