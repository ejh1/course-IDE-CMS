import React, {useState, useRef, useGlobal, useDispatch} from 'reactn';
import { FunctionComponent, useEffect } from 'react';
import {Editor, EditorState, RichUtils, AtomicBlockUtils, convertToRaw} from 'draft-js';
import CodeEditor from '@components/CodeEditor';
import { convertDraftToHTML, MyBlockTypes, convertHTMLToDraft } from '@utilities/EditorConversion';
import { Button } from 'antd';

import 'draft-js/dist/Draft.css';
import './styles.scss';

interface IControlProps {
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
const BlockType = ({editorState, onChange}: IControlProps) => {
    let current = blockTypes[0].style;
    try {
        current = RichUtils.getCurrentBlockType(editorState);
    } catch (er) {}
    const onSelect = (e: React.ChangeEvent<HTMLSelectElement>) => onChange(RichUtils.toggleBlockType(editorState, e.target.value));
    return <select value={current} onChange={onSelect}>
        {blockTypes.map(({label, style}) => <option key={label} value={style}>{label}</option>)}
    </select>
}

const AddEditor = ({editorState, onChange}: IControlProps) => {
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
const controls: FunctionComponent<IControlProps>[] = [
    BlockType,
    AddEditor
];
interface IState {
    editorState: EditorState;
    readonly: boolean;
}
export default () => {
    const [editorState, setEditorState] = useState(EditorState.createEmpty());
    const [readonly, setReadonly] = useState(false);
    const [changed, setChanged] = useState(false);
    const [files] = useGlobal('files');
    const [selectedFile] = useGlobal('selectedFile');
    const saveFile = useDispatch('saveFile');
    const editorRef = useRef<Editor>();

    useEffect(() => {
        const html = selectedFile && files[selectedFile.file] || '';
        setEditorState(html ? 
            EditorState.set(editorState, {currentContent: convertHTMLToDraft(html)}) :
            EditorState.createEmpty()
        );
        setChanged(false);
    }, [selectedFile, files]);
    const setCode = (entityKey: string, data: any) => {
        setEditorState(EditorState.set(editorState, {
            currentContent : editorState.getCurrentContent().replaceEntityData(entityKey, data)
        }));
    }
    const onChange = (editorState: EditorState) => {
        setChanged(true);
        setEditorState(editorState);
    }

    const editorBlockRenderer = (block: any) => {
        if (block.getType() === 'atomic') {
            const entityKey = block.getEntityAt(0);
            const entity = editorState.getCurrentContent().getEntity(entityKey);
            return {
                component: CodeEditor,
                editable: false,
                props: {
                    data: entity.getData(),
                    setCode: setCode.bind(null, entityKey),
                    toggleReadonly: setReadonly
                }
            }
        }
        return null;
    }

    const save = () => saveFile(selectedFile.file, convertDraftToHTML(editorState.getCurrentContent()));

    // Temporary
    const htmlRef = useRef<HTMLIFrameElement>();
    const toHTML = () => {
        const html = convertDraftToHTML(editorState.getCurrentContent());
        htmlRef.current.contentDocument.documentElement.innerHTML = html;
    }
    const fromHTML = () => {
        const html = htmlRef.current.contentDocument.documentElement.innerHTML;
        setEditorState(EditorState.set(editorState, {currentContent: convertHTMLToDraft(html)}));
    }

    return !selectedFile ? null : (
        <div className="editor-root">
            <div className="editor-title">
                <span>{selectedFile.name}</span>
                <Button onClick={save} type="primary" disabled={!changed}>שמירה</Button>
            </div>
            <div className="editor-controls">
                {controls.map((Control, idx) => <Control key={idx} editorState={editorState} onChange={onChange} />)}
            </div>
            <div className="editor-body">
                <div className="editor">
                    <Editor
                        ref={editorRef}
                        editorState={editorState}
                        onChange={onChange}
                        blockRendererFn={editorBlockRenderer}
                        readOnly={readonly}
                    />
                </div>
                {/* <button onClick={toHTML}>To HTML</button>
                <button onClick={fromHTML}>From HTML</button>
                <div><iframe style={{width:'90vw',height:'50vh'}} ref={htmlRef}/></div> */}
            </div>
        </div>
    );
}