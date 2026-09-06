// Development-only chapter checkpoints for repeatable visual and interaction QA.
// Vite removes this branch from production builds. It never writes the player's save.
import {HOUSE_ORDER} from './mechanics.js';
import {initialState,PUZZLES,solve} from './puzzles.js';
export function reviewCheckpoint(){
 if(!import.meta.env.DEV)return null;const params=new URLSearchParams(location.search);const room=params.get('review');if(!['hall','garden','court','tower'].includes(room))return null;
 const state=initialState();state.room=room;state.started=true;
 const chapters=[['story','shadow','arithmetic','letter','biscuit','door_unlock','bottle','feet','ceiling'],['caterpillar','mushroom','messenger','kitchen','tea','minutes','signs'],['maze_garden','maze_court','maze_croquet','roses','tart_seen','guards_seen','trial','croquet','effigies','decree']];
 const count=['hall','garden','court','tower'].indexOf(room);for(let i=0;i<count;i++)for(const id of chapters[i])solve(state,id,PUZZLES[id]?.note);
 state.inventory=count>2?['key','fan','brush','rose_token','guard_token','alice_token']:count>1?['key','fan']:count>0?['key']:[];
 const after=params.get('after');if(room==='garden'){state.size=11;if(['caterpillar','appointments','minutes'].includes(after))solve(state,'caterpillar',PUZZLES.caterpillar.note);if(['appointments','minutes'].includes(after)){for(const id of ['mushroom','messenger','kitchen','tea'])solve(state,id,PUZZLES[id].note);state.size=33;state.inventory.push('fan')}if(after==='minutes')solve(state,'minutes',PUZZLES.minutes.note);}if(room==='court'&&['trial','croquet'].includes(after)){for(const id of chapters[2].slice(0,after==='trial'?7:8))solve(state,id,PUZZLES[id]?.note);state.inventory=['key','fan','brush','rose_token','guard_token'];if(after==='croquet')state.inventory.push('alice_token');state.discovered.push('roses','gardeners','trial','tart','guard_original','guard_impostor','croquet','effigies');}
 if(room==='garden'&&after==='fan'){for(const id of ['caterpillar','mushroom','messenger'])solve(state,id,PUZZLES[id].note);state.size=33;state.inventory.push('fan');}
 if(room==='court'&&after==='gardeners'){for(const id of ['maze_garden','gardeners_match'])solve(state,id,PUZZLES[id].note);state.inventory.push('brush');state.discovered.push('roses','gardeners','brush');}
 if(room==='tower'&&after==='assembly'){solve(state,'assembly',PUZZLES.assembly.note);state.assembly=[...HOUSE_ORDER];state.bridgeFaces={'Black bridge':true,'Red bridge':true};}
 if(params.get('touch')==='1'){state.settings.controls='touch';state.settings.quality='low'}state.settings.sound=false;state.discovered.push('caterpillar','messenger','fan','minutes','signs','forest_map','fan_note','bridge_note');
 return {state,at:params.get('at')};
}
