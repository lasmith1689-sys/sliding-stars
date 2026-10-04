import {createPrivateKey,sign,createHash} from 'node:crypto';
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

// Runs only on GitHub Actions. The existing team key never leaves memory and is
// never included in output, artifacts, request errors or repository files.
const appId='6817778193',base='https://api.appstoreconnect.apple.com';
const mode=process.env.RELEASE_MODE??'inspect';
if(!['inspect','prepare','testflight','store'].includes(mode))throw Error('Unknown release mode');
const metadata=JSON.parse(await readFile(new URL('../../docs/app-store/metadata.json',import.meta.url),'utf8'));
const report={appId,mode,checkedAt:new Date().toISOString(),steps:[],blockers:[]};
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
let keyText=(process.env.ASC_KEY_P8??'').replaceAll('\r','').trim();
if(!keyText.includes('BEGIN PRIVATE KEY'))keyText=`-----BEGIN PRIVATE KEY-----\n${keyText.replace(/\s/g,'').match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;
const key=createPrivateKey(keyText);keyText='';delete process.env.ASC_KEY_P8;
function token(){const now=Math.floor(Date.now()/1000),data=`${b64({alg:'ES256',kid:process.env.ASC_KEY_ID,typ:'JWT'})}.${b64({iss:process.env.ASC_ISSUER_ID,iat:now-10,exp:now+900,aud:'appstoreconnect-v1'})}`;return `${data}.${sign('sha256',Buffer.from(data),{key,dsaEncoding:'ieee-p1363'}).toString('base64url')}`;}
async function api(path,method='GET',body){
 const response=await fetch(new URL(path,base),{method,headers:{Authorization:`Bearer ${token()}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});
 const result=await response.text();let json;try{json=result?JSON.parse(result):{};}catch{throw Error(`${method} ${path.split('?')[0]}: HTTP ${response.status}`);}
 if(!response.ok)throw Error(`${method} ${path.split('?')[0]}: HTTP ${response.status}: ${(json.errors??[]).map(e=>`${e.code}: ${e.detail??e.title}`).join('; ')}`);
 return json;
}
const rel=(type,id)=>({data:{type,id}});
const resource=(type,id,attributes,relationships)=>({data:{type,...(id?{id}:{}),...(attributes?{attributes}:{}),...(relationships?{relationships}:{})}});
async function step(name,fn){try{await fn();report.steps.push(name);console.log(`Completed: ${name}`);}catch(error){report.blockers.push(`${name}: ${error.message}`);console.log(`::warning::${name}: ${error.message}`);}}
let build,version,betaDetail;
try{
 const app=(await api(`/v1/apps/${appId}`)).data;
 if(app.attributes.bundleId!=='com.lasmith1689.SlidingStars')throw Error('Unexpected app identity');
 report.appName=app.attributes.name;
 const builds=(await api(`/v1/builds?filter[app]=${appId}&sort=-uploadedDate&limit=20&include=buildBetaDetail`));
 report.builds=builds.data.map(b=>({id:b.id,version:b.attributes.version,processingState:b.attributes.processingState,expired:b.attributes.expired,audience:b.attributes.buildAudienceType,beta:(builds.included??[]).find(i=>i.type==='buildBetaDetails'&&i.id===b.relationships?.buildBetaDetail?.data?.id)?.attributes}));
 const selected=process.env.BUILD_NUMBER;
 build=builds.data.find(b=>selected?b.attributes.version===selected:!b.attributes.expired&&b.attributes.processingState==='VALID'&&b.attributes.buildAudienceType==='APP_STORE_ELIGIBLE');
 if(mode==='testflight'&&selected){
  for(let attempt=0;attempt<24&&(!build||build.attributes.processingState==='PROCESSING');attempt++){
   console.log(`Waiting for Apple processing: ${selected} (${attempt+1}/24)`);await new Promise(r=>setTimeout(r,45000));
   build=(await api(`/v1/builds?filter[app]=${appId}&filter[version]=${encodeURIComponent(selected)}&limit=5`)).data.find(b=>b.attributes.version===selected);
  }
 }
 report.selectedBuild=build?{id:build.id,version:build.attributes.version,processingState:build.attributes.processingState,audience:build.attributes.buildAudienceType}:null;
 if(build?.attributes.processingState==='VALID'){
  const details=(await api(`/v1/builds/${build.id}/buildBetaDetail`)).data;
  report.currentBetaState={internal:details.attributes.internalBuildState,external:details.attributes.externalBuildState};
 }
 const groups=(await api(`/v1/apps/${appId}/betaGroups?limit=100`)).data;
 report.groups=groups.map(g=>({id:g.id,name:g.attributes.name,internal:g.attributes.isInternalGroup,publicLink:g.attributes.publicLink,publicLinkEnabled:g.attributes.publicLinkEnabled}));
 betaDetail=(await api(`/v1/apps/${appId}/betaAppReviewDetail`)).data;
 report.betaContactReady=['contactFirstName','contactLastName','contactPhone','contactEmail'].every(k=>!!betaDetail.attributes[k]);
 const versions=(await api(`/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=20`)).data;
 report.storeVersions=versions.map(v=>({id:v.id,version:v.attributes.versionString,state:v.attributes.appStoreState}));
 version=versions.find(v=>v.attributes.versionString==='1.0');
 const appInfos=(await api(`/v1/apps/${appId}/appInfos`)).data;
 const editableInfo=appInfos.find(i=>i.attributes.appStoreState==='PREPARE_FOR_SUBMISSION')??appInfos[0];
 report.appInformation={ageRating:editableInfo?.attributes.appStoreAgeRating,contentRights:app.attributes.contentRightsDeclaration};
 if(mode!=='inspect'){
  await step('Public TestFlight group',async()=>{
   let group=groups.find(g=>!g.attributes.isInternalGroup&&g.attributes.name==='Friends and Explorers');
   if(!group)group=(await api('/v1/betaGroups','POST',resource('betaGroups',null,{name:'Friends and Explorers',isInternalGroup:false,publicLinkEnabled:true,publicLinkLimitEnabled:true,publicLinkLimit:1000,feedbackEnabled:true}, {app:rel('apps',appId)}))).data;
   else if(!group.attributes.publicLinkEnabled)group=(await api(`/v1/betaGroups/${group.id}`,'PATCH',resource('betaGroups',group.id,{publicLinkEnabled:true,publicLinkLimitEnabled:true,publicLinkLimit:1000}))).data;
   report.publicGroupId=group.id;report.publicLink=group.attributes.publicLink;
  });
  await step('Beta descriptions and review notes',async()=>{
   const locales=(await api(`/v1/apps/${appId}/betaAppLocalizations`)).data;
   const betaAttributes={description:metadata.betaDescription,privacyPolicyUrl:metadata.privacyPolicyUrl,marketingUrl:metadata.marketingUrl,...(betaDetail.attributes.contactEmail?{feedbackEmail:betaDetail.attributes.contactEmail}:{})};
   if(!locales.length)await api('/v1/betaAppLocalizations','POST',resource('betaAppLocalizations',null,{locale:'en-US',...betaAttributes},{app:rel('apps',appId)}));
   for(const locale of locales)await api(`/v1/betaAppLocalizations/${locale.id}`,'PATCH',resource('betaAppLocalizations',locale.id,betaAttributes));
   await api(`/v1/betaAppReviewDetails/${betaDetail.id}`,'PATCH',resource('betaAppReviewDetails',betaDetail.id,{demoAccountRequired:false,notes:metadata.reviewNotes}));
  });
  await step('App Store description',async()=>{
   if(!version)version=(await api('/v1/appStoreVersions','POST',resource('appStoreVersions',null,{platform:'IOS',versionString:'1.0',copyright:metadata.copyright,releaseType:'AFTER_APPROVAL',usesIdfa:false},{app:rel('apps',appId)}))).data;
   if(!['PREPARE_FOR_SUBMISSION','DEVELOPER_REJECTED','REJECTED','METADATA_REJECTED'].includes(version.attributes.appStoreState))throw Error(`Version is already ${version.attributes.appStoreState}; leaving submitted metadata intact`);
   await api(`/v1/appStoreVersions/${version.id}`,'PATCH',resource('appStoreVersions',version.id,{copyright:metadata.copyright,releaseType:'AFTER_APPROVAL',usesIdfa:false}));
   const locales=(await api(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`)).data;
   const attributes={description:metadata.description,keywords:metadata.keywords,supportUrl:metadata.supportUrl,marketingUrl:metadata.marketingUrl,promotionalText:metadata.promotionalText};
   const en=locales.find(l=>l.attributes.locale==='en-US');
   if(en)await api(`/v1/appStoreVersionLocalizations/${en.id}`,'PATCH',resource('appStoreVersionLocalizations',en.id,attributes));
   else await api('/v1/appStoreVersionLocalizations','POST',resource('appStoreVersionLocalizations',null,{locale:'en-US',...attributes},{appStoreVersion:rel('appStoreVersions',version.id)}));
   report.storeVersionId=version.id;
  });
  await step('App privacy URL and subtitle',async()=>{
   const info=editableInfo;
   const categories=(await api('/v1/appCategories?filter[platforms]=IOS&limit=200')).data;
   if(['GAMES','GAMES_PUZZLE','GAMES_CASUAL'].every(id=>categories.some(c=>c.id===id)))await api(`/v1/appInfos/${info.id}`,'PATCH',resource('appInfos',info.id,null,{primaryCategory:rel('appCategories','GAMES'),primarySubcategoryOne:rel('appCategories','GAMES_PUZZLE'),primarySubcategoryTwo:rel('appCategories','GAMES_CASUAL')}));
   for(const locale of (await api(`/v1/appInfos/${info.id}/appInfoLocalizations`)).data)if(locale.attributes.locale==='en-US')await api(`/v1/appInfoLocalizations/${locale.id}`,'PATCH',resource('appInfoLocalizations',locale.id,{subtitle:metadata.subtitle,privacyPolicyUrl:metadata.privacyPolicyUrl}));
  });
  await step('Accurate game age-rating answers',async()=>{
   const rating=(await api(`/v1/appInfos/${editableInfo.id}/ageRatingDeclaration`)).data;
   const attributes={advertising:false,gambling:false,healthOrWellnessTopics:false,lootBox:false,messagingAndChat:false,parentalControls:false,ageAssurance:false,socialMedia:false,socialMediaAgeRestricted:false,unrestrictedWebAccess:false,userGeneratedContent:false,ageRatingOverrideV2:'NONE'};
   for(const field of ['alcoholTobaccoOrDrugUseOrReferences','contests','gamblingSimulated','gunsOrOtherWeapons','medicalOrTreatmentInformation','profanityOrCrudeHumor','sexualContentGraphicAndNudity','sexualContentOrNudity','horrorOrFearThemes','matureOrSuggestiveThemes','violenceRealisticProlongedGraphicOrSadistic','violenceRealistic'])attributes[field]='NONE';
   // The cute pirate drones and space rescue peril are mild cartoon content.
   attributes.violenceCartoonOrFantasy='INFREQUENT_OR_MILD';
   await api(`/v1/ageRatingDeclarations/${rating.id}`,'PATCH',resource('ageRatingDeclarations',rating.id,attributes));
   report.appInformation.ageRating=(await api(`/v1/appInfos/${editableInfo.id}`)).data.attributes.appStoreAgeRating;
  });
  await step('Free App Store price',async()=>{
   let schedule;try{schedule=(await api(`/v1/apps/${appId}/appPriceSchedule`)).data;}catch(error){if(!error.message.includes('HTTP 404'))throw error;}
   if(schedule){
    let prices;try{prices=await api(`/v1/appPriceSchedules/${schedule.id}/manualPrices?include=appPricePoint&limit=200`);}catch(error){if(!error.message.includes('HTTP 404'))throw error;}
    if(prices){
    const points=(prices.included??[]).filter(p=>p.type==='appPricePoints');
    if(points.length&&points.every(p=>Number(p.attributes.customerPrice)===0)){report.price='Free';return;}
    if(prices.data.length)throw Error('Existing price schedule requires owner review; leaving it unchanged');
    }
   }
   const free=(await api(`/v1/apps/${appId}/appPricePoints?filter[territory]=USA&limit=200`)).data.find(p=>Number(p.attributes.customerPrice)===0);
   if(!free)throw Error('Apple did not return a free price point');
   const inlineId='${free-price}';
   await api('/v1/appPriceSchedules','POST',{...resource('appPriceSchedules',null,null,{app:rel('apps',appId),baseTerritory:rel('territories','USA'),manualPrices:{data:[{type:'appPrices',id:inlineId}]}}),included:[{type:'appPrices',id:inlineId,attributes:{startDate:null,endDate:null},relationships:{appPricePoint:rel('appPricePoints',free.id)}}]});
   report.price='Free';
  });
  await step('Licensed content declaration',async()=>{
   // Original game artwork plus bundled Fredoka/Nunito under their retained
   // SIL Open Font Licenses. No reference-game artwork is included.
   await api(`/v1/apps/${appId}`,'PATCH',resource('apps',appId,{contentRightsDeclaration:'USES_THIRD_PARTY_CONTENT'}));
   report.appInformation.contentRights='USES_THIRD_PARTY_CONTENT';
  });
  await step('App Store territory availability',async()=>{
   let availability;try{availability=(await api(`/v1/apps/${appId}/appAvailabilityV2`)).data;}catch(error){if(!error.message.includes('HTTP 404'))throw error;}
   let territories;try{if(availability)territories=(await api(`/v2/appAvailabilities/${availability.id}/territoryAvailabilities?limit=200`)).data;}catch(error){if(!error.message.includes('HTTP 404'))throw error;}
   if(territories?.length){report.availableTerritories=territories.filter(t=>t.attributes.available).length;return;}
   const all=(await api('/v1/territories?limit=200')).data;
   const included=all.map((territory,index)=>({type:'territoryAvailabilities',id:`${'${territory-'}${index}}`,attributes:{available:true,preOrderEnabled:false},relationships:{territory:rel('territories',territory.id)}}));
   await api('/v2/appAvailabilities','POST',{...resource('appAvailabilities',null,{availableInNewTerritories:true},{app:rel('apps',appId),territoryAvailabilities:{data:included.map(t=>({type:t.type,id:t.id}))}}),included});
   report.availableTerritories=all.length;
  });
  if(version&&report.betaContactReady)await step('App Store review contact and notes',async()=>{
   const attributes={demoAccountRequired:false,notes:metadata.reviewNotes};
   for(const field of ['contactFirstName','contactLastName','contactPhone','contactEmail'])attributes[field]=betaDetail.attributes[field];
   let detail;try{detail=(await api(`/v1/appStoreVersions/${version.id}/appStoreReviewDetail`)).data;}catch(error){if(!error.message.includes('HTTP 404'))throw error;}
   if(detail)await api(`/v1/appStoreReviewDetails/${detail.id}`,'PATCH',resource('appStoreReviewDetails',detail.id,attributes));
   else await api('/v1/appStoreReviewDetails','POST',resource('appStoreReviewDetails',null,attributes,{appStoreVersion:rel('appStoreVersions',version.id)}));
  });
  if(version&&process.env.SCREENSHOT_PATH)await step('Actual iPhone gameplay screenshot',async()=>{
   const original=await readFile(process.env.SCREENSHOT_PATH);
   // Store delivery requires an opaque image. This lossless format conversion
   // preserves the captured gameplay pixels and removes the PNG alpha channel.
   const {default:sharp}=await import('sharp');
   const bytes=await sharp(original).flatten({background:'#071225'}).png().toBuffer(),checksum=createHash('md5').update(bytes).digest('hex');
   // PNG dimensions come directly from the iPhone simulator, without resizing.
   if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Expected a PNG screenshot');
   const size=`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
   if(!['1260x2736','1290x2796','1320x2868'].includes(size))throw Error(`Unexpected large-iPhone screenshot size ${size}`);
   const locale=(await api(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`)).data.find(l=>l.attributes.locale==='en-US');
   if(!locale)throw Error('English store localization is missing');
   const sets=(await api(`/v1/appStoreVersionLocalizations/${locale.id}/appScreenshotSets`)).data;
   let set=sets.find(s=>s.attributes.screenshotDisplayType==='APP_IPHONE_67');
   if(!set)set=(await api('/v1/appScreenshotSets','POST',resource('appScreenshotSets',null,{screenshotDisplayType:'APP_IPHONE_67'},{appStoreVersionLocalization:rel('appStoreVersionLocalizations',locale.id)}))).data;
   const fileName=`iphone-gameplay-${checksum.slice(0,10)}.png`;
   const existingShots=(await api(`/v1/appScreenshotSets/${set.id}/appScreenshots`)).data;
   let shot=existingShots.find(s=>s.attributes.fileName===fileName);
   if(!shot)shot=(await api('/v1/appScreenshots','POST',resource('appScreenshots',null,{fileName,fileSize:bytes.length},{appScreenshotSet:rel('appScreenshotSets',set.id)}))).data;
   if(shot.attributes.assetDeliveryState?.state!=='COMPLETE'){
    for(const operation of shot.attributes.uploadOperations??[]){
     const target=new URL(operation.url);
     if(target.protocol!=='https:'||!/(?:\.apple\.com|\.icloud\.com|\.amazonaws\.com)$/.test(target.hostname))throw Error('Unexpected Apple asset upload destination');
     if(!Number.isSafeInteger(operation.offset)||!Number.isSafeInteger(operation.length)||operation.offset<0||operation.length<1||operation.offset+operation.length>bytes.length)throw Error('Invalid screenshot upload range');
     const upload=await fetch(target,{method:operation.method,headers:Object.fromEntries(operation.requestHeaders.map(h=>[h.name,h.value])),body:bytes.subarray(operation.offset,operation.offset+operation.length),signal:AbortSignal.timeout(60000)});
     if(!upload.ok)throw Error(`Screenshot transfer failed: HTTP ${upload.status}`);
    }
    await api(`/v1/appScreenshots/${shot.id}`,'PATCH',resource('appScreenshots',shot.id,{uploaded:true,sourceFileChecksum:checksum}));
    for(let attempt=0;attempt<12;attempt++){
     shot=(await api(`/v1/appScreenshots/${shot.id}`)).data;
     if(['COMPLETE','FAILED'].includes(shot.attributes.assetDeliveryState?.state))break;
     await new Promise(r=>setTimeout(r,15000));
    }
   }
   report.screenshot={id:shot.id,size,state:shot.attributes.assetDeliveryState?.state};
   if(report.screenshot.state!=='COMPLETE')throw Error(`Apple screenshot processing: ${report.screenshot.state}`);
   // Replace only our own known pre-readiness background capture from 13.1.
   // Its original pixels remain in the retained GitHub QA artifact.
   if(existingShots.some(s=>s.id==='00c00019-65f0-8a11-800a-0a3dd89788e0')&&shot.id!=='00c00019-65f0-8a11-800a-0a3dd89788e0')await api('/v1/appScreenshots/00c00019-65f0-8a11-800a-0a3dd89788e0','DELETE');
  });
 }
 if(mode!=='inspect'&&version&&build?.attributes.processingState==='VALID'&&build.attributes.buildAudienceType==='APP_STORE_ELIGIBLE'&&['PREPARE_FOR_SUBMISSION','DEVELOPER_REJECTED','REJECTED','METADATA_REJECTED'].includes(version.attributes.appStoreState))await step('Select distribution build for App Store release',async()=>{
  await api(`/v1/appStoreVersions/${version.id}/relationships/build`,'PATCH',rel('builds',build.id));
  report.storeBuildNumber=build.attributes.version;
 });
 if(mode==='testflight')await step('Submit current build for public TestFlight review',async()=>{
  if(!build||build.attributes.processingState!=='VALID')throw Error('Current uploaded build has not finished Apple processing');
  if(build.attributes.buildAudienceType!=='APP_STORE_ELIGIBLE')throw Error('This build is restricted to internal testing; upload a new distribution build');
  if(!report.betaContactReady)throw Error('Enter the required review contact in App Store Connect → TestFlight → Test Information');
  const localizations=(await api(`/v1/builds/${build.id}/betaBuildLocalizations`)).data;
  const en=localizations.find(l=>l.attributes.locale==='en-US');
  if(en)await api(`/v1/betaBuildLocalizations/${en.id}`,'PATCH',resource('betaBuildLocalizations',en.id,{whatsNew:metadata.whatsNew}));
  else await api('/v1/betaBuildLocalizations','POST',resource('betaBuildLocalizations',null,{locale:'en-US',whatsNew:metadata.whatsNew},{build:rel('builds',build.id)}));
  await api(`/v1/betaGroups/${report.publicGroupId}/relationships/builds`,'POST',{data:[{type:'builds',id:build.id}]});
  const detail=(await api(`/v1/builds/${build.id}/buildBetaDetail`)).data;
  await api(`/v1/buildBetaDetails/${detail.id}`,'PATCH',resource('buildBetaDetails',detail.id,{autoNotifyEnabled:true}));
  report.externalState=detail.attributes.externalBuildState;
  if(['READY_FOR_BETA_SUBMISSION','READY_FOR_BETA_TESTING'].includes(report.externalState)){
   if(report.externalState==='READY_FOR_BETA_SUBMISSION')await api('/v1/betaAppReviewSubmissions','POST',resource('betaAppReviewSubmissions',null,null,{build:rel('builds',build.id)}));
   report.externalState=(await api(`/v1/builds/${build.id}/buildBetaDetail`)).data.attributes.externalBuildState;
  }
 });
 if(mode==='store')await step('Submit App Store version for review',async()=>{
  if(!version)throw Error('No App Store version prepared');
  const submissions=(await api(`/v1/apps/${appId}/reviewSubmissions?filter[platform]=IOS`)).data;
  let submission=submissions.find(s=>s.attributes.state==='READY_FOR_REVIEW');
  if(submissions.some(s=>['WAITING_FOR_REVIEW','IN_REVIEW'].includes(s.attributes.state))){report.storeState='ALREADY_SUBMITTED';return;}
  if(!submission)submission=(await api('/v1/reviewSubmissions','POST',resource('reviewSubmissions',null,{platform:'IOS'},{app:rel('apps',appId)}))).data;
  const items=(await api(`/v1/reviewSubmissions/${submission.id}/items`)).data;
  if(!items.some(i=>i.relationships?.appStoreVersion?.data?.id===version.id))await api('/v1/reviewSubmissionItems','POST',resource('reviewSubmissionItems',null,null,{reviewSubmission:rel('reviewSubmissions',submission.id),appStoreVersion:rel('appStoreVersions',version.id)}));
  await api(`/v1/reviewSubmissions/${submission.id}`,'PATCH',resource('reviewSubmissions',submission.id,{submitted:true}));
  report.storeState=(await api(`/v1/appStoreVersions/${version.id}`)).data.attributes.appStoreState;
 });
}catch(error){report.blockers.push(error.message);console.log(`::error::${error.message}`);process.exitCode=1;}
const out=resolve(process.env.RUNNER_TEMP??'.','sliding-stars-release');await mkdir(out,{recursive:true});
await writeFile(resolve(out,'status.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`## Sliding Stars release\n\n${report.publicLink?`Public invitation: ${report.publicLink}\n\n`:''}${report.selectedBuild?`Build ${report.selectedBuild.version}: ${report.selectedBuild.processingState}\n\n`:''}${report.externalState?`External TestFlight: ${report.externalState}\n\n`:''}${report.storeState?`App Store: ${report.storeState}\n\n`:''}${report.blockers.map(b=>`- ${b}`).join('\n')}\n`);
if(report.blockers.length&&mode!=='inspect')process.exitCode=1;
