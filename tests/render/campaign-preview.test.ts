import {it,expect} from 'vitest';
import {previewSetup} from '../../src/campaign/preview.dev';
import {saveSnapshot,readSave} from '../../src/session/storage';
it('loads the authored 7x9 two-goal fixture through strict validation in an isolated durable namespace',async()=>{
 const values=new Map<string,string>([['untouched-live-save','sentinel']]);const base={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const setup=previewSetup(base,new URLSearchParams('campaign-preview=1&fixture=tall'));const save=await setup.initial();
 expect(save.active.kind).toBe('campaign');if(save.active.kind!=='campaign')throw Error('wrong executor');expect(save.active.state.geometry.rows).toBe(9);expect(save.active.state.geometry.cols).toBe(7);expect(save.active.state.level.goals).toHaveLength(2);
 expect(saveSnapshot(setup.storage,save).ok).toBe(true);expect(readSave(setup.storage).status).toBe('loaded');expect(values.get('untouched-live-save')).toBe('sentinel');expect(readSave(base).status).toBe('empty');
});
