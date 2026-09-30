import {Capacitor} from '@capacitor/core';
import type {SaveStorage} from './session/types';
import {createNativeStorage} from './session/nativeStorage';

export async function platformStorage():Promise<SaveStorage> {
  let local:Storage|undefined;try{local=window.localStorage;}catch{/* Native storage can work independently. */}
  if(!Capacitor.isNativePlatform()){
    if(!local)throw Error('Browser storage is unavailable. Existing data has been preserved.');
    return local;
  }
  const {Preferences}=await import('@capacitor/preferences');
  return createNativeStorage(Preferences,local);
}

export async function registerNativeLifecycle():Promise<void> {
  if(!Capacitor.isNativePlatform())return;
  const {App}=await import('@capacitor/app');
  await App.addListener('appStateChange',state=>window.dispatchEvent(new CustomEvent('native-app-state',{detail:state})));
}

export function installWebOfflinePack():void {
  if(import.meta.env.PROD&&!Capacitor.isNativePlatform()&&'serviceWorker' in navigator){
    void navigator.serviceWorker.register('/sw.js').catch(error=>console.warn('Offline pack unavailable',error));
  }
}
