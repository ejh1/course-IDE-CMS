import get from 'lodash/get';
import {ContentState, convertToRaw, convertFromRaw} from 'draft-js';
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
export const enum MyBlockTypes {
    EDITOR = 'EDITOR'
}
const blockTags: {[key: string]: string} = {
    'header-one': 'h1',
    'unstyled': 'p'
};
const blockToHTML = (entityMap: any, block: any) => {
    const {type, text} = block;
    const tag = blockTags[type];
    if (tag) {
        return `<${tag}>${text}</${tag}>`;
    }
    if (type == 'atomic') {
        const entity = entityMap[get(block, 'entityRanges[0].key')];
        if (entity && entity.type === MyBlockTypes.EDITOR) {
            const {value, formatted} = entity.data;
            return `<div class="code-block" data-value="${encodeURIComponent(value)}">${formatted}</div>`;
        }
    }
}
export const convertDraftToHTML = (contentState: ContentState): string => {
    const raw = convertToRaw(contentState);
    const {blocks, entityMap} = raw;
    return `<html><head><meta charset="utf-8"></head><body data-raw="${encodeURIComponent(JSON.stringify(raw))}">${
        blocks.map(blockToHTML.bind(null, entityMap)).join('')
    }</body></html>`;
}
export const convertHTMLToDraft = (html: string): ContentState => {
    const match = html.match(/data-raw="([^"]+)"/);
    if (match) {
        const json = decodeURIComponent(match[1]);
        return convertFromRaw(JSON.parse(json));
    }
}