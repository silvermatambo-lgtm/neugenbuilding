
/* Shared progressive enhancement, no libraries needed. */
(() => {
  "use strict";
  const ready = () => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasObserver = "IntersectionObserver" in window;
    const isHome = location.pathname === "/" || location.pathname === "/index.html";
    const activeTimers = new WeakMap();

    function typeText(el, speed) {
      if (reduce || !el || !el.isConnected) return;
      const prev = activeTimers.get(el);
      if (prev) { clearTimeout(prev.timer); prev.nodes.forEach(n => { if(n.node.isConnected) n.node.textContent = n.full; }); }
      const nodes = [];
      const walk = (node) => {
        if (node.nodeType === 3) { if (node.textContent) nodes.push({ node, full: node.textContent }); }
        else if (node.nodeType === 1) Array.from(node.childNodes).forEach(walk);
      };
      walk(el);
      const length = nodes.reduce((sum, n) => sum + Array.from(n.full).length, 0);
      if (!length || length > 600) return;
      const height = el.getBoundingClientRect().height;
      if (height) el.style.minHeight = Math.ceil(height) + "px";
      const text = nodes.map(x=>x.full).join("");
      el.setAttribute("aria-label", text.replace(/\s+/g," ").trim());
      const items = nodes.map(n => ({node:n.node,chars:Array.from(n.full),full:n.full}));
      items.forEach(x => { x.node.textContent = ""; });
      el.dataset.typing = "true";
      el.classList.add("is-typing");
      const state = {nodes:items,timer:null};
      activeTimers.set(el,state);
      let pos=0;
      const chunk = speed < 22 ? 2 : 1;
      const tick = () => {
        pos=Math.min(length,pos+chunk);
        let remain=pos;
        for (const x of items) { const limit=Math.min(remain,x.chars.length); x.node.textContent=x.chars.slice(0,limit).join(""); remain-=limit; }
        if(pos < length) state.timer=setTimeout(tick,speed);
        else { el.classList.remove("is-typing"); el.style.minHeight=""; activeTimers.delete(el); }
      };
      state.timer=setTimeout(tick,110);
    }

    if (!reduce && hasObserver) {
      const motionObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          motionObserver.unobserve(entry.target);
        }
      }, {threshold:.08,rootMargin:"0px 0px -5% 0px"});
      const textObserver = new IntersectionObserver(entries => {
        for(const entry of entries) {
          if(!entry.isIntersecting) continue;
          const el=entry.target;
          typeText(el,el.matches("h1,h2,h3")?29:14);
          textObserver.unobserve(el);
        }
      },{threshold:.08,rootMargin:"0px 0px -4% 0px"});
      const visualSelectors = ["main .sectHead","main .featuredWorkCard","main .featuredWorkFooter","main .service",
        "main .galleryItem","main .aboutVisual","main .aboutCopy","main .contactDetails a",
        "main .quote","main .trustGrid > div","main .cta .container","main .flipCard",
        "main .videoGrid","main .faqList details","main .pageLead .container"];
      const seen = new WeakSet();
      function collect() {
        document.querySelectorAll(visualSelectors.join(",")).forEach((el,index) => {
          if(seen.has(el))return;
          seen.add(el);
          const r=el.getBoundingClientRect();
          if(r.bottom<=0 || (r.top<innerHeight*.55 && r.bottom>0))return;
          el.classList.add("motion-ready");
          if(el.matches(".featuredWorkCard,.flipCard,.service")) el.classList.add("motion-flip");
          else if(index%3===1)el.classList.add("motion-from-left");
          else if(index%3===2)el.classList.add("motion-from-right");
          el.style.setProperty("--motion-delay",((index%3)*90)+"ms");
          motionObserver.observe(el);
        });
        document.querySelectorAll("main h1,main h2,main h3,main .lead,main .pageLead p,main .hero p,main .cta p").forEach(el=>{
          if(el.dataset.typePrepared)return;
          el.dataset.typePrepared="true";
          if(el.closest(".flipFace"))return;
          if(el.matches(".hero h1,.hero p")) { typeText(el,el.matches("h1")?35:13); return; }
          textObserver.observe(el);
        });
      }
      collect();
      // Dynamic service cards are populated by existing site code.
      const grids=document.querySelectorAll("#servicesGrid,#galleryGrid");
      for(const grid of grids) new MutationObserver(()=>collect()).observe(grid,{childList:true});
    }

    // Keep hero slide changes animated without modifying existing slide controls.
    const heroTitle=document.getElementById("heroTitle");
    if (heroTitle && !reduce) {
      let lastSlide="Built on solid foundations.Made to last.";
      const known = new Set([lastSlide,"From the ground up.Every detail matters.","Precision you can see.Work with purpose."]);
      const watch = new MutationObserver(() => {
        const value=heroTitle.textContent;
        if(!known.has(value)||value===lastSlide)return;
        lastSlide=value;
        if(heroTitle.getBoundingClientRect().bottom < 0 || document.visibilityState==="hidden")return;
        typeText(heroTitle,31);
        const desc=document.getElementById("heroDesc");
        if(desc) typeText(desc,14);
      });
      watch.observe(heroTitle,{subtree:true,childList:true,characterData:true});
    }

    // Improve the existing mobile toggle without competing with its native handlers.
    const btn=document.getElementById("menuButton"),nav=document.getElementById("nav");
    if(btn&&nav){
      btn.setAttribute("aria-controls","nav");
      const scrim=document.createElement("div");
      scrim.className="ng-nav-scrim";
      scrim.setAttribute("aria-hidden","true");
      document.body.appendChild(scrim);
      const close=()=>{nav.classList.remove("open");btn.setAttribute("aria-expanded","false");btn.setAttribute("aria-label","Open menu");btn.textContent="☰";scrim.classList.remove("open");};
      const sync=()=>{const open=nav.classList.contains("open")&&innerWidth<=990;scrim.classList.toggle("open",open);btn.setAttribute("aria-label",open?"Close menu":"Open menu");};
      btn.addEventListener("click",()=>requestAnimationFrame(sync));
      scrim.addEventListener("click",close);
      document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
      window.addEventListener("resize",()=>{if(innerWidth>990)close();else sync()},{passive:true});
      nav.addEventListener("click",e=>{if(e.target.closest("a"))requestAnimationFrame(sync)});
      document.addEventListener("click",e=>{if(nav.classList.contains("open")&&!e.target.closest("#header")&&!e.target.closest(".ng-nav-scrim"))close()});
    }

    document.querySelectorAll(".flipCard").forEach(card=>{
      card.addEventListener("click",()=>{const open=card.classList.toggle("is-flipped");card.setAttribute("aria-pressed",String(open))});
      card.addEventListener("keydown",e=>{if(e.key==="Escape"){card.classList.remove("is-flipped");card.setAttribute("aria-pressed","false")}});
    });
    document.querySelectorAll(".heroChips span").forEach((x,i)=>x.style.setProperty("--chip-index",String(i)));

    // Delayed custom install prompt. Native install is browser-controlled.
    let installEvent=null;
    const standalone=()=>window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
    window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvent=e;const button=document.getElementById("ngInstallNow");if(button)button.textContent="Install NewGen App";});
    window.addEventListener("appinstalled",()=>{sessionStorage.setItem("newgen-installed","1");dismiss()});
    let overlay=null;
    function dismiss(){
      if(overlay){overlay.hidden=true;overlay.remove();overlay=null;}
      sessionStorage.setItem("newgen-pwa-dismissed","1");
    }
    function platformHelp(){
      const ua=navigator.userAgent||"";
      if(/iPad|iPhone|iPod/.test(ua))return "On iPhone or iPad: open this page in Safari, tap Share (the square with an arrow), select Add to Home Screen, then tap Add.";
      if(/Android/i.test(ua))return "On Android: open this website in Chrome, tap the three-dot browser menu and choose Install app or Add to Home screen.";
      return "On desktop: open this site in Chrome or Edge, select Install app in the address bar or browser menu. If the option is missing, the browser may not support installation.";
    }
    function showInstall(){
      if(standalone() || sessionStorage.getItem("newgen-pwa-dismissed") || sessionStorage.getItem("newgen-installed"))return;
      overlay=document.createElement("div");
      overlay.className="ng-install-overlay";
      overlay.innerHTML='<div class="ng-install-dialog" role="dialog" aria-modal="true" aria-labelledby="ng-install-title" aria-describedby="ng-install-desc">'+
        '<button type="button" class="ng-install-close" aria-label="Close app installation prompt">×</button>'+
        '<img class="ng-install-logo" src="/assets/newgen-roof-icon.webp" alt="NewGen Building Solutions logo" width="80" height="80">'+
        '<span class="ng-install-kicker">NEWGEN BUILDING SOLUTIONS & PROJECTS</span>'+
        '<h2 id="ng-install-title">Take NewGen with you.</h2>'+
        '<p id="ng-install-desc">Install our website as an app for convenient access on your Android phone, iPhone, or desktop. Quick access to our projects, services and WhatsApp enquiries.</p>'+
        '<div class="ng-install-options"><button type="button" class="btn" id="ngInstallNow">'+(installEvent?"Install NewGen App":"How to install")+'</button><button type="button" class="ng-install-later">Not now</button></div>'+
        '<div class="ng-install-help" id="ngInstallHelp" hidden></div></div>';
      document.body.appendChild(overlay);
      const dialog=overlay.querySelector(".ng-install-dialog");
      const installBtn=overlay.querySelector("#ngInstallNow");
      const help=overlay.querySelector("#ngInstallHelp");
      const oldFocus=document.activeElement;
      const close=()=>{dismiss();if(oldFocus&&oldFocus.focus)oldFocus.focus()};
      overlay.querySelector(".ng-install-close").addEventListener("click",close);
      overlay.querySelector(".ng-install-later").addEventListener("click",close);
      overlay.addEventListener("click",e=>{if(e.target===overlay)close()});
      overlay.addEventListener("keydown",e=>{
        if(e.key==="Escape")close();
        if(e.key==="Tab"){const focusable=Array.from(dialog.querySelectorAll("button"));const at=focusable.indexOf(document.activeElement);if(e.shiftKey&&at===0){focusable[focusable.length-1].focus();e.preventDefault()}else if(!e.shiftKey&&at===focusable.length-1){focusable[0].focus();e.preventDefault()}}
      });
      installBtn.addEventListener("click",async()=>{
        if(installEvent) {
          const prompt=installEvent;installEvent=null;
          try{await prompt.prompt();const result=await prompt.userChoice;if(result.outcome==="accepted"){close();return;}}catch(err){}
        }
        help.hidden=false;help.textContent=platformHelp();installBtn.textContent="Installation instructions";
      });
      installBtn.focus();
    }
    if(!standalone())window.setTimeout(showInstall,60000);
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});else ready();
})();
