(() => {
 'use strict';
 const data=JSON.parse(document.getElementById('player-data').textContent);
 const sourceButtons=document.getElementById('sources'),audio=document.getElementById('audio'),play=document.getElementById('play'),restart=document.getElementById('restart'),focus=document.getElementById('focus'),speed=document.getElementById('speed'),seek=document.getElementById('seek'),clock=document.getElementById('clock'),meta=document.getElementById('meta'),status=document.getElementById('status'),inner=document.getElementById('score-inner'),area=document.getElementById('score-area'),downloads=document.getElementById('downloads');
 audio.setAttribute('data-pitch-support', String('preservesPitch' in audio || 'webkitPreservesPitch' in audio));
 let selected=0,track=null,frames=[],cursor=null,raf=0,active=[],geometry=new Map(),lastSystem=null,pendingSeek=null;
 const fmt=t=>{t=Math.max(0,t||0);return `${Math.floor(t/60)}:${(t%60).toFixed(1).padStart(4,'0')}`};
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function duration(){return Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:track.nominalDuration;}
 function lastIndex(a,t,key){let lo=0,hi=a.length;while(lo<hi){let m=(lo+hi)>>1;if(key(a[m])<=t)lo=m+1;else hi=m;}return Math.max(0,lo-1);}
 function plotTime(t){if(track.kind!=='performance')return Math.min(t,track.scoreDuration);const a=track.cursorMap;if(!a.length)return 0;const i=lastIndex(a,t,x=>x[0]),p=a[i],q=a[Math.min(i+1,a.length-1)];return q[0]>p[0]?p[1]+clamp((t-p[0])/(q[0]-p[0]),0,1)*(q[1]-p[1]):p[1];}
 function postHeight(){if(window.parent!==window)window.parent.postMessage({type:'study-player-height',id:data.id,height:Math.ceil(document.querySelector('main.player').getBoundingClientRect().height)},'*');}
 function findGeo(f){
  const key=f.ids?.[0]||f.measure;if(!key)return null;if(geometry.has(key))return geometry.get(key);
  let el=null;for(const id of f.ids||[]){el=document.getElementById(id);if(el)break;}if(!el&&f.measure)el=document.getElementById(f.measure);if(!el)return null;
  const head=el.querySelector('.notehead')||el;const system=el.closest('g.system')||el.closest('g.measure')||el;
  const origin=inner.getBoundingClientRect(),box=head.getBoundingClientRect(),sys=system.getBoundingClientRect();
  const g={x:box.left-origin.left+(f.measure?6:box.width/2),y:sys.top-origin.top,height:sys.height,system};geometry.set(key,g);return g;
 }
 function paint(t,follow=false){
  if(!track)return;const d=duration();seek.value=String(d?clamp(t/d,0,1)*1000:0);seek.setAttribute('aria-valuetext',`${fmt(t)} / ${fmt(d)}`);clock.textContent=`${fmt(t)} / ${fmt(d)}`;
  for(const el of active)el.classList.remove('playing');active=[];
  for(const span of track.spans){if(span[0]>t+.02)break;if(span[0]<=t+.015&&span[1]>t){const el=document.getElementById(span[2]);if(el){el.classList.add('playing');active.push(el);}}}
  const st=plotTime(t);if(!frames.length)return;const i=lastIndex(frames,st,x=>x.t),f=frames[i],g=findGeo(f);if(!g){cursor.style.display='none';return;}
  let x=g.x;const next=frames[i+1],ng=next&&findGeo(next);if(next&&ng&&ng.system===g.system&&next.t>f.t&&ng.x>=g.x)x+=(ng.x-g.x)*clamp((st-f.t)/(next.t-f.t),0,1);
  cursor.style.display='block';cursor.style.left=`${x}px`;cursor.style.top=`${Math.max(0,g.y)}px`;cursor.style.height=`${Math.max(35,g.height)}px`;
  if(follow){const vr=area.getBoundingClientRect(),ir=inner.getBoundingClientRect(),top=g.y+ir.top-vr.top;if(g.system!==lastSystem||top<0||top+g.height>area.clientHeight){area.scrollTop=Math.max(0,g.y-18);lastSystem=g.system;}if(x<area.scrollLeft+30||x>area.scrollLeft+area.clientWidth-60)area.scrollLeft=Math.max(0,x-area.clientWidth*.35);}
 }
 function tick(){paint(audio.currentTime,true);if(!audio.paused&&!audio.ended)raf=requestAnimationFrame(tick);}
 function seekTo(t){pendingSeek=clamp(t,0,duration());if(audio.readyState>=1){audio.currentTime=pendingSeek;pendingSeek=null;}paint(pendingSeek===null?audio.currentTime:pendingSeek,true);}
 function annotateMeasures(){
  const core=new Set(track.coreMeasures);for(const el of inner.querySelectorAll('g.measure')){if(!core.has(el.id)){el.classList.add('context-measure');continue;}try{const b=el.getBBox(),r=document.createElementNS('http://www.w3.org/2000/svg','rect');r.setAttribute('x',String(b.x-10));r.setAttribute('y',String(b.y-12));r.setAttribute('width',String(b.width+20));r.setAttribute('height',String(b.height+24));r.setAttribute('class','measure-focus');el.insertBefore(r,el.firstChild);}catch{}}
 }
 function setTrack(index){
  const wasPlaying=!audio.paused;audio.pause();cancelAnimationFrame(raf);pendingSeek=null;selected=index;track=data.tracks[index];sourceButtons.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));inner.innerHTML=track.svg;cursor=document.createElement('div');cursor.className='play-cursor';inner.appendChild(cursor);geometry.clear();active=[];lastSystem=null;
  const m=new Map();for(const f of track.frames){const previous=m.get(f.t);if(!previous||(f.ids&&f.ids.length))m.set(f.t,f);}frames=[...m.values()].sort((a,b)=>a.t-b.t);annotateMeasures();area.scrollTop=0;area.scrollLeft=0;
  audio.removeAttribute('src');audio.replaceChildren();
  for(const [url,type] of [[track.audio,'audio/mpeg'],[track.audioFallback,'audio/mp4']]){if(!url)continue;const source=document.createElement('source');source.src=url;source.type=type;audio.appendChild(source);}
  audio.preload='metadata';audio.load();audio.playbackRate=Number(speed.value);audio.preservesPitch=true;audio.webkitPreservesPitch=true;audio.mozPreservesPitch=true;seek.value='0';play.textContent='Play';
  let text=`${track.label} · Excerpt mm. ${track.coreLabels.join('–')} · Context mm. ${track.contextLabels.join('–')} (clipped at file boundaries)`;
  if(track.kind==='performance')text+=` · Original MIDI ${fmt(track.sourceStart)}–${fmt(track.sourceEnd)} · Cursor approximately aligned to GT`;
  meta.textContent=text;status.className='status';status.textContent=track.kind==='performance'?'Original performance timing, dynamics and pedal are retained. The gold cursor is an approximate automatic alignment to GT.':'XML is synthesized at its numeric score tempo; passages without a numeric tempo default to quarter note = 120. The gold cursor follows this excerpt audio.';
  downloads.replaceChildren();const links=[['Download audio',track.audio]];
  for(const [label,url]of links){const a=document.createElement('a');a.href=url;a.textContent=label;a.setAttribute('download','');downloads.appendChild(a);}
  paint(0);postHeight();if(wasPlaying)audio.play().catch(showError);
 }
 function showError(e){status.className='status error';status.textContent='Audio could not play: '+(e?.message||'Open the report in a browser and press Play. You can also download the audio clip.');play.textContent='Play';}
 data.tracks.forEach((tr,i)=>{const b=document.createElement('button');b.type='button';b.textContent=tr.label;b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>setTrack(i));sourceButtons.appendChild(b);});
 play.addEventListener('click',()=>{if(audio.paused)audio.play().catch(showError);else audio.pause();});restart.addEventListener('click',()=>seekTo(0));focus.addEventListener('click',()=>seekTo(track.focusStart));
 speed.addEventListener('change',()=>{audio.playbackRate=Number(speed.value);audio.preservesPitch=true;audio.webkitPreservesPitch=true;});seek.addEventListener('input',()=>seekTo(Number(seek.value)/1000*duration()));
 audio.addEventListener('play',()=>{play.textContent='Pause';if(window.parent!==window)window.parent.postMessage({type:'study-player-started',id:data.id},'*');cancelAnimationFrame(raf);tick();});audio.addEventListener('pause',()=>{play.textContent='Play';cancelAnimationFrame(raf);paint(audio.currentTime);});audio.addEventListener('ended',()=>{play.textContent='Play';cancelAnimationFrame(raf);paint(audio.currentTime,true);});audio.addEventListener('loadedmetadata',()=>{if(pendingSeek!==null){audio.currentTime=pendingSeek;pendingSeek=null;}paint(audio.currentTime);postHeight();});audio.addEventListener('seeked',()=>paint(audio.currentTime,true));audio.addEventListener('error',()=>showError(audio.error));
 window.addEventListener('resize',()=>{geometry.clear();paint(audio.currentTime);postHeight();});window.addEventListener('message',e=>{if(e.source===window.parent&&e.data?.type==='study-player-pause')audio.pause();});
 setTrack(0);document.fonts?.ready.then(()=>{geometry.clear();paint(audio.currentTime);postHeight();});window.addEventListener('load',postHeight);
 // Read-only diagnostics for verification; no control path or network service.
 window.STUDY_PLAYER={data,get selected(){return selected},get currentTrack(){return track},get currentTime(){return audio.currentTime},get playing(){return !audio.paused}};
})();
