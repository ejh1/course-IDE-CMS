import React, { FunctionComponent } from 'react';
import {EditorState, RichUtils, AtomicBlockUtils} from 'draft-js';
import { Button } from 'antd';

import { MyBlockTypes } from '@utilities/EditorConversion';
export interface IControlProps {
    editorState: EditorState;
    onChange(es: EditorState): void;
}

const blockTypes = [
    { label: 'Normal', style: 'unstyled' },
    { label: 'H1', style: 'header-one' },
    { label: 'H2', style: 'header-two' },
    { label: 'H3', style: 'header-three' },
    { label: 'H4', style: 'header-four' },
    { label: 'H5', style: 'header-five' },
    { label: 'H6', style: 'header-six' },
    { label: 'Blockquote', style: 'blockquote' },
    { label: 'Code', style: 'code' },
];
interface ControlProps {
    editorState: EditorState;
    onChange(es: EditorState): void;
}

const useBlockType = ({editorState, onChange}: ControlProps): [string, (type: string) => void] => {
    let current = 'none';
    try {
        current = RichUtils.getCurrentBlockType(editorState);
    } catch (er) {}
    return [current, (type: string) => onChange(RichUtils.toggleBlockType(editorState, type))];
}
type EditorControl = FunctionComponent<ControlProps>;
const BlockType: EditorControl = (props) => {
    const [current, toggleBlockType] = useBlockType(props);
    const onSelect = (e: React.ChangeEvent<HTMLSelectElement>) => toggleBlockType(e.target.value);
    return <select value={current} onChange={onSelect}>
        {blockTypes.every(({style}) => style !== current) && <option value={current}>Block Type</option>}
        {blockTypes.map(({label, style}) => <option key={label} value={style}>{label}</option>)}
    </select>
}

const generateBlockTypeButton = (icon: string, blockType: string) => {
    return (props: ControlProps) => {
        const [current, toggleBlockType] = useBlockType(props);
        const onClick = () => toggleBlockType(blockType);
        return <Button icon={icon} onClick={onClick} className={(current === blockType) ? 'selected' : ''}/>
    }
}

export const inlineStyles = [
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "code",
    // "superscript",
    // "subscript"
]
const Inline: EditorControl = ({editorState, onChange}) => {
    const applyStyle = (e: React.MouseEvent<HTMLElement>) => {
        const style = ((e.target as any).getAttribute('name') as string).toUpperCase();
        onChange(RichUtils.toggleInlineStyle(editorState, style));
    }
    return <span className="inline-controls">{inlineStyles.map(style => <Button key={style} name={style} icon={style} onClick={applyStyle}/>)}</span>
}

const AddEditor: EditorControl = ({editorState, onChange}) => {
    const onClick = () => {
        const contentState = editorState.getCurrentContent();
        const contentStateWithEntity = contentState.createEntity(
            MyBlockTypes.EDITOR,
            'IMMUTABLE'
        );
        const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
        const stateWithNewContent = EditorState.set(editorState, {currentContent: contentStateWithEntity});
        const newState = AtomicBlockUtils.insertAtomicBlock(stateWithNewContent, entityKey, '*');
        onChange(newState);
    }
    return <Button onClick={onClick}>הכנסת קוד</Button>;
}

export default [
    BlockType,
    generateBlockTypeButton('ordered-list', 'ordered-list-item'),
    generateBlockTypeButton('unordered-list', 'unordered-list-item'),
    Inline,
    AddEditor,
]