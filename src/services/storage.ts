import { addReducers, setGlobal } from 'reactn';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/storage';

export interface IFile {
    key: string;
    name: string;
    forInstructors?: boolean
}
export interface IFolder {
    children: IFile[];
}
export const isFolder = (file: string) => file.endsWith('.json');
export const ROOT_FOLDER = 'root.json';
export interface ILanguage {
    code: string;
    title: string;
    pathPrefix: string;
}
export const languages: ILanguage[] = [
    {
        code : 'he',
        title : 'עב',
        pathPrefix : ''
    },
    {
        code : 'ar',
        title : 'عر',
        pathPrefix : 'ar/'
    }
];
const defaultLanguage = languages[0];

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
        files: {},
        language: defaultLanguage
    });    
    addReducers({
        checkLogin: (global, dispatch) => {
            firebase.auth().onAuthStateChanged(dispatch.setUser);
        },
        setUser: (global, dispatch, user: firebase.User) => {
            if (user) {
                dispatch.setLanguage(global.language);
            }
            return {user};
        },
        login: async (global, dispatch) => {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await app.auth().signInWithPopup(provider);
            dispatch.setUser(result && result.user);
        },
        logout: async (_global, dispatch) => {
            await firebase.auth().signOut();
            dispatch.setUser(null);
        },
        setFolders: (global, _dispatch, folders: {[key: string]: IFolder}) => ({folders: {...global.folders, ...folders}}),
        getFolder: async (global, dispatch, folder: string) => {
            const json = await fetchFile(global.language.pathPrefix + folder);
            dispatch.setFolders({[folder]: json ? JSON.parse(json) : {children: []}});
        },
        setFiles: (global, _dispatch, files: {[key: string]: string}) => ({files: {...global.files, ...files}}),
        getFile: async (global, dispatch, {key}: IFile) => {
            const text = await fetchFile(global.language.pathPrefix + key);
            dispatch.setFiles({[key]:text});
        },
        selectFile: (global, dispatch, data: IFile) => {
            dispatch.getFile(data);
            return {selectedFile: data};
        },
        setLanguage: (global, dispatch, language: ILanguage) => {
            // Will reload the root from the new prefix
            setTimeout(() => dispatch.getFolder(ROOT_FOLDER), 1);
            return {language};
        },
        saveFile: async (global, dispatch, key: string, content: string) => {
            const _isFolder = isFolder(key);
            if (useLocal) {
                localStorage[key] = content;
            } else {
                await app.storage().ref().child(global.language.pathPrefix + key).putString(content,
                    undefined, {contentType: _isFolder ? 'application/json' : 'text/html'});
            }
            if (_isFolder) {
                dispatch.getFolder(key);
            } else {
                dispatch.getFile({key, name: ''})
            }
        }
    });
}