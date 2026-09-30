import {Container,Graphics,Sprite,Text,type Texture} from 'pixi.js';
import type {SolarCollector} from '../../campaign/mechanics/solar';
import {terrainName} from '../../campaign/terrainLabels';

/** A real terrain tile beside a persistent, quota-sized charge ring. */
export function addSolarIndicator(node:Container,collector:SolarCollector,terrain:Texture,tileSize:number):void {
 const radius=tileSize*.56,stroke=Math.max(4,tileSize*.075),gap=Math.min(.12,Math.PI/(collector.quota*5));
 const rim=new Graphics();rim.label='solar-charge-rim';
 rim.circle(0,0,radius).stroke({color:0x13253d,width:stroke+3});node.addChild(rim);
 for(let i=0;i<collector.quota;i++){
  const start=-Math.PI/2+2*Math.PI*i/collector.quota+gap,end=-Math.PI/2+2*Math.PI*(i+1)/collector.quota-gap;
  const filled=i<collector.charge,arc=new Graphics();arc.label=`solar-charge-${i}-${filled?'filled':'empty'}`;
  arc.arc(0,0,radius,start,end).stroke({color:filled?0xa7fff0:0x667c94,width:stroke,cap:'round'});node.addChild(arc);
 }
 const x=tileSize*.57,y=-tileSize*.5,size=tileSize*.48,pad=Math.max(2,tileSize*.035);
 const plaque=new Graphics();plaque.label='solar-terrain-plaque';
 plaque.roundRect(x-size/2-pad,y-size/2-pad,size+2*pad,size+2*pad,tileSize*.11).fill(0x17273e).stroke({color:0xffd278,width:Math.max(2,tileSize*.025)});node.addChild(plaque);
 const icon=new Sprite(terrain);icon.label='solar-requested-terrain';icon.anchor.set(.5);icon.width=icon.height=size;icon.position.set(x,y);node.addChild(icon);
 const strip=new Graphics();strip.label='solar-terrain-name-strip';
 strip.roundRect(x-size/2,y+size*.19,size,size*.31,tileSize*.04).fill({color:0x101d32,alpha:.93});node.addChild(strip);
 const name=new Text({text:terrainName(collector.tier).toUpperCase(),style:{fontFamily:'system-ui',fontSize:Math.max(8,Math.min(10,tileSize*.13)),fontWeight:'800',fill:0xffffff,stroke:{color:0x101d32,width:2}}});
 name.label='solar-terrain-name';name.anchor.set(.5);name.position.set(x,y+size*.34);node.addChild(name);
}
