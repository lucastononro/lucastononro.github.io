import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
const read=path=>readFileSync(resolve('dist',path),'utf8');
test('home, category, RSS and sitemap expose the playable post',()=>{
 for(const page of ['index.html','tags/agents/index.html','feed.xml','sitemap.xml'])assert.match(read(page),/after-the-white-rabbit\//,page);
});
test('the game opens the post before the title and making-of prose',()=>{
 const html=read('after-the-white-rabbit/index.html');assert.ok(html.indexOf('class="game-launch"')<html.indexOf('class="post-head"'));
 assert.match(html,/href="\/games\/white-rabbit\/"/);assert.match(html,/Start playing/);assert.match(html,/The rabbit had to behave/);
 assert.ok(existsSync('dist/images/white-rabbit-game.png'));
});
test('the production game has local subdirectory assets and every model',()=>{
 const html=read('games/white-rabbit/index.html');const paths=[...html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map(m=>m[1]);assert.ok(paths.length>=4);
 for(const path of paths)assert.ok(existsSync(resolve('dist/games/white-rabbit',path)),path);
 for(const model of ['hall','garden','court','tower','white-rabbit'])assert.ok(existsSync(`dist/games/white-rabbit/models/${model}.glb`));
 const main=readdirSync('dist/games/white-rabbit/assets').find(name=>/^index-.*\.js$/.test(name));const js=read('games/white-rabbit/assets/'+main);
 assert.doesNotMatch(js,/Developer checkpoint|saves disabled|localhost:|\/Users\//);
 assert.ok(!existsSync('dist/games/white-rabbit/touch-review.html'));
 assert.match(html,/id="move-pad"/);assert.match(html,/id="look-pad"/);assert.match(html,/id="touch-action"/);assert.match(html,/id="rotate-device"/);
});
