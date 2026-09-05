export class Sound{
 constructor(){this.enabled=true;this.ctx=null}
 start(){if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=.25;this.master.connect(this.ctx.destination);
 const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*3,this.ctx.sampleRate);const data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+.018*(Math.random()*2-1))/1.02;data[i]=last*2.5}const wind=this.ctx.createBufferSource();wind.buffer=buffer;wind.loop=true;const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=350;const gain=this.ctx.createGain();gain.gain.value=.055;wind.connect(filter).connect(gain).connect(this.master);wind.start();}this.ctx.resume().catch(()=>{});this.set(this.enabled)}
 set(on){this.enabled=on;if(!on)this.stopVoice();if(this.master)this.master.gain.setTargetAtTime(on?.25:0,this.ctx.currentTime,.15)}
 tone(freq,duration=.45,volume=.25,type='sine',delay=0){if(!this.ctx||!this.enabled)return;const now=this.ctx.currentTime+delay;const o=this.ctx.createOscillator();const g=this.ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(volume,now+.015);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g).connect(this.master);o.start(now);o.stop(now+duration+.01)}
 stopVoice(){window.speechSynthesis?.cancel()}
 speak(text,rate=1,pitch=1){if(!this.enabled||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return false;this.stopVoice();const phrase=new SpeechSynthesisUtterance(text);phrase.lang='en-GB';phrase.rate=rate;phrase.pitch=pitch;phrase.volume=.85;const voices=window.speechSynthesis.getVoices();phrase.voice=voices.find(v=>v.localService&&v.lang.startsWith('en'))||voices.find(v=>v.lang.startsWith('en'))||null;phrase.onerror=()=>{};window.speechSynthesis.speak(phrase);return true}
 success(){[440,554.37,659.25,880].forEach((f,i)=>this.tone(f,.7,.17,'sine',i*.09))}
 click(){this.tone(650,.09,.08)}
 fail(){this.tone(165,.25,.12,'triangle')}
 step(){this.tone(60+Math.random()*20,.075,.045,'triangle')}
 chapter(){[220,329.63,440,554.37,659.25].forEach((f,i)=>this.tone(f,2,.1,'sine',i*.22))}
}
