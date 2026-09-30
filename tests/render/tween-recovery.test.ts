import {it,expect,vi} from 'vitest';
import {tween,delay,initTweens,cancelTweens} from '../../src/render/tween';
import {Animator} from '../../src/render/animator';
import {loadLevel} from '../../src/core/level';
import {INTRO} from '../../src/levels/intro';
import type {BoardView} from '../../src/render/boardView';
import type {Layers} from '../../src/render/app';
it('legacy tweens finish with a stopped Pixi ticker and cancellation resolves pending waits',async()=>{
 vi.useFakeTimers();initTweens({ticker:{add:()=>{},remove:()=>{},deltaMS:16}} as never);
 const node={x:0};let finished=false;void tween(node,{x:10},160).then(()=>{finished=true;});await vi.advanceTimersByTimeAsync(200);
 expect(node.x).toBe(10);expect(finished).toBe(true);
 let cancelled=false;void delay(500).then(()=>{cancelled=true;});cancelTweens();await Promise.resolve();expect(cancelled).toBe(true);vi.useRealTimers();
});
it('legacy cancellation synchronizes the saved board and old continuations cannot alter a newer view',async()=>{
 vi.useFakeTimers();initTweens({} as never);const first=loadLevel(INTRO[0]!),second={...first,points:999};const sync=vi.fn();const node={x:0,y:0};
 const view={layout:{tileSize:50},pieceAt:()=>node,cellCenter:(r:number,c:number)=>({x:c*50,y:r*50}),ridersAt:()=>[],moveKey:vi.fn(),syncFrom:sync} as unknown as BoardView;
 const layers={pieces:{x:0},actors:{x:0}} as unknown as Layers;const animator=new Animator(view,layers);
 const old=animator.play([{type:'swap',a:{r:0,c:0},b:{r:0,c:1}}],first);await Promise.resolve();animator.cancel();await old;expect(sync).toHaveBeenLastCalledWith(first);
 const next=animator.play([],second);await vi.runAllTimersAsync();await next;expect(sync).toHaveBeenLastCalledWith(second);expect(view.moveKey).not.toHaveBeenCalled();vi.useRealTimers();
});
