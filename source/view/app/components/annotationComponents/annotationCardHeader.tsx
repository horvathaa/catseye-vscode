import * as React from 'react'
import { TbAnchor, TbAnchorOff } from 'react-icons/tb'
import IconButton from '@mui/material/IconButton'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined'
import { Annotation } from '../../../../constants/constants'
import UserProfile from './userProfile'
import { codeColor } from '../../styles/vscodeStyles'
import styles from '../../styles/annotation.module.css'
import AdamiteButton from './AdamiteButton'

interface Props {
    expanded: boolean
    setExpanded: (e: boolean) => void
    anchored: boolean
    anno: Annotation
    resolveAnnotation: (e: React.SyntheticEvent) => void
    deleteAnnotation: (e: React.SyntheticEvent) => void
}

const CardHeader = ({
    expanded,
    setExpanded,
    anchored,
    anno,
    resolveAnnotation,
    deleteAnnotation,
}: Props) => {
    const handleMenuClick = () => {}
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
            }}
            onClick={() => setExpanded(!expanded)}
        >
            {expanded === false ? (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
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
                                {anno.anchors[0]?.anchorText.slice(0, 30)}
                                {anno.anchors[0]?.anchorText.length > 30
                                    ? '...'
                                    : ''}{' '}
                            </mark>
                        </div>
                        <div>{anno.annotation}</div>
                    </div>
                </div>
            ) : (
                <UserProfile
                    githubUsername={anno.githubUsername}
                    createdTimestamp={anno.createdTimestamp}
                />
            )}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                }}
            >
                <AdamiteButton
                    buttonClicked={resolveAnnotation}
                    name="Resolve"
                    icon={<CheckIcon fontSize="small" />}
                />
                <AdamiteButton
                    buttonClicked={deleteAnnotation}
                    name="Resolve"
                    icon={<DeleteIcon fontSize="small" />}
                />
                {expanded === true ? (
                    <AdamiteButton
                        buttonClicked={handleMenuClick}
                        name="More"
                        icon={<MoreVertOutlinedIcon fontSize="small" />}
                    />
                ) : null}
            </div>
        </div>
    )
}

export default CardHeader
