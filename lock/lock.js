// lock.js — secure unlock logic with hashed passwords
(function(){
  // wait for DOM so the script works regardless of where it's included
  function init(){
    const FORM = document.getElementById('unlockForm');
    const PW = document.getElementById('pw');
    const STATUS = document.getElementById('status');
    const OVERLAY = document.getElementById('overlay');
    const KEY = 'nautilus_unlocked_at';
    const SESSION_MS = 24 * 60 * 60 * 1000; // 24h

    // SHA-256 hashes of valid passwords (passwords are NOT stored in plaintext)
    const HASHES = {
      // Main unlock passwords (no easter egg)
      UNLOCK: [
        '3569e829ff244da70fdd9d1991d1b4fbd21ce89e467ebcea819c5518f0c93bc3', // uniocean
        '740448c2db4e24b63c3090e65bfdfbcfe870cb3bdc3da26981306effdd080616'  // 0330
      ],
      // Easter egg passwords (show images)
      EASTER: [
        '06843e3f58776ec2eb5e0cc7a44a3c3fc1b4b9af2e75504da3d299dc566cc395', // 0103
        '278bbd9a3543ab02c75052bbde036c4d7493fd4bccd468604b64352fc59b50e5', // 24012020
        'b3f69901600b6983d0f7add209f69419c0d7eb037111c310b0284caf2ebe1373'  // 240120
      ]
    };

    if(!FORM || !PW || !STATUS || !OVERLAY){
      // elements not present — nothing to do
      return;
    }

    function now(){ return Date.now(); }
    function unlocked(){
      try{
        const v = localStorage.getItem(KEY);
        if(!v) return false;
        const t = Number(v);
        return !Number.isNaN(t) && (now() - t) < SESSION_MS;
      }catch(e){ return false; }
    }

    function setUnlocked(){
      try{ localStorage.setItem(KEY, String(now())); }catch(e){}
    }

    function normalize(s){ return String(s||'').trim().toLowerCase(); }

    function showStatus(msg, color){
      try{ STATUS.textContent = msg || ''; STATUS.style.color = color || '#ffb3b3'; }catch(e){}
    }

    // SHA-256 hash function using Web Crypto API
    async function hashPassword(password){
      try{
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
      }catch(e){
        console.error('Hash failed:', e);
        return null;
      }
    }

    async function doUnlock(){
      showStatus('');
      const v = PW.value || '';
      if(!v.trim()){ showStatus('Please enter the password'); PW.focus(); return; }

      // Hash the user input
      const vTrim = String(v).trim();
      const vNormalized = normalize(v);

      // Try hashing both the trimmed version and normalized (lowercase) version
      const hashTrimmed = await hashPassword(vTrim);
      const hashNormalized = await hashPassword(vNormalized);

      if(!hashTrimmed || !hashNormalized){
        showStatus('Authentication error', '#ffb3b3');
        return;
      }

      // Check if it's an easter egg password (shows image)
      if(HASHES.EASTER.includes(hashTrimmed)){
        try{
          // Special handling for main easter egg
          if(hashTrimmed === HASHES.EASTER[0]){ // 0103
            showEaster();
          } else { // 24012020 or 240120
            showEaster0103();
          }
        }catch(e){}
        return;
      }

      // Check if it's a main unlock password (direct unlock, no images)
      if(HASHES.UNLOCK.includes(hashNormalized) || HASHES.UNLOCK.includes(hashTrimmed)){
        // success: persist unlock and hide overlay immediately to avoid placeholder flash
        setUnlocked();
        try{ OVERLAY.style.display = 'none'; document.body.style.overflow = ''; }catch(e){}
        try{ PW.disabled = true; const btn = document.getElementById('unlock'); if(btn) btn.disabled = true; }catch(e){}
        // clear sensitive UI after overlay is hidden so placeholder doesn't appear briefly
        try{ PW.value = ''; STATUS.textContent = ''; }catch(e){}
        return;
      }

      showStatus('Incorrect password', '#ffb3b3');
      try{ PW.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:240}); }catch(e){}
    }

    FORM.addEventListener('submit', (e)=>{ e.preventDefault(); doUnlock(); });
    PW.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); doUnlock(); } });

    if(unlocked()){
      try{ PW.value = ''; STATUS.textContent = ''; OVERLAY.style.display = 'none'; document.body.style.overflow = ''; }catch(e){}
    } else {
      try{ PW.value = ''; STATUS.textContent = ''; OVERLAY.style.display = 'flex'; document.body.style.overflow = 'hidden'; }catch(e){}
      setTimeout(()=> PW.focus(), 200);
    }

    // expose signOut so the main app can re-lock
    window.signOut = function(){
      try{ localStorage.removeItem(KEY); }catch(e){}
      try{
        PW.value = '';
        STATUS.textContent = '';
        PW.disabled = false;
        const btn = document.getElementById('unlock'); if(btn) btn.disabled = false;
        OVERLAY.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        setTimeout(()=> PW.focus(), 80);
      }catch(e){}
    };

    // Easter-egg: show a random image overlay when triggered
    function createEasterOverlay(src){
      if(!src) src = '0103.jpg';
      const imgWrap = document.createElement('div');
      imgWrap.id = 'easter-wrap';
      imgWrap.style.position = 'fixed';
      imgWrap.style.inset = 0;
      imgWrap.style.display = 'flex';
      imgWrap.style.alignItems = 'center';
      imgWrap.style.justifyContent = 'center';
      imgWrap.style.background = 'rgba(0,0,0,0.95)';
      imgWrap.style.zIndex = 10001;

      const img = document.createElement('img');
      img.id = 'easter-img';
      img.src = src;
      img.alt = src;
      img.style.maxWidth = '92%';
      img.style.maxHeight = '92%';
      img.style.boxShadow = '0 8px 40px rgba(0,0,0,0.8)';
      img.style.borderRadius = '10px';
      img.style.cursor = 'pointer';
      img.style.transition = 'opacity 220ms ease';
      img.style.opacity = '1';

      // controls container (bottom-right)
      const ctrl = document.createElement('div');
      ctrl.style.position = 'fixed';
      ctrl.style.right = '20px';
      ctrl.style.bottom = '26px';
      ctrl.style.display = 'flex';
      ctrl.style.gap = '8px';
      ctrl.style.zIndex = 10002;

      const shuffleBtn = document.createElement('button');
      shuffleBtn.textContent = 'Shuffle';
      shuffleBtn.style.padding = '8px 12px';
      shuffleBtn.style.borderRadius = '8px';
      shuffleBtn.style.border = 'none';
      shuffleBtn.style.background = 'rgba(255,255,255,0.06)';
      shuffleBtn.style.color = '#fff';
      shuffleBtn.style.cursor = 'pointer';

  // single semi-transparent circular shuffle button (no Close button)
  shuffleBtn.innerHTML = '⟲';
  shuffleBtn.setAttribute('aria-label','Shuffle images');
  shuffleBtn.style.width = '44px';
  shuffleBtn.style.height = '44px';
  shuffleBtn.style.display = 'inline-flex';
  shuffleBtn.style.alignItems = 'center';
  shuffleBtn.style.justifyContent = 'center';
  shuffleBtn.style.borderRadius = '999px';
  shuffleBtn.style.fontSize = '20px';
  shuffleBtn.style.background = 'rgba(0,0,0,0.36)';
  shuffleBtn.style.opacity = '0.85';
  shuffleBtn.style.border = '1px solid rgba(255,255,255,0.06)';
  shuffleBtn.style.backdropFilter = 'blur(4px)';
  shuffleBtn.style.boxShadow = '0 4px 18px rgba(0,0,0,0.45)';
  shuffleBtn.style.cursor = 'pointer';
  shuffleBtn.style.transition = 'opacity 140ms ease, transform 120ms ease';

  ctrl.appendChild(shuffleBtn);

      imgWrap.appendChild(img);
      document.body.appendChild(imgWrap);
      document.body.appendChild(ctrl);

      let closed = false;

      function removeOverlay(){
        if(closed) return; closed = true;
        try{ if(imgWrap.parentNode) imgWrap.parentNode.removeChild(imgWrap); }catch(e){}
        try{ if(ctrl.parentNode) ctrl.parentNode.removeChild(ctrl); }catch(e){}
      }

      img.addEventListener('click', (ev)=>{
        // clicking image unlocks
        ev.stopPropagation();
        try{ setUnlocked(); }catch(e){}
        removeOverlay();
        try{ OVERLAY.style.display = 'none'; document.body.style.overflow = ''; }catch(e){}
      });

      // Handle image load errors: show fallback UI instead of broken image
      let fallbackNode = null;
      function showBrokenFallback(reason){
        try{
          img.style.display = 'none';
          if(fallbackNode) return;
          fallbackNode = document.createElement('div');
          fallbackNode.style.color = '#fff';
          fallbackNode.style.textAlign = 'center';
          fallbackNode.style.padding = '18px';
          fallbackNode.style.maxWidth = '70%';
          fallbackNode.style.borderRadius = '8px';
          fallbackNode.style.background = 'rgba(0,0,0,0.45)';

          const m = document.createElement('div');
          m.textContent = 'Image failed to load.';
          m.style.marginBottom = '10px';
          const tryBtn = document.createElement('button');
          tryBtn.textContent = 'Try another';
          tryBtn.style.marginRight = '8px';
          tryBtn.style.padding = '8px 12px';
          tryBtn.style.border = 'none';
          tryBtn.style.borderRadius = '8px';
          tryBtn.style.cursor = 'pointer';
          tryBtn.style.background = 'rgba(255,255,255,0.06)';
          tryBtn.style.color = '#fff';

          const openBtn = document.createElement('button');
          openBtn.textContent = 'Open app';
          openBtn.style.padding = '8px 12px';
          openBtn.style.border = 'none';
          openBtn.style.borderRadius = '8px';
          openBtn.style.cursor = 'pointer';
          openBtn.style.background = 'rgba(255,255,255,0.08)';
          openBtn.style.color = '#fff';

          fallbackNode.appendChild(m);
          fallbackNode.appendChild(tryBtn);
          fallbackNode.appendChild(openBtn);
          imgWrap.appendChild(fallbackNode);

          tryBtn.addEventListener('click', async (ev)=>{
            ev.stopPropagation();
            // attempt to shuffle
            try{ const newSrc = await chooseRandomEasterImage(); const loaded = await preloadImage(newSrc, 10000); img.src = loaded.src; img.style.display = ''; if(fallbackNode && fallbackNode.parentNode) fallbackNode.parentNode.removeChild(fallbackNode); try{ localStorage.setItem('nautilus_easter_last', loaded.src); }catch(e){} }catch(err){ console.warn('[easter] try-another failed', err); }
          });

          openBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); try{ setUnlocked(); }catch(e){} removeOverlay(); try{ OVERLAY.style.display = 'none'; document.body.style.overflow = ''; }catch(e){} });
        }catch(err){ console.error('[easter] showBrokenFallback failed', err); }
      }

      img.onerror = function(e){
        console.warn('[easter] overlay img.onerror', e, img.src);
        showBrokenFallback(e);
      };

      shuffleBtn.addEventListener('click', async (ev)=>{
        ev.stopPropagation();
        try{
          const newSrc = await chooseRandomEasterImage();
          // preload fully (longer timeout allowed) then swap to avoid flicker
          try{
            img.style.opacity = '0';
            const loaded = await preloadImage(newSrc, 10000);
            // once loaded, swap and fade in
            img.src = loaded.src;
            try{ localStorage.setItem('nautilus_easter_last', loaded.src); }catch(e){}
            setTimeout(()=>{ img.style.opacity = '1'; }, 60);
          }catch(preErr){
            console.warn('[easter] preload failed for', newSrc, preErr);
            // fallback: set src anyway
            img.src = newSrc;
            img.style.opacity = '1';
          }
        }catch(e){ console.error('[easter] shuffle error', e); img.style.opacity = '1'; }
      });

      // also close on Escape
      function esc(e){ if(e.key === 'Escape'){ removeOverlay(); document.removeEventListener('keydown', esc); } }
      document.addEventListener('keydown', esc);
    }

    async function showEaster(){
      // Try several times to pick & preload an image before showing the overlay
      try{
        let attempts = 0;
        const maxAttempts = 6;
        let lastErr = null;
        while(attempts < maxAttempts){
          attempts++;
          try{
            const src = await chooseRandomEasterImage();
            console.log('[easter] attempt', attempts, 'picked ->', src);
            try{
              await preloadImage(src, 10000);
              // success — show overlay with this image
              createEasterOverlay(src);
              return;
            }catch(preErr){
              console.warn('[easter] preload failed for', src, preErr);
              lastErr = preErr;
              // try another
              continue;
            }
          }catch(e){
            console.warn('[easter] chooseRandomEasterImage failed on attempt', attempts, e);
            lastErr = e;
            continue;
          }
        }

        // If we get here, no valid/preloadable image was found — try fallback 0103.jpg
        try{
          await preloadImage('0103.jpg', 8000);
          createEasterOverlay('0103.jpg');
          return;
        }catch(fb){
          console.error('[easter] fallback preload also failed', fb, lastErr);
        }

        // As a last resort show a simple overlay message (no broken img)
        try{
          const wrap = document.createElement('div');
          wrap.style.position = 'fixed'; wrap.style.inset = 0; wrap.style.display = 'flex'; wrap.style.alignItems = 'center'; wrap.style.justifyContent = 'center'; wrap.style.background = 'rgba(0,0,0,0.9)'; wrap.style.zIndex = 10001; wrap.style.color = '#fff';
          const msg = document.createElement('div');
          msg.style.maxWidth = '80%'; msg.style.textAlign = 'center'; msg.style.padding = '20px'; msg.style.fontSize = '16px';
          msg.textContent = 'No easter images are currently available.';
          wrap.appendChild(msg);
          document.body.appendChild(wrap);
          setTimeout(()=>{ try{ if(wrap.parentNode) wrap.parentNode.removeChild(wrap); }catch(e){} }, 4000);
        }catch(finalErr){ console.error('[easter] final overlay failed', finalErr); }

      }catch(e){
        console.error('[easter] unexpected failure', e);
      }
    }

    // Direct show for the canonical 0103 image (used by alternate secret passphrases)
    async function showEaster0103(){
      try{
        const src = 'lock/easter/0103.jpg';
        try{ await preloadImage(src, 8000); }catch(e){
          // Try a shorter fallback to site-root 0103.jpg for older setups
          try{ await preloadImage('0103.jpg', 6000); src = '0103.jpg'; }catch(err){}
        }
        createEasterOverlay(src);
      }catch(e){ console.error('[easter] showEaster0103 failed', e); }
    }

    // Try to pick a random easter image. Preference order:
    // 1) fetch 'lock/easter/list.json' (array of paths relative to site root)
    // 2) probe a numeric sequence like 'lock/easter/0101.jpg'..'lock/easter/0120.jpg'
    // 3) fallback to '0103.jpg'
    async function chooseRandomEasterImage(){
      // Try manifest
      try{
        // cache-bust the manifest fetch to avoid stale responses from proxies/cache
        const res = await fetch('lock/easter/list.json?_ts=' + Date.now(), {cache: 'no-store'});
        if(res.ok){
          const list = await res.json();
          console.log('[easter] manifest loaded', list && list.length, 'entries');
          if(Array.isArray(list) && list.length){
            // Validate manifest entries by testing each image (may be slow but robust)
            const checks = await Promise.all(list.map(async (p)=>({p, ok: await testImage(p)})));
            const valid = checks.filter(c=>c.ok).map(c=>c.p);
            console.log('[easter] manifest valid entries ->', valid.length, valid);
            if(valid.length === 0){ console.warn('[easter] no valid images in manifest'); }

            if(valid.length > 0){
              try{
                const last = localStorage.getItem('nautilus_easter_last');
                if(valid.length === 1){
                  localStorage.setItem('nautilus_easter_last', valid[0]);
                  console.log('[easter] only one valid manifest entry ->', valid[0]);
                  return valid[0];
                }
                // Try to pick a different image than last
                let pick = null;
                for(let attempt=0; attempt<8; attempt++){
                  const cand = valid[Math.floor(Math.random()*valid.length)];
                  if(cand !== last){ pick = cand; break; }
                }
                if(!pick){
                  const idx = Math.max(0, valid.indexOf(last));
                  pick = valid[(idx+1) % valid.length];
                }
                localStorage.setItem('nautilus_easter_last', pick);
                console.log('[easter] picked from manifest ->', pick);
                return pick;
              }catch(e){
                const pick = valid[Math.floor(Math.random()*valid.length)];
                try{ localStorage.setItem('nautilus_easter_last', pick); }catch(err){}
                return pick;
              }
            }
          }
        } else {
          console.warn('[easter] manifest fetch not ok', res.status);
        }
      }catch(e){ console.error('[easter] manifest fetch error', e); }

      // Probe a numbered sequence (attempt up to 12 random tries)
      const base = 'lock/easter/';
      const tries = 12;
      const min = 1, max = 40; // try files 0101..0140
      for(let i=0;i<tries;i++){
        const n = Math.floor(Math.random()*(max-min+1)) + min;
        const name = String(n).padStart(4,'0') + '.jpg';
        const url = base + name;
        const ok = await testImage(url);
        if(ok){
          console.log('[easter] probe found', url);
          return url;
        }
      }

      // final fallback
      return '0103.jpg';
    }

    function testImage(url){
      return new Promise((resolve)=>{
        const img = new Image();
        let done = false;
        img.onload = ()=>{ if(!done){ done=true; resolve(true); } };
        img.onerror = ()=>{ if(!done){ done=true; resolve(false); } };
        // timeout in 2s
        setTimeout(()=>{ if(!done){ done=true; resolve(false); } }, 2000);
        img.src = url;
      });
    }

    function preloadImage(url, timeout = 8000){
      return new Promise((resolve, reject)=>{
        const img = new Image();
        let done = false;
        img.onload = ()=>{ if(!done){ done=true; resolve(img); } };
        img.onerror = (e)=>{ if(!done){ done=true; reject(new Error('failed to load ' + url)); } };
        setTimeout(()=>{ if(!done){ done=true; reject(new Error('timeout loading ' + url)); } }, timeout);
        img.src = url;
      });
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
