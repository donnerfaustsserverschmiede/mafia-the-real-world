/* MAFIVERA – dealer notifications: mailbox only
   Dealer / weapon-dealer spawn messages are intentionally NOT shown as left-side alerts.
   The mailbox is the single notification channel. Clicking the mailbox entry centers the map.
*/
(()=>{'use strict';
function removeSpawnAlerts(){
  const selectors=[
    '#dealerAlert',
    '#weaponDealerAlert',
    '[data-dealer-alert]',
    '[data-weapon-dealer-alert]',
    '.dealer-alert',
    '.weapon-dealer-alert'
  ];
  selectors.forEach(sel=>{
    document.querySelectorAll(sel).forEach(el=>{
      try{el.remove()}catch(_){el.style.display='none'}
    });
  });
}
removeSpawnAlerts();
const observer=new MutationObserver(removeSpawnAlerts);
observer.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>observer.disconnect(),30000);
})();