/* MAFIVERA V1 – map + production stability fix */
(()=>{'use strict';
const css=`
/* Map markers are deliberately isolated from global readability scaling. */
.mf-map .leaflet-marker-icon.res-marker{width:24px!important;height:24px!important;margin:0!important;padding:0!important;overflow:visible!important;transform:none!important;background:transparent!important;border:0!important;box-sizing:border-box!important;}
.mf-map .leaflet-marker-icon.res-marker span{display:grid!important;place-items:center!important;width:22px!important;height:22px!important;margin:1px!important;padding:0!important;box-sizing:border-box!important;border-radius:7px!important;font-family:system-ui,-apple-system,"Segoe UI",sans-serif!important;font-size:12px!important;line-height:22px!important;font-weight:900!important;transform:none!important;}
.mf-map .leaflet-marker-icon.building-marker{width:100px!important;height:52px!important;margin:0!important;padding:0!important;overflow:visible!important;transform:none!important;background:transparent!important;border:0!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:0!important;}
.mf-map .leaflet-marker-icon.building-marker span{display:block!important;margin:0!important;padding:0!important;width:auto!important;height:auto!important;font-size:27px!important;line-height:27px!important;transform:none!important;}
.mf-map .leaflet-marker-icon.building-marker b{display:block!important;width:max-content!important;max-width:100px!important;margin:0!important;padding:2px 5px!important;box-sizing:border-box!important;font-family:system-ui,-apple-system,"Segoe UI",sans-serif!important;font-size:7px!important;line-height:11px!important;white-space:nowrap!important;transform:none!important;}
.mf-map .leaflet-marker-icon.dealer-marker{width:90px!important;height:58px!important;margin:0!important;padding:0!important;overflow:visible!important;transform:none!important;background:transparent!important;border:0!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:1px!important;}
.mf-map .leaflet-marker-icon.dealer-marker span,.mf-map .leaflet-marker-icon.dealer-marker .dealer-pin{display:block!important;margin:0!important;padding:0!important;width:auto!important;height:auto!important;font-size:30px!important;line-height:30px!important;transform:none!important;}
.mf-map .leaflet-marker-icon.dealer-marker b,.mf-map .leaflet-marker-icon.dealer-marker .dealer-label{display:block!important;width:max-content!important;height:auto!important;margin:0!important;padding:3px 7px!important;box-sizing:border-box!important;font-family:system-ui,-apple-system,"Segoe UI",sans-serif!important;font-size:9px!important;line-height:12px!important;white-space:nowrap!important;transform:none!important;}
/* The old single-job status is obsolete; V3 renders all active queues. */
#mtrwProductionLegacyStatus,#productionStatus{display:none!important;}
`;
const s=document.createElement('style');s.id='mtrw-v1-stability-fix';s.textContent=css;document.head.appendChild(s);
function cleanLegacy(){document.querySelectorAll('#productionStatus').forEach(x=>x.remove());}
cleanLegacy();
new MutationObserver(cleanLegacy).observe(document.body,{childList:true,subtree:true});
})();