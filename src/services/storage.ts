import { addReducers, setGlobal } from 'reactn';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/storage';
import undefined from 'firebase/auth';

export interface IFile {
    name: string;
    file: string;
}
export interface IFolder {
    files: IFile[];
    folders: IFile[];
}
export const isFolder = (file: string) => file.endsWith('.json');
export const ROOT_FOLDER = 'root.json';

const firebaseConfig = {
    apiKey: "AIzaSyDvSrdLS9tjp7_SINpB4YWDnYaJXT7Gr20",
    authDomain: "course-ide.firebaseapp.com",
    databaseURL: "https://course-ide.firebaseio.com",
    projectId: "course-ide",
    storageBucket: "course-ide.appspot.com",
    messagingSenderId: "2469232450",
    appId: "1:2469232450:web:66c0b72981410df02bd2db"
  };
const app = firebase.initializeApp(firebaseConfig);

let initialized = false;

const useLocal = false;
const fetchFile = async (file: string) => {
    if (useLocal) {
        // TODO - why does it have to be async
        return await new Promise(res => {
            setTimeout(() => res(localStorage[file]), 100);
        }) as string;
    }
    try {
        const url = await app.storage().ref().child(file).getDownloadURL();
        const response = await fetch(url);
        return response.text();
    } catch (er) {
        if (er.code && er.code === 'storage/object-not-found') {
            return null;
        } else {
            throw er;
        }
    }
}
export const initializeGlobalState = () => {
    if (initialized) {
        console.error('Already initialized');
        return;
    }
    initialized = true;
    setGlobal({
        folders : {},
        files: {}
    });    
    addReducers({
        setUser: (_global, _dispatch, user: object) => ({user}),
        login: async (_global, dispatch) => {
            let result = null;
            if (useLocal) {
                result = {user:{local:'user'}};
            } else {
                const provider = new firebase.auth.GoogleAuthProvider();
                result = await app.auth().signInWithPopup(provider);
            }
            dispatch.setUser(result.user);
            dispatch.getFolder(ROOT_FOLDER);
        },
        logout: async (_global, dispatch) => {
            await firebase.auth().signOut();
            dispatch.setUser(null);
        },
        setFolders: (global, _dispatch, folders: {[key: string]: IFolder}) => ({folders: {...global.folders, ...folders}}),
        getFolder: async (_global, dispatch, folder: string) => {
            const json = await fetchFile(folder);
            dispatch.setFolders({[folder]: json ? JSON.parse(json) : {}});
        },
        setFiles: (global, _dispatch, files: {[key: string]: string}) => ({files: {...global.files, ...files}}),
        getFile: async (global, dispatch, {file}: IFile) => {
            const text = await fetchFile(file);
            dispatch.setFiles({[file]:text});
        },
        selectFile: (global, dispatch, data: IFile) => {
            dispatch.getFile(data);
            return {selectedFile: data};
        },
        saveFile: async (_global, dispatch, file: string, content: string) => {console.log(content);
            const _isFolder = isFolder(file);
            if (useLocal) {
                localStorage[file] = content;
            } else {
                await app.storage().ref().child(file).putString(content,
                    undefined, {contentType: _isFolder ? 'application/json' : 'text/html'});
            }
            if (_isFolder) {
                dispatch.getFolder(file);
            } else {
                dispatch.getFile({file, name: ''})
            }
        }
    });
}