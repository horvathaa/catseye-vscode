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
    // console.log('user', username, userId)
    // const [clusters, setClusters] = React.useState([]);

    React.useEffect(() => {
        if(annotations.length) {
            createClusters();
        }
    }, []);

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
        // console.log('calling this')
        let output : { [key: string] : any } = {
            'Current File': [],
            'Current Project': [],
            'Other Projects': []
        };
        annotations.forEach((a: Annotation) => {
            if(a.filename === currentFile) {
                output['Current File'].push(a);
            }
            else if(a.projectName === currentProject) {
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
                        {output[key].map((a: Annotation) => {
                            return <ReactAnnotation 
                                      key={a.id} 
                                      annotation={a} 
                                      vscode={vscode} 
                                      window={window} 
                                      username={username}
                                      userId={userId}
                                    />
                        })}
                    </div>
                </div>
            )
        }
        return jsx;
        // setClusters(jsx);
    }

    return (
        <ul style={{ margin: 0, padding: '0px 0px 0px 0px' }}>
            {createClusters()}
        </ul>
    )
}

export default AnnotationList;