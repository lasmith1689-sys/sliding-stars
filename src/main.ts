import {readSave,saveSnapshot} from './session/storage';
import {createCampaignSave} from './session/campaignSession';
import {openExecutor} from './session/adapter';
import {getCampaignLevel} from './campaign/catalog';
import type {SaveStorage,SaveV2,LevelProvider} from './session/types';
import './ui/style.css';
import {platformStorage,registerNativeLifecycle,installWebOfflinePack} from './platform';
import {flushStorage} from './session/nativeStorage';
async function boot(){
 let storage:SaveStorage=await platformStorage();
 let provider:LevelProvider=getCampaignLevel,previewMode=false,initial:(()=>Promise<SaveV2>)|undefined;
 if(import.meta.env.DEV&&new URLSearchParams(location.search).has('campaign-preview')){
  const preview=await import('./campaign/preview.dev');const setup=preview.previewSetup(storage,new URLSearchParams(location.search));storage=setup.storage;provider=setup.provider;initial=setup.initial;previewMode=true;
 }
 const read=readSave(storage);let save=read.save;
 if(!save){if(read.status!=='empty')throw Error(read.error??`Saved progress is ${read.status}; it has been preserved.`);save=initial?await initial():createCampaignSave(await provider(1));save.preferences.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;}
 const result=saveSnapshot(storage,save);if(!result.ok)throw Error(result.error??'Could not save initial progress');
 await flushStorage(storage);await registerNativeLifecycle();
 const executor=openExecutor(save,storage);
 if(executor.kind==='legacy'){const {bootLegacy}=await import('./legacyBoot');await bootLegacy(executor.session,storage,provider);}
 else{const {bootCampaign}=await import('./campaignBoot');await bootCampaign(executor.session,storage,provider,previewMode);}
 installWebOfflinePack();
}
void boot().catch(error=>{
 console.error('Could not start Sliding Stars',error);const ui=document.getElementById('ui')!;ui.innerHTML='<div class="boot-error"><h1>Mission preparation paused</h1><p id="boot-detail"></p><p>Your saved progress has been preserved.</p><button id="reload">Try again</button></div>';
 document.getElementById('boot-detail')!.textContent=error instanceof Error?error.message:String(error);document.getElementById('reload')!.addEventListener('click',()=>location.reload());
});
