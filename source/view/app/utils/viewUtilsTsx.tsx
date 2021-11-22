import { VscChevronDown, VscChevronRight } from 'react-icons/vsc';
import * as React from 'react';
import styles from '../styles/annotation.module.css';

export const collapseExpandToggle = (showing: boolean, obj: any[], callback: (bool: boolean) => void, subject: string) :  React.ReactElement<any> => {
	const plural: string = subject === 'reply' ? 'replies' : subject + 's';
    const subjectString: string = showing ? `Hide ${obj.length} ${obj.length === 1 ? subject : plural}` :
		`Show ${obj.length} ${obj.length === 1 ? subject : plural}`
	const icon: React.ReactElement<any> = !showing ? 
	( <VscChevronRight onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); callback(true); }} className={styles['IconContainer']} /> ) : 
		(<VscChevronDown onClick={(e: React.SyntheticEvent) => { e.stopPropagation(); callback(false); }} className={styles['IconContainer']} /> )
	return (
		<div className={styles['replyShowHide']}>
			{subjectString} {icon}
		</div>
	)
}