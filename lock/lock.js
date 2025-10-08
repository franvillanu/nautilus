// lock.js — minimal unlock logic (case-insensitive match to 'uniocean')
(function(){
  // wait for DOM so the script works regardless of where it's included
  function init(){
    const FORM = document.getElementById('unlockForm');
    const PW = document.getElementById('pw');
    const STATUS = document.getElementById('status');
    const OVERLAY = document.getElementById('overlay');
    const KEY = 'nautilus_unlocked_at';
    const PASSWORD = 'uniocean'; // case-insensitive
    const SESSION_MS = 24 * 60 * 60 * 1000; // 24h

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

    async function doUnlock(){
      showStatus('');
      const v = PW.value || '';
      if(!v.trim()){ showStatus('Please enter the password'); PW.focus(); return; }

      if(normalize(v) === PASSWORD){
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
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
