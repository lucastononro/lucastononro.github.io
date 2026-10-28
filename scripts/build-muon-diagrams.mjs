import fs from 'node:fs/promises';
import katex from 'katex';
import {scenes,svgMarkup,configureMathRenderer} from '../static/muon-animations.js';

configureMathRenderer(katex);
const names={momentumlandscape:'muon-momentum-landscape',gd:'muon-gradient-descent',taylor:'muon-taylor',budgets:'muon-budgets',momentum:'muon-momentum',svd:'muon-svd',fixedpoints:'muon-fixed-points',polynomials:'muon-polynomials',derivatives:'muon-derivatives',trace:'muon-trace',spectral:'muon-spectral',step:'muon-step',optimizers:'muon-optimizers',valley:'muon-valley'};
for(const [kind,scene] of Object.entries(scenes)){
  // Static readers see a completed example; playback starts at the first frame.
  await fs.writeFile(new URL(`../static/diagrams/${names[kind]}.svg`,import.meta.url),svgMarkup(kind,scene.duration)+'\n');
}
const vendor=new URL('../static/vendor/katex/',import.meta.url);
await fs.mkdir(vendor,{recursive:true});
await fs.copyFile(new URL('../node_modules/katex/dist/katex.min.js',import.meta.url),new URL('katex.min.js',vendor));
await fs.copyFile(new URL('../node_modules/katex/LICENSE',import.meta.url),new URL('LICENSE',vendor));
