import React, {useDispatch, useGlobal, useState} from 'reactn';
import { IFile, ROOT_FOLDER, isFolder, IFolder } from '@services/storage';
import { Tree, Button } from 'antd';
import cloneDeep from 'lodash/cloneDeep';

const { TreeNode, DirectoryTree } = Tree;

import './styles.scss';

interface IProps {
    basePath: string;
}
const generateId = (length: number) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
 }

 const getEntities = (folder: IFolder, file: string): IFile[] => folder[isFolder(file) ? 'folders' : 'files'] || [];
 
export const Explorer = (props: IProps) => {
    const [folders] = useGlobal('folders');
    const getFolder = useDispatch('getFolder');
    const saveFile = useDispatch('saveFile');
    const selectFile = useDispatch('selectFile');
    const logout = useDispatch('logout');
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [selectedFolder, setSelectedFolder] = useState(null);

    const onSelect = (names: string[]) => {
        const selected = names[names.length-1];
        let selectedFolder = selected;
        if (!isFolder(selected)) {
            // Find the folder which includes the selected file
            selectedFolder = getContainingFolder(selected);
            selectFile(folders[selectedFolder].files.find(({file}) => file === selected));
        }
        setSelectedEntity(selected);
        setSelectedFolder(selectedFolder);
    };
    const displayFolder = (key: string) => {
        const folder = folders[key];
        return folder &&
            ((folder.folders || [])).map(({file, name}) =>
                <TreeNode title={name} key={file} loadData={loadFolder}>{displayFolder(file)}</TreeNode>)
            .concat
                (((folder.files || [])).map(({file, name}) => <TreeNode title={name} key={file} isLeaf/>));
    };
    const getContainingFolder = (child: string): string =>
        Object.keys(folders).find(key => getEntities(folders[key], child).some(({file}) => child === file)) || ROOT_FOLDER;

    const addToFolder = (isFolder: boolean) => {
        const folderName = selectedFolder || ROOT_FOLDER;
        const folder = folders[folderName];
        const newFile = {
            name: isFolder ? 'תיקייה חדשה' : 'קובץ חדש',
            file: `${generateId(8)}.${isFolder ? 'json' : 'html'}`
        }
        const newFolder = {...folder} as any;
        if (isFolder) {
            newFolder.folders = [...newFolder.folders || [], newFile];
        } else {
            newFolder.files = [...newFolder.files || [], newFile];
        }
        saveFile(folderName, JSON.stringify(newFolder));
    };
    const modifyContainingFolder = (modifier: (folder: IFolder) => IFolder | void) => {
        const containingFolderKey = getContainingFolder(selectedEntity);
        const modifiedFolder = modifier(cloneDeep(folders[containingFolderKey]));
        modifiedFolder && saveFile(containingFolderKey, JSON.stringify(modifiedFolder));
    }
    const rename = () => {
        modifyContainingFolder((folderClone: IFolder) => {
            const entity = getEntities(folderClone, selectedEntity).find(({file}) => file === selectedEntity);
            const newName = prompt('שם חדש', entity.name).trim();
            if (newName && newName != entity.name) {
                entity.name = newName.replace(/\s+/g, ' ');
                return folderClone;
            }    
        })
    }
    const deleteFile = () => {
        modifyContainingFolder((folderClone: IFolder) => {
            const entities = getEntities(folderClone, selectedEntity);
            const idx = entities.findIndex(({file}) => file === selectedEntity);
            const entity = entities[idx];
            if (entity && confirm(`Are you sure you want to delete the ${isFolder(selectedEntity) ? 'folder' : 'file'} ${entity.name}`)) {
                entities.splice(idx,1);
                return folderClone;
            }
        })
    }
    const loadFolder = async (treeNode: any) => {
        if (!folders[treeNode.props.eventKey]) {
            getFolder(treeNode.props.eventKey);
            // TODO - find a way to return a promise that resolves when the folder is returned   
        }
    }
    return <div>
        <div className="explorer-controls">
            <Button type="primary" onClick={logout}>יציאה</Button>
            <Button icon="folder-add" onClick={addToFolder.bind(null, true)} />
            <Button icon="file-add" onClick={addToFolder.bind(null, false)} />
            {selectedEntity && <span>
                <Button icon="delete" onClick={deleteFile} />
                <Button onClick={rename} >שינוי שם</Button>
            </span>}
        </div>
        <DirectoryTree
            loadData={loadFolder}
            onSelect={onSelect}
        >
            {displayFolder(ROOT_FOLDER)}
        </DirectoryTree>
    </div>;
}