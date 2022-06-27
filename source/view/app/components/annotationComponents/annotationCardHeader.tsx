import * as React from 'react'
import { CardActions } from '@material-ui/core'
import { TbAnchor, TbAnchorOff } from 'react-icons/tb'
import IconButton from '@mui/material/IconButton'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined'
import { Annotation } from '../../../../constants/constants'
import UserProfile from './userProfile'

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
                <div>
                    <IconButton size="small">
                        {anchored === true ? <TbAnchor /> : <TbAnchorOff />}
                    </IconButton>
                    "{anno.annotation}" at{' '}
                    {anno.anchors[0].anchorText.slice(0, 20)}
                    {anno.anchors[0].anchorText.length > 20 ? '...' : ''}
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
