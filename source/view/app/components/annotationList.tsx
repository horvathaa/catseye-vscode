import styles from '../styles/adamite.module.css';
import Annotation from '../../../constants/constants';
import ReactAnnotation from '../components/annotation';
import * as React from 'react';

interface AnnoListProps {
    annotations: Annotation[];
    vscode: any;
    window: Window;
    currentFile: string;
  }
  
const AnnotationList: React.FC<AnnoListProps> = ({ annotations, vscode, window, currentFile }) => {
    const showHideCluster = (e: any) => {
        const div = e.target.nextElementSibling;
        if(div.classList.contains(styles['showing'])) {
            div.classList.remove(styles['showing']);
            div.classList.add(styles['hiding']);
        }
        else {
            div.classList.remove(styles['hiding']);
            div.classList.add(styles['showing']);
        }
    }

    const createClusters = () => {
        let output : { [key: string] : any } = {
        'Current File': [],
        'Current Project': [],
        'Other Projects': []
        };
        annotations.forEach((a: Annotation) => {
        let file = a.visiblePath;
        const slash: string = a.visiblePath.includes('/') ? '/' : '\\';
        if(file === currentFile) {
            output['Current File'].push(a);
        }
        else if(a.visiblePath.split(slash)[0] === currentFile.split(slash)[0]) {
            output['Current Project'].push(a)
        }
        else {
            output['Other Projects'].push(a)
        }
        });
        const jsx : React.ReactElement[] = [];
        for(const key in output) {
        const header = output[key].length === 1 ? 'annotation' : 'annotations';
        jsx.push(
            <div>
            <div onClick={showHideCluster} id={key} className={styles['subheading']}>
                {key} ({output[key].length} {header})
            </div>
            <div className={styles['showing']}>
                {output[key].map((a: Annotation, index: number) => {
                    return <ReactAnnotation key={index} annotation={a} vscode={vscode} window={window} />
                })}
            </div>
            </div>
        )
        }

        return jsx;
    }

    return (
        <ul style={{ margin: 0, padding: '0px 0px 0px 0px' }}>
            {createClusters()}
        </ul>
    )
}

export default AnnotationList;