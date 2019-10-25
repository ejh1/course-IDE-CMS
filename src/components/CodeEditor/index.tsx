import React from 'react';
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import debounce from 'lodash/debounce';

import './styles.scss';

interface IData {
    value: string;
    formatted: string;
}
interface IProps {
    blockProps: {
        data: IData,
        setCode: (data: IData) => void,
        toggleReadonly: (value: boolean) => void
    }
}
export default class CodeEditor extends React.Component<IProps> {
    setRef = (element: HTMLDivElement) => {
        this._container = element;
        this.componentWillUnmount();
        if (!element) {
            return;
        }
        this._editor = monaco.editor.create(element, {
            minimap:{enabled:false},
            automaticLayout: true,
            lineNumbersMinChars: 3,
            lineDecorationsWidth: 5,
            scrollBeyondLastLine: false
        });
        this._editor.onDidFocusEditorText(this.onFocus);
        this._editor.onDidBlurEditorText(this.onBlur);
        this._editor.onDidChangeModelContent(debounce(this.onCodeChange));
        this.updateModel();
    }
    getValue = (props: IProps) => {
        const {blockProps: {data}} = props;
        return data && data.value || '';
    }
    updateModel = () => {
        const model = monaco.editor.createModel(this.getValue(this.props), 'javascript');
        this._editor.setModel(model);
    }
    componentDidUpdate = (prevProps: IProps) => this.getValue(prevProps) !== this.getValue(this.props) && this.updateModel();
    componentWillUnmount = () => this._editor && this._editor.dispose();
    onFocus = () => this.props.blockProps.toggleReadonly(true);
    onBlur = () => this.props.blockProps.toggleReadonly(false);
    onCodeChange = () => {
        const model = this._editor.getModel();
        const height = model.getLineCount() * 19;
        this._container.style.height = height + 'px';
        this._editor.layout();
        this.props.blockProps.setCode({
            value: model.getValue(),
            formatted: (this._editor as any)._modelData.viewModel.getHTMLToCopy([model.getFullModelRange()], false)
        });
    }

    _container: HTMLDivElement = null;
    _editor: monaco.editor.IStandaloneCodeEditor = null;

    render() {
        return <div className="code-editor" ref={this.setRef} />;
    }
}