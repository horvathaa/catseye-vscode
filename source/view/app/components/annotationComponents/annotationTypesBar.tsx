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

    const handleAnnoClick = (selectedType: Type) => () => {
        let updatedTypes: Type[]
        if (types.includes(selectedType)) {
            updatedTypes = types.filter((obj) => obj !== selectedType)
            console.log('deleting', types)
        } else {
            types.push(selectedType)
            updatedTypes = types
            console.log('adding', types)
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
                        onClick={handleAnnoClick(type)}
                    />
                )
            })}
        </div>
    )
}

export default AnnotationTypesBar
