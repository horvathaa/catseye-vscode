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

interface Props {
    expanded: boolean
    setExpanded: (e: boolean) => void
    anchored: boolean
    anno: Annotation
}

const CardHeader = ({ expanded, setExpanded, anchored, anno }: Props) => {
    const handleMenuClick = () => {}
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
            <div>
                <IconButton size="small">
                    <CheckIcon />
                </IconButton>
                <IconButton size="small">
                    <DeleteIcon />
                </IconButton>
                {expanded === true ? (
                    <IconButton size="small" onClick={handleMenuClick}>
                        <MoreVertOutlinedIcon />
                    </IconButton>
                ) : null}
            </div>
        </div>
    )
}

export default CardHeader
