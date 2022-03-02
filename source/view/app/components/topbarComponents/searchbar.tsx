import * as React from 'react';
import { Annotation } from '../../../../constants/constants';
import { BiSearch } from 'react-icons/bi';
import styles from '../../styles/topbar.module.css';

interface Props {
    annotations: Annotation[],
    getSearchedAnnotations: (annotations: Annotation[]) => void;
}

const SearchBar: React.FC<Props> = ({ annotations, getSearchedAnnotations }) => {
    const [searchedAnnotations, setSearchedAnnotations] = React.useState([]);
    const [value, setValue] = React.useState('');
    const fields = ['annotation']
    const complex = ['anchors']
    const replies = ['replies']
    // const link = ['url']

    const onChange = (value: string) => {
        // now, with the filtered array of rows, we can send this back to dashboard and it can send these annotations to the card view
        // or to the table view
        // this solution is adapted from here: https://stackoverflow.com/questions/8517089/js-search-in-object-values
        const filtered = annotations?.filter((anno) => {
            // const links = anno.anchors.map(a => a.visiblePath);
            // row.values are the annotation properties that we search on 
            // including author, childAnchor, content, createdTimestamp, id, type, and url
            // for making this approach work with both card view and table view, we could abstract
            // this into a list of properties to search on and access the values within the annotation object
            return Object.keys(anno).some(function (key) {
                if (fields.includes(key)) {
                    return anno[key] !== undefined ? anno[key].toLowerCase().includes(value.toLowerCase()) : false
                }
                else if (complex.includes(key)) {
                    const arr = anno[key];
                    let r = arr.map((a: any) => {
                        const inAnchor = a['anchorText'] ? a['anchorText'].toLowerCase().includes(value.toLowerCase()) : false;
                        const inFile = a['visiblePath'] ? a['visiblePath'].toLowerCase().includes(value.toLowerCase()) : false;
                        // const inTags = a['tags'] ? a['tags'].includes(value.toLowerCase()) : false;
                        return inAnchor || inFile;
                    })
                    return r.includes(true);
                }
                else if (replies.includes(key)) {
                    let q = Array.isArray(anno[key]) ? anno[key].map((a: {[key: string] : any}) => {
                        let b = false;
                        return a['replyContent'].toLowerCase().includes(value.toLowerCase()) || b
                    }) : [anno[key] === value];
                    return q.includes(true);
                }
                // else if (links.includes(key)) {
                //     let l = Array.isArray(anno[key]) ? anno[key].map(a => {
                //         return a.includes(value)
                //     }) : [anno[key] === value];
                //     return l.includes(true);
                // }

            })
        });
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
                    <BiSearch className={styles["SearchIcon"]} />
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