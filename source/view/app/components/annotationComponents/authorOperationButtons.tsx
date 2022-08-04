/*
 *
 * authorOperationButtons.tsx
 * Component which contains buttons an annotation author can see on their annotation to edit or delete the annotation.
 *
 */
import * as React from 'react'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import styles from '../../styles/annotation.module.css'
import { Tooltip } from '@material-ui/core'
import AdamiteButton from './AdamiteButton'

interface Props {
    editAnnotation: () => void
    deleteAnnotation: (e: React.SyntheticEvent) => void
}

const AuthorOperationButtons: React.FC<Props> = ({
    editAnnotation = () => {},
    deleteAnnotation = () => {},
}) => {
    return (
        <React.Fragment>
            <AdamiteButton
                buttonClicked={editAnnotation}
                name="Edit"
                icon={<EditIcon fontSize="small" />}
            />
            <AdamiteButton
                buttonClicked={deleteAnnotation}
                name="Delete"
                icon={<DeleteIcon fontSize="small" />}
            />
        </React.Fragment>
    )
}

export default AuthorOperationButtons
