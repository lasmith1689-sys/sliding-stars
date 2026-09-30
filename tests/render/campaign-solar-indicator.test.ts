import {Container,Graphics,Sprite,Text,Texture} from 'pixi.js';
import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import type {SolarCollector} from '../../src/campaign/mechanics/solar';
import {solarCoachCopy} from '../../src/ui/campaignCoach';
import {addSolarIndicator} from '../../src/render/campaign/solarIndicator';

function collector(levelId:number):SolarCollector {
 const state=loadCampaignLevel(getAuthoredLessonLevel(levelId)!);
 return state.fixtures.find((f):f is SolarCollector=>f.kind==='solar')!;
}
function readout(fixture:SolarCollector,texture:Texture){
 const node=new Container();addSolarIndicator(node,fixture,texture,80);
 const icon=node.children.find(child=>child.label==='solar-requested-terrain') as Sprite;
 const name=node.children.find(child=>child.label==='solar-terrain-name') as Text;
 const arcs=node.children.filter(child=>/^solar-charge-\d+-/.test(child.label)) as Graphics[];
 return {icon,name,arcs};
}
it('uses the requested actual terrain texture and a readable charge ring for idle, partial, and ready collectors',()=>{
 const voidTile=Texture.WHITE,debrisTile=Texture.EMPTY;
 const idle=readout(collector(661),voidTile);
 expect(idle.icon.texture).toBe(voidTile);
 expect(idle.name.text).toBe('VOID');
 expect(idle.icon.width).toBeGreaterThan(25);
 expect(idle.arcs.map(arc=>arc.label)).toEqual(['solar-charge-0-empty']);
 expect(idle.arcs[0]!.getBounds().width).toBeGreaterThan(70);

 const partial=collector(663);partial.charge=1;
 const charging=readout(partial,voidTile);
 expect(charging.arcs.map(arc=>arc.label)).toEqual(['solar-charge-0-filled','solar-charge-1-empty']);
 partial.charge=2;
 expect(readout(partial,voidTile).arcs.map(arc=>arc.label)).toEqual(['solar-charge-0-filled','solar-charge-1-filled']);

 const tier2=readout(collector(662),debrisTile);
 expect(tier2.icon.texture).toBe(debrisTile);
 expect(tier2.name.text).toBe('DEBRIS');
 expect(tier2.arcs).toHaveLength(1);
});
it('names the requested terrain in live coach copy for both teaching tiers',()=>{
 expect(solarCoachCopy(loadCampaignLevel(getAuthoredLessonLevel(661)!))).toContain('Void');
 expect(solarCoachCopy(loadCampaignLevel(getAuthoredLessonLevel(662)!))).toContain('Debris');
});
