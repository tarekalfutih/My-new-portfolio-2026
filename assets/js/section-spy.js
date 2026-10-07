// Section tabs scroll-spy: colours the section-tab link (.cs-tabs, here nav.cs-nav) for the section in view.
(function(){
  var st=document.createElement('style');
  st.textContent='.cs-nav a{position:relative;transition:color .2s}'+
    '.cs-nav a,.cs-nav a:hover,.cs-nav a:focus{text-decoration:none !important;border-bottom:0 !important;box-shadow:none !important}.cs-nav a::after,.cs-nav a::before{content:none !important;display:none !important}'+
    '.cs-nav a[data-spy-on]{color:#122a8f !important}';
  document.head.appendChild(st);
  var ticking=false,lastNav=null;
  function update(){
    ticking=false;
    var nav=document.querySelector('nav.cs-nav');
    if(!nav||nav.offsetParent===null)return;
    if(nav!==lastNav){lastNav=nav;}
    var cs=getComputedStyle(nav);
    nav.style.setProperty('--spy-off',cs.paddingBottom);
    var links=[].slice.call(nav.querySelectorAll('a[href^="#"]'));
    if(!links.length)return;
    var hdr=nav.closest('header')||nav;
    var off=hdr.getBoundingClientRect().bottom+32;
    var cur=links[0];
    links.forEach(function(a){
      var s=document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
      if(s&&s.getBoundingClientRect().top<=off)cur=a;
    });
    var de=document.documentElement;
    if(window.innerHeight+window.scrollY>=de.scrollHeight-4)cur=links[links.length-1];
    links.forEach(function(a){
      if(a===cur){a.setAttribute('data-spy-on','');a.setAttribute('aria-current','location');}
      else{a.removeAttribute('data-spy-on');a.removeAttribute('aria-current');}
    });
    if(nav.scrollWidth>nav.clientWidth){
      var nr=nav.getBoundingClientRect(),ar=cur.getBoundingClientRect();
      if(ar.left<nr.left+24||ar.right>nr.right-24){
        nav.scrollTo({left:nav.scrollLeft+(ar.left-nr.left)-56,behavior:'smooth'});
      }
    }
  }
  function req(){if(!ticking){ticking=true;requestAnimationFrame(update);}}
  window.addEventListener('scroll',req,{passive:true});
  window.addEventListener('resize',req);
  window.addEventListener('hashchange',function(){setTimeout(req,50);});
  var n=0,iv=setInterval(function(){req();if(++n>40)clearInterval(iv);},250);
})();
