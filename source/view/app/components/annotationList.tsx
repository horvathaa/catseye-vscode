import styles from '../styles/adamite.module.css';
import Annotation from '../../../constants/constants';
import ReactAnnotation from '../components/annotation';
import * as React from 'react';

interface AnnoListProps {
    annotations: Annotation[];
    vscode: any;
    window: Window;
    currentFile: string;
    currentProject: string;
    username: string;
    userId: string;
  }
  
const AnnotationList: React.FC<AnnoListProps> = ({ annotations, vscode, window, currentFile, currentProject, username, userId }) => {
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

    React.useEffect(() => {
        if(annotations.length) {
            createClusters();
        }
    }, []);

    const transmitSelected = (id: string) : void => {
        selectedIds.includes(id) ? setSelectedIds((selectedIds) => selectedIds.filter(annoId => annoId !== id)) : setSelectedIds((selectedIds) => selectedIds.concat([id]));
    }

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

    const createClusters = () : React.ReactElement<any>[] => {
        let output : { [key: string] : any } = {
            'Selected': [],
            'Current File': [],
            'Current Project': [],
            'Other Projects': []
        };
        annotations.forEach((a: Annotation) => {
            if(selectedIds.includes(a.id)) {
                output['Selected'].push(a);
            }
            else if(a.filename === currentFile) {
                output['Current File'].push(a);
            }
            else if(a.projectName === currentProject) {
                output['Current Project'].push(a);
            }
            else {
                output['Other Projects'].push(a);
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
                        {output[key].map((a: Annotation) => {
                            return <ReactAnnotation
                                      key={'annotation'+a.id} 
                                      annotation={a} 
                                      vscode={vscode} 
                                      window={window} 
                                      username={username}
                                      userId={userId}
                                      initialSelected={selectedIds.includes(a.id)}
                                      transmitSelected={transmitSelected}
                                    />
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