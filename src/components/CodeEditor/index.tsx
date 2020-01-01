import React from 'react';
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import debounce from 'lodash/debounce';

import './styles.scss';

interface IData {
    value?: string; // deprecated
    values: {[key: string]: string};
    formatted: {[key: string]: string};
}
interface IProps {
    blockProps: {
        data: IData,
        setCode: (data: IData) => void,
        toggleReadonly: (value: boolean) => void
    }
}

export default class CodeEditor extends React.Component<IProps> {
    tabs: {name: string, lang: string, model?: monaco.editor.IModel, viewState?: any}[] = [
        {name: 'JavaScript', lang: 'javascript'},
        {name: 'HTML', lang: 'html'},
        {name: 'CSS', lang: 'css'}
    ];
    chosenTabIndex = 0;
    values: IData['values'] = {};
    formatted: IData['formatted'] = {};

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
        if (data) {
            let {values, formatted} = data;
            // Back compat - turn value and formatted into 
            if (!values) {
                values = {};
                if (data.value) {
                    values['javascript'] = data.value;
                }
            }
            if (!formatted || typeof formatted !== 'object') {
                const javascript: string = typeof formatted === 'string' ? formatted as string : '';
                formatted = {javascript};
            }
            return [values, formatted || {}];
        }
        return [{}, {}];
    }
    updateModel = () => {
        [this.values, this.formatted] = this.getValue(this.props);
        Object.keys(this.values).forEach(lang => {
            const tab = this.tabs.find(({lang: _lang}) => lang === _lang);
            let {model} = tab;
            if (!model) {
                model = tab.model = monaco.editor.createModel('', lang);
            }
            if (model.getValue() !== this.values[lang]) {
                model.setValue(this.values[lang]);
            }
        });
        this.chosenTabIndex = Math.max(0, this.tabs.findIndex(({lang}) => this.values[lang]));
        const tab = this.tabs[this.chosenTabIndex];
        if (!tab.model) {
            tab.model = monaco.editor.createModel('', tab.lang);
        }
        this._editor.setModel(tab.model);
        this.updateHeight();
        setTimeout(this.forceUpdate.bind(this), 50);
    }
    componentDidUpdate = (prevProps: IProps) => {
        const [values] = this.getValue(this.props);
        if (values && JSON.stringify(values) !== JSON.stringify(this.getValue(prevProps)[0])) {
            this.updateModel();
        }
    }
    componentWillUnmount = () => this._editor && this._editor.dispose();
    onFocus = () => this.props.blockProps.toggleReadonly(true);
    onBlur = () => this.props.blockProps.toggleReadonly(false);
    updateHeight = () => {
        const model = this._editor.getModel();
        if (this._container) {
            const height = (model.getLineCount() + 1) * 19;
            this._container.style.height = height + 'px';
            this._editor.layout();
        }
        return model;
    }
    onCodeChange = () => {
        const model = this.updateHeight();
        const lang = this.tabs[this.chosenTabIndex].lang;
        const value = model.getValue();
        const {values, formatted} = this;
        if (value) {
            values[lang] = value;
            formatted[lang] = (this._editor as any)._modelData.viewModel.getHTMLToCopy([model.getFullModelRange()], false);
        } else {
            delete values[lang];
            delete formatted[lang];
        }
        this.props.blockProps.setCode({values, formatted});
    }
    onTabSelect = (idx: number) => {
        this.chosenTabIndex = idx;
        const tab = this.tabs[idx];
        let model = tab.model || (tab.model = monaco.editor.createModel('', tab.lang));
        this._editor.setModel(model);
        this.updateHeight();
        this.forceUpdate();
    }

    _container: HTMLDivElement = null;
    _editor: monaco.editor.IStandaloneCodeEditor = null;

    render() {
        return <div className="code-editor">
            <div className="editor-tabs">
                {this.tabs.map(({name, lang}, idx) =>
                    <div
                        key={lang}
                        className={'tab' + (idx === this.chosenTabIndex ? ' selected' : '')}
                        onClick={this.onTabSelect.bind(this, idx)}
                    >
                        {name}
                    </div>)
                }
            </div>
            <div className="editor-body" ref={this.setRef} />
        </div>;
    }
}