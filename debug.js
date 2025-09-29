
/*! debug.js — diagnostics, enabled via ?debug=1 or localStorage.debug=1 */
(function(){
  try{
    window.App = window.App || {};
    App.Debug = App.Debug || {};
    var enabled=false;
    try{ var qs = new URLSearchParams(location.search); enabled = (qs.get('debug')==='1') || (localStorage.getItem('debug')==='1'); }catch(e){}
    App.Debug.enabled = !!enabled;
    function log(ns, level, msg, data){
      if(!App.Debug.enabled) return;
      var tag = "[Lexitron:"+ns+"]["+level+"]"; 
      if(level==='error') console.error(tag,msg,data||""); else if(level==='warn') console.warn(tag,msg,data||""); else console.log(tag,msg,data||"");
    }
    App.Debug.log = log;
    window.LX = window.LX || {};
    window.LX.dump = function(){
      var r={};
      try{
        r.activeDeck = (App.Decks && App.Decks.active && App.Decks.active()) || null;
        r.bounds = (App.Sets && App.Sets.activeBounds && App.Sets.activeBounds()) || null;
        r.index = (App.Trainer && App.Trainer.index && App.Trainer.index()) || null;
        r.strategy = (App.Config && App.Config.trainerStrategy) || null;
        r.reverseThreshold = (App.Config && App.Config.reverseThreshold) || 2.5;
      }catch(e){}
      log("dump","info","state",r); return r;
    };
    window.LX.storage = function(){
      var out={}; try{ for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); out[k]=localStorage.getItem(k);} }catch(e){}
      log("dump","info","storage",out); return out;
    };
  }catch(e){ console.error("[Lexitron:debug][fatal]", e); }
})();
