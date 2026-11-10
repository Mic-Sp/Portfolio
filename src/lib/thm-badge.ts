export const THM_BADGE_MESSAGE = "mic-sp:thm-badge";

/** Isolated parser-time embed: document.write-based vendor scripts work inside srcDoc. */
export function createThmBadgeDocument(scriptUrl: string): string {
  const url = new URL(scriptUrl);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "tryhackme.com" ||
    !url.pathname.startsWith("/badge/")
  )
    throw new Error("Expected a TryHackMe HTTPS badge script.");
  const attribute = scriptUrl.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
  // A normal srcDoc origin satisfies the vendor's frame-ancestors policy; its own
  // CSP limits this wrapper to the supplied vendor script and nested badge frame.
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://tryhackme.com; style-src 'unsafe-inline'; frame-src https://tryhackme.com; img-src https: data:; base-uri 'none'; form-action 'none'"><style>
html,body{margin:0;padding:0;overflow:hidden;background:transparent;color-scheme:dark}
#badge{display:flow-root;width:max-content;line-height:0}
#badge iframe,#badge img,#badge svg{display:block;border:0;overflow:hidden}
</style></head><body><script>
(function(){
  var sent=false, timer, tracked=null, loaded=false;
  function send(payload){parent.postMessage(Object.assign({type:${JSON.stringify(THM_BADGE_MESSAGE)}},payload),'*');}
  window.__micspBadgeUnavailable=function(){if(!sent)send({status:'unavailable'});};
  function measure(){
    var media=document.querySelector('#badge iframe,#badge img,#badge svg');
    if(!media)return;
    if(media!==tracked){
      if(tracked)resize.unobserve(tracked);
      tracked=media;loaded=media.tagName==='svg'||(media.tagName==='IMG'&&media.complete&&media.naturalWidth>0);
      resize.observe(media);
    }
    if(media.tagName==='IFRAME')media.setAttribute('scrolling','no');
    var rect=media.getBoundingClientRect();
    if(rect.width<1||rect.height<1)return;
    if(loaded){sent=true;clearTimeout(timer);}
    send({status:loaded?'embedded':'sizing',width:Math.ceil(rect.width),height:Math.ceil(rect.height)});
  }
  new MutationObserver(measure).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['width','height','style']});
  var resize=new ResizeObserver(measure);resize.observe(document.documentElement);
  document.addEventListener('load',function(event){measure();if(event.target===tracked){loaded=true;measure();}},true);
  document.addEventListener('error',window.__micspBadgeUnavailable,true);
  window.addEventListener('load',measure);
  timer=setTimeout(window.__micspBadgeUnavailable,12000);
})();
</script><div id="badge"><script src="${attribute}" onerror="window.__micspBadgeUnavailable()"></script></div></body></html>`;
}
