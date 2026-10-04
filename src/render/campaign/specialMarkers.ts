import {Container,Graphics,Text} from 'pixi.js';
import type {Pos} from '../../core/types';

// Original little spacecraft parts, using the existing ivory / plum / teal art palette.
const ink=0x302c50,ivory=0xffefcc,teal=0x9cfff0,amber=0xffd080,plum=0xb99bea;
export type BeaconPhase='waiting'|'next'|'lit';
export type PadPhase='waiting'|'ready'|'departed';

function caption(parent:Container,text:string,x:number,y:number,ts:number,label:string):Text {
 const child=new Text({text,style:{fontFamily:'Nunito',fontSize:Math.max(9,Math.min(12,ts*.17)),fontWeight:'800',fill:ivory,stroke:{color:0x111832,width:3}}});
 child.label=label;child.anchor.set(.5);child.position.set(x,y);parent.addChild(child);return child;
}
function art(parent:Container,label:string):Graphics {const child=new Graphics();child.label=label;parent.addChild(child);return child;}

/** Beacon numbers are part of the art, so they remain readable above ordinary terrain. */
export function addRelayBeacon(parent:Container,order:number,phase:BeaconPhase,ts:number):Container {
 const node=new Container();node.label='relay-beacon';node.position.set(ts*.23,-ts*.16);parent.addChild(node);
 const g=art(node,'relay-body'),color=phase==='lit'?teal:phase==='next'?amber:plum,w=Math.max(1.5,ts*.026);
 g.roundRect(-ts*.2,-ts*.17,ts*.4,ts*.39,ts*.08).fill(ivory).stroke({color:ink,width:w});
 g.roundRect(-ts*.15,-ts*.12,ts*.3,ts*.25,ts*.05).fill(0x213e55).stroke({color,width:w});
 g.moveTo(0,-ts*.17).lineTo(0,-ts*.27).stroke({color:ink,width:w*1.6});
 g.circle(0,-ts*.29,ts*.045).fill(color).stroke({color:ink,width:w});
 for(const side of [-1,1])g.roundRect(side*ts*.22-ts*.035,ts*.03,ts*.07,ts*.14,ts*.02).fill(plum).stroke({color:ink,width:w});
 const lamp=art(node,'relay-light');lamp.circle(0,-ts*.29,ts*.045).fill(color);
 caption(node,String(order),0,-ts*.015,ts,'relay-number');
 node.alpha=phase==='waiting'?.76:1;return node;
}

export function addMagnetWinch(parent:Container,ts:number,waiting=false):Container {
 const node=new Container();node.label='magnet-winch';node.position.set(ts*.24,-ts*.15);parent.addChild(node);
 const g=art(node,'magnet-body'),w=Math.max(1.5,ts*.028),color=waiting?amber:teal;
 g.roundRect(-ts*.2,-ts*.12,ts*.4,ts*.32,ts*.07).fill(plum).stroke({color:ink,width:w});
 g.roundRect(-ts*.13,-ts*.06,ts*.26,ts*.2,ts*.05).fill(ivory).stroke({color:ink,width:w});
 // A horseshoe magnet, with a visible open center and two bright pole caps.
 g.moveTo(-ts*.15,-ts*.1).lineTo(-ts*.15,-ts*.24).quadraticCurveTo(0,-ts*.4,ts*.15,-ts*.24).lineTo(ts*.15,-ts*.1).stroke({color:ink,width:ts*.095,cap:'round'});
 g.moveTo(-ts*.15,-ts*.11).lineTo(-ts*.15,-ts*.23).quadraticCurveTo(0,-ts*.36,ts*.15,-ts*.23).lineTo(ts*.15,-ts*.11).stroke({color:plum,width:ts*.06,cap:'round'});
 for(const side of [-1,1])g.roundRect(side*ts*.15-ts*.052,-ts*.135,ts*.104,ts*.07,ts*.02).fill(color).stroke({color:ink,width:w});
 g.circle(0,ts*.04,ts*.07).fill(color).stroke({color:ink,width:w});
 return node;
}

