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
 for(const model of ['hall','garden','court','tower','white-rabbit','woodland-animals','wonderland-residents'])assert.ok(existsSync(`dist/games/white-rabbit/models/${model}.glb`));
 const main=readdirSync('dist/games/white-rabbit/assets').find(name=>/^index-.*\.js$/.test(name));const js=read('games/white-rabbit/assets/'+main);
 assert.doesNotMatch(js,/Developer checkpoint|saves disabled|localhost:|\/Users\//);
 assert.ok(!existsSync('dist/games/white-rabbit/touch-review.html'));
 assert.match(html,/id="move-pad"/);assert.match(html,/id="look-pad"/);assert.match(html,/id="touch-action"/);assert.match(html,/id="rotate-device"/);
});

test('the main post has every comparison and the visible walkthrough, with the old URL redirected',()=>{
 const post=read('after-the-white-rabbit/index.html'),old=read('white-rabbit-walkthrough/index.html');
 assert.match(post,/id="full-walkthrough"/);assert.equal((post.match(/class="puzzle-study"/g)||[]).length,27);
 assert.match(post,/source-perspective.png/);assert.match(post,/pdf#page=7/);
 assert.equal((post.match(/<video[^>]*controls[^>]*playsinline/g)||[]).length,2);
 for(const release of ['white-rabbit-repair-walkthrough/walkthrough','white-rabbit-visual-finale/finale'])assert.ok(post.includes('releases/download/'+release+'.mp4'));
 assert.doesNotMatch(post,/<details>/);for(const n of ['I','II','III','IV'])assert.ok(post.includes('Chapter '+n+' ·'));
 assert.match(old,/<meta http-equiv="refresh" content="0;url=\/after-the-white-rabbit\/#full-walkthrough">/);
 for(const match of post.matchAll(/(?:src|poster)="(\/images\/[^"?#]+)"/g))assert.ok(existsSync(resolve('dist','.'+match[1])),match[1]);
});
