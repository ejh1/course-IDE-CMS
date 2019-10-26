import get from 'lodash/get';
import {ContentState, convertToRaw, convertFromRaw} from 'draft-js';
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
export const enum MyBlockTypes {
    EDITOR = 'EDITOR'
}
const blockTags: {[key: string]: string} = {
    'header-one': 'h1',
    'header-two': 'h2',
    'header-three': 'h3',
    'header-four': 'h4',
    'header-five': 'h5',
    'header-six': 'h6',
    'unordered-list-item': 'li',
    'ordered-list-item': 'li',
    'unstyled': 'p'
};
const inlineTags: {[key: string]: string} = {
    'BOLD' : 'strong',
    'ITALIC' : 'em',
    'UNDERLINE' : 'ins',
    'STRIKETHROUGH' : 'del',
    'CODE' : 'code'
}
type Block = ReturnType< typeof convertToRaw >['blocks'][0];
const blockToHTML = (entityMap: any, blocks: Block[], block: Block, idx: number) => {
    const {type, text, inlineStyleRanges} = block;
    const tag = blockTags[type];
    let content = text;
    if (tag) {
        let prefix = '', suffix = '';
        if (inlineStyleRanges.length) {
            const styleRanges: {offset: number, length: number, styles: string[]}[] = [];
            let lastRangeIndex = 0; // The index of the range containing the offset of the last handled inlineStyleRange
            inlineStyleRanges.forEach(({offset, length, style}) => {
                const myEnd = offset + length;
                for (let i = lastRangeIndex; i < styleRanges.length; i++) {
                    let range = styleRanges[i];
                    const rangeEnd = range.offset + range.length;
                    if (offset < rangeEnd) {
                        // If I start after, need to split off existing range start
                        if (offset > range.offset) {
                            const newLength = offset - range.offset;
                            const newRange = {offset, length: range.length - newLength, styles:[...range.styles]};
                            // Truncate existing range length
                            range.length = newLength;
                            styleRanges.splice(i+1,0,newRange);
                            lastRangeIndex = i+1;
                            // Continue in next round
                            continue;
                        }
                        // If we're here, offset == range.offset
                        lastRangeIndex = i;
                        if (myEnd > rangeEnd) {
                            range.styles.push(style);
                            continue;
                        }
                        // IF I end before - need to split off existing range end
                        if (myEnd < rangeEnd) {
                            const newRange = {offset: myEnd, length: rangeEnd - myEnd, styles: [...range.styles]};
                            range.length = myEnd - range.offset;
                            range.styles.push(style);
                            styleRanges.splice(i+1,0,newRange);
                        } else { // Ends are equal
                            range.styles.push(style);
                        }
                        return; // We're done
                    }
                }
                // If got here, we need to add a range
                const lastRange = styleRanges[styleRanges.length - 1];
                const lastRangeEnd = lastRange ? lastRange.offset + lastRange.length : 0;
                const newOffset = Math.max(lastRangeEnd, offset);
                styleRanges.push({offset: newOffset, length: myEnd - newOffset, styles: [style]});
                if (newOffset === offset) {
                    lastRangeIndex = styleRanges.length - 1;
                }
            });
            let suffixes: string[] = [];
            styleRanges.reverse().forEach(({offset, length, styles}) => {
                suffixes.unshift(content.substr(offset+length)); // Add the part after the range
                let body = content.substr(offset,length);
                styles.forEach(style => {
                    let tag = inlineTags[style];
                    body = `<${tag}>${body}</${tag}>`;
                });
                suffixes.unshift(body);
                content = content.substr(0, offset);
            });
            content += suffixes.join('');
        }
        if (tag === 'li') {
            const prevBlock = blocks[idx-1], nextBlock = blocks[idx+1];
            const listTag = type.startsWith('un') ? 'ul' : 'ol';
            if (!prevBlock || prevBlock.type !== type) {
                prefix = `<${listTag}>`;
            }
            if (!nextBlock || nextBlock.type !== type) {
                suffix = `</${listTag}>`
            }
        }
        return `${prefix}<${tag}>${content.replace(/\n/g,'<br>')}</${tag}>${suffix}`;
    }
    if (type == 'atomic') {
        const entity = entityMap[get(block, 'entityRanges[0].key')];
        if (entity && entity.type === MyBlockTypes.EDITOR) {
            const {value, formatted} = entity.data;
            return `<div class="code-block" data-value="${encodeURIComponent(JSON.stringify({javascript:value}))}">${formatted}</div>`;
        }
    }
}
export const convertDraftToHTML = (contentState: ContentState): string => {
    const raw = convertToRaw(contentState);
    const {blocks, entityMap} = raw;
    return `<html><head><meta charset="utf-8"></head><body dir="rtl" data-raw="${encodeURIComponent(JSON.stringify(raw))}">${
        blocks.map(blockToHTML.bind(null, entityMap, blocks)).join('')
    }</body></html>`;
}
export const convertHTMLToDraft = (html: string): ContentState => {
    const match = html.match(/data-raw="([^"]+)"/);
    if (match) {
        const json = decodeURIComponent(match[1]);
        return convertFromRaw(JSON.parse(json));
    }
}