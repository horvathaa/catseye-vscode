/*
 *
 * authorOperationButtons.tsx
 * Component which contains buttons an annotation author can see on their annotation to edit or delete the annotation.
 *
 */
import * as React from 'react'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CatseyeButton from './CatseyeButton'

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
            <CatseyeButton
                buttonClicked={editAnnotation}
                name="Edit"
                icon={<EditIcon fontSize="small" />}
            />
            <CatseyeButton
                buttonClicked={deleteAnnotation}
                name="Delete"
                icon={<DeleteIcon fontSize="small" />}
            />
        </React.Fragment>
    )
}

export default AuthorOperationButtons
