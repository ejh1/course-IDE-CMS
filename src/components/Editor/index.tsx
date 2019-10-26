import React, {useState, useRef, useGlobal, useDispatch, useEffect } from 'reactn';
import {Editor, EditorState, KeyBindingUtil, convertToRaw, RichUtils} from 'draft-js';
import CodeEditor from '@components/CodeEditor';
import { convertDraftToHTML, convertHTMLToDraft } from '@utilities/EditorConversion';
import { Button, Switch } from 'antd';
import controls from './controls';

import 'draft-js/dist/Draft.css';
import './styles.scss';

interface IState {
    editorState: EditorState;
    readonly: boolean;
}
export default () => {
    const [editorState, setEditorState] = useState(EditorState.createEmpty());
    const [rawMode, setRawMode] = useState(false);
    const [rawData, setRawData] = useState('');
    const [readonly, setReadonly] = useState(false);
    const [changed, setChanged] = useState(false);
    const [files] = useGlobal('files');
    const [selectedFile] = useGlobal('selectedFile');
    const saveFile = useDispatch('saveFile');
    const editorRef = useRef<Editor>();

    useEffect(() => {
        const html = selectedFile && files[selectedFile.key] || '';
        const currentContent = html && convertHTMLToDraft(html);
        setEditorState(currentContent ? 
            EditorState.set(editorState, {currentContent}) :
            EditorState.createEmpty()
        );
        html && setRawData(html);
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

    const toggleRawMode = () => setRawMode(!rawMode);
    const rawDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setRawData(e.target.value);
        setChanged(true);
    }

    const handleReturn = (e: React.KeyboardEvent, editorState: EditorState) => {
        if (KeyBindingUtil.isSoftNewlineEvent(e)) {
            setEditorState(RichUtils.insertSoftNewline(editorState));
            return 'handled'
        }
        return 'not-handled';
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

    const save = () => saveFile(selectedFile.key, rawMode ? rawData : convertDraftToHTML(editorState.getCurrentContent()));

    return !selectedFile ? null : (
        <div className="editor-root">
            <div className="editor-title">
                <span>{selectedFile.name}</span>
                <Button onClick={save} type="primary" disabled={!changed}>שמירה</Button>
            </div>
            <div className="editor-controls">
                <Switch checkedChildren="HTML" unCheckedChildren="Editor" checked={rawMode} onChange={toggleRawMode}/>
                {!rawMode && controls.map((Control, idx) => <Control key={idx} editorState={editorState} onChange={onChange} />)}
            </div>
            <div className="editor-body">
                {rawMode ?
                    <textarea value={rawData} onChange={rawDataChange}/> :
                    <Editor
                        ref={editorRef}
                        editorState={editorState}
                        handleReturn={handleReturn}
                        onChange={onChange}
                        blockRendererFn={editorBlockRenderer}
                        readOnly={readonly}
                    />
                }
            </div>
        </div>
    );
}