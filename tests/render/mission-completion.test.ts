import {afterEach,expect,it,vi} from 'vitest';
import {MissionCompletion} from '../../src/ui/missionCompletion';
afterEach(()=>vi.useRealTimers());
it('celebrates only after resolution, then advances exactly once without a click',async()=>{
 vi.useFakeTimers();const celebrate=vi.fn(),next=vi.fn(async()=>{}),failed=vi.fn(),flow=new MissionCompletion(celebrate,next,failed);
 flow.update('1',true,false);await vi.advanceTimersByTimeAsync(2000);expect(next).not.toHaveBeenCalled();
 flow.update('1',true,true);flow.update('1',true,true);expect(celebrate).toHaveBeenCalledTimes(1);
 await vi.advanceTimersByTimeAsync(1299);expect(next).not.toHaveBeenCalled();
 await vi.advanceTimersByTimeAsync(1);flow.update('1',true,true);await vi.advanceTimersByTimeAsync(2000);expect(next).toHaveBeenCalledTimes(1);
});
it('pauses while hidden and resumes a won save; exposes save failures without retry loops',async()=>{
 vi.useFakeTimers();const error=Error('offline save failed'),next=vi.fn(async()=>{throw error;}),failed=vi.fn();
 const flow=new MissionCompletion(()=>{},next,failed);
 flow.update('1',true,true);await vi.advanceTimersByTimeAsync(500);flow.update('1',true,false);
 await vi.advanceTimersByTimeAsync(2000);expect(next).not.toHaveBeenCalled();
 flow.update('1',true,true);await vi.advanceTimersByTimeAsync(1300);expect(failed).toHaveBeenCalledWith(error);
 flow.update('1',true,true);await vi.advanceTimersByTimeAsync(2000);expect(next).toHaveBeenCalledTimes(1);
});
