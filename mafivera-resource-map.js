/* MAFIVERA — Ressourcen-Kartenmodell (Grundlage für den rasterlosen Scanner)
 * Dieses Modul definiert nur Darstellung und Datenvertrag. Es erzeugt KEINE
 * Ressourcenwerte im Browser. Konzentrationen müssen später serverseitig
 * dauerhaft bereitgestellt werden.
 */
(()=>{'use strict';
const resources={
 cannabis:{label:'Cannabis',color:'#22c55e',building:'field',kind:'cultivation'},
 flour:{label:'Mehl',color:'#f4f1e8',building:'mill',kind:'extraction'},
 weapon_parts:{label:'Waffenteile',color:'#7b8490',building:'workshop',kind:'extraction'},
 coca:{label:'Koka',color:'#eab308',building:'field',kind:'cultivation'},
 meth:{label:'Meth',color:'#a855f7',building:'lab',kind:'processing'},
 chemicals:{label:'Chemikalien',color:'#06b6d4',building:'lab',kind:'processing'},
 tobacco:{label:'Tabak',color:'#a16207',building:'field',kind:'cultivation'},
 metals:{label:'Metalle',color:'#d97706',building:'workshop',kind:'extraction'}
};
const clamp=n=>Math.max(0,Math.min(100,Number(n)||0));
function styleFor(resourceId,concentration){
 const resource=resources[resourceId];if(!resource)return null;
 const value=clamp(concentration);
 if(value===0)return {color:resource.color,opacity:0,concentration:0,visible:false};
 // Opacity communicates abundance while hue always identifies the resource.
 return {color:resource.color,opacity:.12+(value/100)*.58,concentration:value,visible:true};
}
window.MAFIVERA_RESOURCE_MAP=Object.freeze({
 version:1,
 resources:Object.freeze(resources),
 styleFor,
 clamp,
 rules:Object.freeze({
  independentLayers:true,
  overlappingResources:true,
  zeroIsTransparent:true,
  hueIdentifiesResource:true,
  opacityRepresentsConcentration:true,
  scanRadiusEqualsBuildRadius:true,
  placement:'free-within-player-radius',
  concentrationSource:'server'
 })
});
})();