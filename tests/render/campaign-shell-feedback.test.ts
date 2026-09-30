import {afterEach,expect,it,vi} from 'vitest';
import {CampaignShell} from '../../src/ui/campaignShell';
import {CampaignSession,createCampaignSave} from '../../src/session/campaignSession';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {MemoryStorage} from '../session/fixtures/legacy';

// Minimal DOM output surface: the real shell renders to these nodes; no game or
// message behavior is mocked, and no browser-only dependency is added to the project.
function setup(levelId=111){
 const elements=new Map<string,{textContent:string;innerHTML:string;disabled:boolean;addEventListener:()=>void}>();
 const element=(selector:string)=>{let value=elements.get(selector);if(!value){value={textContent:'',innerHTML:'',disabled:false,addEventListener(){}};elements.set(selector,value);}return value;};
 const root={classList:{add(){}},innerHTML:'',querySelector:element,querySelectorAll:()=>[element('#campaign-hint'),element('#campaign-guide'),element('#campaign-result')]};
 const dialog={addEventListener(){}};
 vi.stubGlobal('document',{getElementById:(id:string)=>id==='ui'?root:dialog});
 const game=new CampaignSession(createCampaignSave(getAuthoredLessonLevel(levelId)!),new MemoryStorage());
 const shell=new CampaignShell(game,{hint(){},restart(){},async next(){},power(){},preferences(){}},true);
 return {game,shell,coach:()=>element('#campaign-coach').textContent,practiceBanner:()=>element('#campaign-waves').textContent};
}
afterEach(()=>vi.unstubAllGlobals());
it('retains explicit preview ownership over pirate contextual coaching until reset',()=>{
 const {shell,coach}=setup(327);expect(coach()).toContain('Match beside the drone');
 shell.preview('One distraction point will clear.');shell.update();shell.update();expect(coach()).toBe('One distraction point will clear.');
 shell.preview(null);shell.update();expect(coach()).toContain('Match beside the drone');
});
it('retains owned targeted booster instructions through UI refreshes',()=>{
 const {game,shell,coach}=setup();expect(game.save.wallet.inventory.demo).toBe(1);
 shell.selected='demo';shell.preview('Demolition: tap empty terrain. Open Guide to change selection.');shell.update();shell.update();
 expect(coach()).toBe('Demolition: tap empty terrain. Open Guide to change selection.');
});
it('retains insufficient-credit purchase feedback without changing the wallet',()=>{
 const {game,shell,coach}=setup(),before=structuredClone(game.save.wallet);
 expect(game.purchase('tractor')).toBe(false);shell.preview('More credits needed. Earn them by merging and rescuing.');shell.update();
 expect(coach()).toBe('More credits needed. Earn them by merging and rescuing.');expect(game.save.wallet).toEqual(before);
});
it('returns to current contextual guidance only when explicitly reset',()=>{
 const {game,shell,coach}=setup();expect(coach()).toContain('upper-right Void');
 shell.preview('Demolition: tap empty terrain.');shell.update();expect(coach()).toBe('Demolition: tap empty terrain.');
 shell.preview(null);shell.update();expect(coach()).toContain('upper-right Void');
 if(game.save.active.kind!=='campaign')throw Error('Expected campaign');game.save.active.state.status='won';shell.update();expect(coach()).toContain('A safe departure!');
});
it('keeps jelly practice banner specific to jelly flights',()=>{
 const other=setup(756);if(other.game.save.active.kind!=='campaign')throw Error('Expected campaign');
 other.game.save.active.state.level.metadata.failurePolicy='no-failure';other.shell.update();
 expect(other.practiceBanner()).toBe('Practice flight · take as many moves as you need');
 const jelly=setup(711);if(jelly.game.save.active.kind!=='campaign')throw Error('Expected campaign');
 jelly.game.save.active.state.level.metadata.failurePolicy='no-failure';jelly.shell.update();
 expect(jelly.practiceBanner()).toBe('Practice flight · jelly keeps a route home open');
});