/** Supply parcels and repair kits stay visibly different from passenger shuttles. */
export function addSupplyParcel(parent:Container,ts:number):Container {
 const node=new Container();node.label='magnet-parcel';parent.addChild(node);const g=art(node,'parcel-body'),w=Math.max(1.5,ts*.03);
 g.roundRect(-ts*.28,-ts*.23,ts*.56,ts*.48,ts*.08).fill(ivory).stroke({color:ink,width:w});
 g.rect(-ts*.04,-ts*.23,ts*.08,ts*.48).fill(plum);
 g.roundRect(-ts*.16,-ts*.28,ts*.32,ts*.09,ts*.035).fill(teal).stroke({color:ink,width:w});
 g.star(ts*.15,0,4,ts*.095,ts*.038).fill(amber).stroke({color:ink,width:w});
 return node;
}
export function addRepairKit(parent:Container,ts:number):Container {
 const node=new Container();node.label='repair-kit';parent.addChild(node);const g=art(node,'kit-body'),w=Math.max(1.5,ts*.03);
 g.roundRect(-ts*.27,-ts*.21,ts*.54,ts*.43,ts*.075).fill(0xa8dedb).stroke({color:ink,width:w});
 g.roundRect(-ts*.12,-ts*.29,ts*.24,ts*.12,ts*.04).stroke({color:ivory,width:w*1.3});
 g.roundRect(-ts*.23,-ts*.06,ts*.46,ts*.09,ts*.02).fill(ivory).stroke({color:ink,width:w});
 g.circle(0,ts*.09,ts*.065).fill(amber).stroke({color:ink,width:w});
 return node;
}
export function addRepairBot(parent:Container,ts:number,carrying:boolean):Container {
 const node=new Container();node.label='repair-bot';node.y=-ts*.04;parent.addChild(node);const g=art(node,'repair-body'),w=Math.max(1.5,ts*.028);
 for(const side of [-1,1])g.roundRect(side*ts*.2-ts*.065,ts*.17,ts*.13,ts*.1,ts*.03).fill(ink).stroke({color:plum,width:w});
 g.roundRect(-ts*.26,-ts*.2,ts*.52,ts*.42,ts*.12).fill(ivory).stroke({color:ink,width:w});
 g.roundRect(-ts*.19,-ts*.13,ts*.38,ts*.22,ts*.07).fill(0x24425a).stroke({color:teal,width:w});
 for(const side of [-1,1])g.circle(side*ts*.08,-ts*.03,ts*.035).fill(teal);
 g.moveTo(-ts*.05,ts*.035).quadraticCurveTo(0,ts*.065,ts*.05,ts*.035).stroke({color:teal,width:w,cap:'round'});
 g.moveTo(0,-ts*.2).lineTo(0,-ts*.29).stroke({color:ink,width:w*1.4});g.circle(0,-ts*.3,ts*.045).fill(amber).stroke({color:ink,width:w});
 for(const side of [-1,1])g.roundRect(side*ts*.285-ts*.055,-ts*.06,ts*.11,ts*.12,ts*.035).fill(plum).stroke({color:ink,width:w});
 if(carrying){const kit=addRepairKit(node,ts*.38);kit.label='repair-carried-kit';kit.position.set(ts*.21,ts*.17);}
 return node;
}

/** The rope stays behind the original crew portraits, preserving their two-cell footprint. */
export function addTetherHarness(parent:Container,offset:Pos,ts:number,gap:number):Container {
 const node=new Container();node.label='tether-harness';parent.addChild(node);const x=offset.c*(ts+gap),y=offset.r*(ts+gap),g=art(node,'tether-rope'),w=Math.max(2,ts*.035);
 g.moveTo(0,0).lineTo(x,y).stroke({color:ink,width:w*2.8,cap:'round'});
 g.moveTo(0,0).lineTo(x,y).stroke({color:amber,width:w,cap:'round'});
 for(const [cx,cy] of [[0,0],[x,y]])g.circle(cx!,cy!,ts*.3).stroke({color:ink,width:w*2}).stroke({color:amber,width:w});
 g.roundRect(x/2-ts*.085,y/2-ts*.065,ts*.17,ts*.13,ts*.03).fill(ivory).stroke({color:ink,width:w});
 caption(node,'PAIR',x/2,y/2+(offset.r===0?ts*.34:0),ts,'tether-caption');return node;
}

export function addRepairSite(parent:Container,index:number,complete:boolean,ts:number):Container {
 const node=new Container();node.label=complete?'repair-site-complete':'repair-site-waiting';parent.addChild(node);const g=art(node,'repair-site-outline'),color=complete?teal:amber,w=Math.max(2,ts*.032);
 g.roundRect(-ts*.44,-ts*.44,ts*.88,ts*.88,ts*.07).fill({color:complete?teal:plum,alpha:complete?.025:.09}).stroke({color,width:w});
 if(!complete){g.moveTo(-ts*.15,-ts*.13).lineTo(ts*.01,-ts*.02).lineTo(-ts*.07,ts*.07).lineTo(ts*.14,ts*.17).stroke({color:plum,width:w,cap:'round'});}
 else g.moveTo(-ts*.1,-ts*.34).lineTo(-ts*.03,-ts*.27).lineTo(ts*.12,-ts*.39).stroke({color:teal,width:w,cap:'round'});
 caption(node,complete?'FIXED':`FIX ${index}`,0,ts*.36,ts,'repair-site-caption');return node;
}
export function addRendezvousPad(parent:Container,index:number,phase:PadPhase,ts:number):Container {
 const node=new Container();node.label='rendezvous-pad';parent.addChild(node);const g=art(node,'rendezvous-pad-outline'),color=phase==='waiting'?plum:teal,w=Math.max(2,ts*.036);
 g.roundRect(-ts*.46,-ts*.46,ts*.92,ts*.92,ts*.1).fill({color,alpha:.04}).stroke({color,width:w});
 for(const side of [-1,1])g.circle(side*ts*.38,ts*.38,ts*.04).fill(color);
 caption(node,phase==='departed'?`${index} AWAY`:phase==='ready'?`${index} READY`:`PAD ${index}`,0,ts*.49,ts,'rendezvous-pad-caption');return node;
}

/** One restrained event pulse. Reduced motion keeps the marker still. */
export function markerPulse(node:Container,progress:number,reduced:boolean):void {node.scale.set(reduced?1:1+Math.sin(Math.PI*progress)*.09);}
