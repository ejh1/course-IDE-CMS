import React, {useDispatch, useGlobal, useState} from 'reactn';
import { IFile, ROOT_FOLDER, isFolder, IFolder } from '@services/storage';
import { Tree, Button } from 'antd';
import cloneDeep from 'lodash/cloneDeep';

const { TreeNode, DirectoryTree } = Tree;

import './styles.scss';
import { AntTreeNodeDropEvent } from 'antd/lib/tree/Tree';

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
            selectFile(folders[selectedFolder].children.find(({key}) => key === selected));
        }
        setSelectedEntity(selected);
        setSelectedFolder(selectedFolder);
    };
    const displayFolder = (key: string) => {
        const folder = folders[key];
        return folder && folder.children.map(({key, name}) => isFolder(key) ?
                <TreeNode title={name} key={key} loadData={loadFolder}>{displayFolder(key)}</TreeNode> :
                <TreeNode title={name} key={key} isLeaf/>);
    };
    const getContainingFolder = (child: string): string =>
        Object.keys(folders).find(key => folders[key].children.some(({key}) => child === key)) || ROOT_FOLDER;

    const addToFolder = (isFolder: boolean) => {
        const folderKey = selectedFolder || ROOT_FOLDER;
        const folder = folders[folderKey];
        const newFolder = cloneDeep(folder);
        newFolder.children.push({
            name: isFolder ? 'תיקייה חדשה' : 'קובץ חדש',
            key: `${generateId(8)}.${isFolder ? 'json' : 'html'}`
        });
        saveFile(folderKey, JSON.stringify(newFolder));
    };
    const modifyContainingFolder = (modifier: (folder: IFolder) => IFolder | void) => {
        const containingFolderKey = getContainingFolder(selectedEntity);
        const modifiedFolder = modifier(cloneDeep(folders[containingFolderKey]));
        modifiedFolder && saveFile(containingFolderKey, JSON.stringify(modifiedFolder));
    }
    const rename = () => {
        modifyContainingFolder((folderClone: IFolder) => {
            const entity = folderClone.children.find(({key}) => key === selectedEntity);
            const newName = prompt('שם חדש', entity.name).trim();
            if (newName && newName != entity.name) {
                entity.name = newName.replace(/\s+/g, ' ');
                return folderClone;
            }    
        })
    }
    const deleteFile = () => {
        modifyContainingFolder((folderClone: IFolder) => {
            const idx = folderClone.children.findIndex(({key}) => key === selectedEntity);
            const entity = folderClone.children[idx];
            if (entity && confirm(`Are you sure you want to delete the ${isFolder(selectedEntity) ? 'folder' : 'file'} ${entity.name}`)) {
                folderClone.children.splice(idx,1);
                return folderClone;
            }
        })
    }
    const onDrop = ({node, dragNode, dropPosition, dropToGap}: AntTreeNodeDropEvent) => {
        const dropKey = node.props.eventKey;
        const dragKey = dragNode.props.eventKey;
        // src
        const parent1Key = getContainingFolder(dragKey);
        const parent1 = cloneDeep(folders[parent1Key]);

        // dest
        let parent2Key = getContainingFolder(dropKey);
        let parent2 = (parent1Key === parent2Key) ? parent1 : cloneDeep(folders[parent2Key]);
        const destIdx = parent2.children.findIndex(({key}) => key === dropKey);
        
        // Remove from parent (after we got initial dest index)
        const [entity] = parent1.children.splice(parent1.children.findIndex(({key}) => key === dragKey), 1);
        
        if (isFolder(dropKey) && !dropToGap) {
            parent2Key = dropKey;
            parent2 = cloneDeep(folders[parent2Key]);
            parent2.children.push(entity);            
            // Append to target children
        } else {
            // dropPosition can be dropNode's index / +- 1 (drag before/on/after)
            const isAfter = dropPosition >= destIdx;
            const curDestIdx = parent2.children.findIndex(({key}) => key === dropKey);
            parent2.children.splice(isAfter ? curDestIdx+1 : curDestIdx, 0, entity);
        }
        saveFile(parent2Key, JSON.stringify(parent2));
        parent1Key != parent2Key && saveFile(parent1Key, JSON.stringify(parent1));
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
        <DirectoryTree draggable
            onDrop={onDrop}
            loadData={loadFolder}
            onSelect={onSelect}
        >
            {displayFolder(ROOT_FOLDER)}
        </DirectoryTree>
    </div>;
}