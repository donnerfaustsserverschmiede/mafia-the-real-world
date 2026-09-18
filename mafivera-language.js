(()=>{'use strict';
if(window.__mtrwLangLoaded)return;window.__mtrwLangLoaded=true;
const KEY='mafivera_language', state={lang:localStorage.getItem(KEY)||'de'};
const D={
'de':{},'en':{
'Einstellungen':'Settings','Spiel, Musik und rechtliche Informationen':'Game, music and legal information','Hintergrundmusik':'Background Music','Spiel':'Game','Rechtliches':'Legal','Musik':'Music','Lautstärke':'Volume','Karte / Spiel neu laden':'Reload map / game','Impressum':'Legal Notice','Datenschutzerklärung':'Privacy Policy','Nutzungsbedingungen / Spielregeln':'Terms of Use / Game Rules','Sprache':'Language','Deutsch':'German','Englisch':'English','AN':'ON','AUS':'OFF',
'KARTE':'MAP','FAMILIE':'FAMILY','GESCHÄFTE':'BUSINESS','SCHLÄGER':'HITMEN','SOZIAL':'SOCIAL','DISCORD':'DISCORD','GELD':'MONEY','MATERIAL':'MATERIAL','DROGEN':'DRUGS','LEVEL':'LEVEL','MAFIA-KASSE':'MAFIA CASH','IM LAGER':'IN STORAGE','PRODUKTION':'PRODUCTION','SPIELERSTUFE':'PLAYER LEVEL','Dein Gebiet':'Your Territory','Fremdes Gebiet':'Enemy Territory','Freies Feld':'Free Field','DEIN GEBIET':'YOUR TERRITORY','FREMDES GEBIET':'ENEMY TERRITORY','FREIES FELD':'FREE FIELD','Verteidigung':'Defense','Schläger':'Hitmen','Ressource':'Resource','Gebiet angreifen':'Attack Territory','Gebiet beanspruchen':'Claim Territory','Geschäfte':'Business','Produktion':'Production','Unternehmungen':'Operations','Sozial':'Social','Freunde':'Friends','Einladungen':'Invitations','Rangliste':'Leaderboard','Profil':'Profile','Abmelden':'Log out','Spieler':'Player','Freund per Link einladen':'Invite friend by link','Freundschaftsanfrage senden':'Send friend request','Familien suchen':'Find families','In meine Familie einladen':'Invite to my family','Dealer':'Dealer','Dealer-Angebot':'Dealer Offer','Verkaufen':'Sell','Angebot ablehnen':'Decline offer','Gebäude':'Buildings','Gebäudezentrale':'Building Center','Maximum':'Maximum','Material-Lagerkapazität':'Material storage capacity','Grundverteidigung':'Base defense','Kampfwerte':'Combat values','Gebietsstatus':'Territory status'
}};
function translate(root=document.body){
 const lang=state.lang;if(lang==='de')return;
 const map=D.en;
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];while(w.nextNode())nodes.push(w.currentNode);
 for(const n of nodes){let t=n.nodeValue;for(const [a,b] of Object.entries(map))if(t.includes(a))t=t.split(a).join(b);n.nodeValue=t}
}
function setLang(lang){state.lang=lang;localStorage.setItem(KEY,lang);document.documentElement.lang=lang;translate();document.dispatchEvent(new CustomEvent('mtrw:language',{detail:{lang}}))}
window.__mtrwLanguage={get:()=>state.lang,set:setLang,translate};
document.documentElement.lang=state.lang;
new MutationObserver(m=>{if(state.lang==='en')for(const x of m)for(const n of x.addedNodes)if(n.nodeType===1)translate(n)}).observe(document.body,{childList:true,subtree:true});
})();