import type { CampaignLevel, CampaignState } from '../../src/campaign/types';

export function levelFixture(): CampaignLevel {
  return {
    id: 1, campaignVersion: '2026.1', rulesVersion: 'campaign-1', chapter: 1, seed: 7,
    geometry: {
      rows: 3, cols: 3, mask: [[true,true,true],[true,true,true],[true,true,true]], inactiveCells: [],
      refillSources: [{id:'refill',at:{r:0,c:0},segmentId:'fall'}],
      gravitySegments: [{id:'fall',cells:[{r:0,c:0},{r:1,c:0},{r:2,c:0}],direction:'down',chamberId:'room'}],
      chambers: [{id:'room',cells:[{r:0,c:0},{r:1,c:0},{r:2,c:0}],directions:['down']}],
      routes: [], connections: [], endpoints: [{id:'home',kind:'station',at:{r:2,c:2},active:true}],
    },
    pieces: [{id:'tile-1',kind:'tile',tier:1,at:{r:0,c:0}},{id:'station-1',kind:'station',facing:'left',at:{r:2,c:2}}],
    crew: [{id:'crew-1',at:{r:0,c:0},status:'active',carrierId:null,rescueMoves:20,shelterMoves:null,shelterStarted:false,vipId:null}],
    actors: [], fixtures: [], arrivals: [], mechanics: [],
    goals: [{id:'goal-1',type:'homeCrew',eligible:{type:'ids',ids:['crew-1']}}],
    moveLimit: null, needMoves:20, presentationId:'first-light', lessonId:'foundation-1', rewardId:'level-1',
    metadata: {shapeFamily:'compact-rectangle',difficulty:'teaching',purposeTags:['first-merge'],assistedAllowance:5,capOverride:null},
  };
}

export function stateFixture(): CampaignState {
  const level=levelFixture();
  return {level,levelId:1,campaignVersion:'2026.1',rulesVersion:'campaign-1',turn:0,nextEntityId:3,rngState:7,
    geometry:structuredClone(level.geometry),pieces:structuredClone(level.pieces),crew:structuredClone(level.crew),
    actors:[],fixtures:[],arrivals:[],mechanics:[],goalProgress:[{goalId:'goal-1',completedIds:[]}],
    movesRemaining:null,points:0,status:'playing',transportedThisTurn:[],pendingTransfers:[]};
}
