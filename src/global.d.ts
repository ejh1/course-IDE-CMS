import 'reactn';
import { IFile, IFolder } from './services/storage';

declare module 'reactn/default' {
    interface Reducer<T, O> {
        (global: State, dispatch: Dispatch, value: T): O;
    }
    export interface Reducers {
        setUser: Reducer< State['user'], Pick< State, 'user'> >;
        login: Reducer<undefined, void>;
        logout: Reducer<undefined, void>;
        setFolders: Reducer< State['folders'], Pick<State, 'folders'> >;
        getFolder: Reducer< string, void>;
        setFiles: Reducer< State['files'], Pick<State, 'files'> >;
        getFile: Reducer< IFile, void>;
        selectFile: Reducer< IFile, Pick<State, 'selectedFile'> >;
        saveFile: (global: State, dispatch: Dispatch, name: string, content: string) => void;
     }
    export interface State {
        'folders': {[key: string]: IFolder};
        'files': {[key: string]: string};
        'user': object;
        'selectedFile': IFile;
    }
}