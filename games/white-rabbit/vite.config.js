import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{rollupOptions:{output:{manualChunks:{engine:['three'],postprocessing:['three/addons/postprocessing/EffectComposer.js','three/addons/postprocessing/UnrealBloomPass.js','three/addons/postprocessing/OutputPass.js']}}},chunkSizeWarningLimit:800},server:{host:'0.0.0.0',port:5173}});
