import { Chip } from '@material-ui/core'
import * as React from 'react'
import { Type } from '../../../../constants/constants'

interface TypesProps {
    currentTypes: Type[]
    editTypes: (newTypes: Type[]) => void
}

const AnnotationTypesBar: React.FC<TypesProps> = ({
    currentTypes,
    editTypes,
}) => {
    const allTypes = Object.values(Type)
    const [types, setTypes] = React.useState<Type[]>(currentTypes)

    const handleAnnoClick = (selectedType: Type) => {
        let updatedTypes: Type[]
        if (types.includes(selectedType)) {
            updatedTypes = types.filter((obj) => obj !== selectedType)
        } else {
            types.push(selectedType)
            updatedTypes = types
        }
        setTypes(updatedTypes)
        editTypes(types)
    }

    return (
        <div>
            {allTypes.map((type: Type, id) => {
                return (
                    <Chip
                        key={id}
                        label={type}
                        variant={types.includes(type) ? 'default' : 'outlined'}
                        clickable
                        onClick={() => handleAnnoClick(type)}
                    />
                )
            })}
        </div>
    )
}

export default AnnotationTypesBar
