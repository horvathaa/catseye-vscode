import * as React from 'react';
import { Annotation, Reply } from '../../../../constants/constants';
import { BiSearch } from 'react-icons/bi';
import styles from '../../styles/topbar.module.css';

interface Props {
    annotations: Annotation[],
    getSearchedAnnotations: (annotations: Annotation[]) => void;
}

const SearchBar: React.FC<Props> = ({ annotations, getSearchedAnnotations }) => {
    const [searchedAnnotations, setSearchedAnnotations] = React.useState<Annotation[]>([]);
    const [value, setValue] = React.useState('');
    const fields = ['annotation']
    const complex = ['anchors']
    const replies = ['replies']
    // const link = ['url']

    const onChange = (value: string) => {
        // now, with the filtered array of rows, we can send this back to dashboard and it can send these annotations to the card view
        // or to the table view
        // this solution is adapted from here: https://stackoverflow.com/questions/8517089/js-search-in-object-values
        const filtered: Annotation[] = annotations ? annotations.filter((anno) => {
            // const links = anno.anchors.map(a => a.visiblePath);
            // row.values are the annotation properties that we search on 
            // including author, childAnchor, content, createdTimestamp, id, type, and url
            // for making this approach work with both card view and table view, we could abstract
            // this into a list of properties to search on and access the values within the annotation object
            return Object.keys(anno).some(function (key) {
                if (fields.includes(key)) {
                    return anno['annotation'] !== undefined ? anno['annotation'].toLowerCase().includes(value.toLowerCase()) : false
                }
                else if (complex.includes(key)) {
                    const arr = anno['anchors'];
                    let r = arr.map((a: any) => {
                        const inAnchor = a['anchorText'] ? a['anchorText'].toLowerCase().includes(value.toLowerCase()) : false;
                        const inFile = a['visiblePath'] ? a['visiblePath'].toLowerCase().includes(value.toLowerCase()) : false;
                        return inAnchor || inFile;
                    })
                    return r.includes(true);
                }
                else if (replies.includes(key)) {
                    let q = Array.isArray(anno['replies']) ? anno['replies'].map((a: Reply) => {
                        let b = false;
                        return a['replyContent'].toLowerCase().includes(value.toLowerCase()) || b
                    }) : [anno['replies'] === value];
                    return q.includes(true);
                }
                return false;
            });
        }) : [];
        setSearchedAnnotations(filtered);
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = (event.target as HTMLInputElement).value;
        setValue(newVal);
        if (newVal == null || newVal == "") {
            getSearchedAnnotations([]);
            setSearchedAnnotations([]);
        }
        else {
            onChange(newVal);
        }

    }

    const checkIfSubmit = (event: React.KeyboardEvent) => {
        if(event.key === 'Enter') {
            getSearchedAnnotations(searchedAnnotations.sort((a: Annotation, b: Annotation) => b.createdTimestamp - a.createdTimestamp));
        }
    }

    return (
        <div className={styles['TopRow']}>
            <div className={styles["SearchBarContainer"]}>
                <div className={styles["SearchIconOuter"]}>
                    <BiSearch className={styles["SearchIcon"]} onClick={() => getSearchedAnnotations(searchedAnnotations.sort((a: Annotation, b: Annotation) => b.createdTimestamp - a.createdTimestamp))} />
                </div>
                <div>
                    {' '}
                    <input
                        className={styles['inputBox']}
                        value={value || ''}
                        placeholder={`Search ${annotations.length} annotations...`}
                        onChange={handleChange}
                        onKeyDown={checkIfSubmit}
                    />
                </div>
            </div>
            {searchedAnnotations.length > 0 && <>
                {searchedAnnotations.length} results
            </>}
        </div>
    )
}

export default SearchBar;