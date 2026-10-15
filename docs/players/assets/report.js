(() => {
 function activate(root){for(const frame of root.querySelectorAll('iframe[data-player-src]'))if(!frame.src){frame.loading='eager';frame.src=frame.dataset.playerSrc;}}
 document.addEventListener('toggle',e=>{if(e.target.tagName==='DETAILS'&&e.target.open)activate(e.target);},true);
 for(const root of document.querySelectorAll('details[open]'))activate(root);
 for(const frame of document.querySelectorAll('iframe[data-eager]'))frame.src=frame.dataset.playerSrc;
 window.addEventListener('message',e=>{const frames=[...document.querySelectorAll('iframe.study-player')],sender=frames.find(f=>f.contentWindow===e.source);if(!sender)return;if(e.data?.type==='study-player-height')sender.style.height=Math.min(860,Math.max(360,Number(e.data.height)+8))+'px';if(e.data?.type==='study-player-started')for(const frame of frames)if(frame!==sender)frame.contentWindow.postMessage({type:'study-player-pause'},'*');});
 document.addEventListener('click',async e=>{const b=e.target.closest('[data-copy-path]');if(!b)return;const text=b.dataset.copyPath;try{await navigator.clipboard.writeText(text);}catch{const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();}const old=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=old,1200);});
})();
document.addEventListener('click',e=>{const a=e.target.closest('[data-open-pattern]');if(a){const target=document.getElementById(a.dataset.openPattern);if(target)target.open=true;}});
function openLinkedPattern(){const target=document.getElementById(decodeURIComponent(window.location.hash.slice(1)));if(target?.tagName==='DETAILS')target.open=true;}
window.addEventListener('hashchange',openLinkedPattern);openLinkedPattern();
