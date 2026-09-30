import {makeSolvableLevel} from '../core/generator';
self.onmessage=(event:MessageEvent<number>)=>{
 try {self.postMessage({index:event.data,def:makeSolvableLevel(event.data)});}
 catch(error) {self.postMessage({index:event.data,error:String(error)});}
};
