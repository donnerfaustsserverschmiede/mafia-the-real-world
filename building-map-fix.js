/* MAFIVERA — Grundstück -> Bausystem bridge + selected field tracking */
(()=>{'use strict';
const SAVE_PREFIX='mafivera:v1:save:';
const getSave=()=>{const key=Object.keys(localStorage).find(k=>k.startsWith(SAVE_PREFIX));let state={};try{state=key?JSON.parse(localStorage.getItem(key)||'{}'):{} }catch(e){}return{key,state}};
const setSelected=id=>{if(id)window.__mtrwBuildingCell=id};
const install=()=>{
  if(!window.mtrwClaim||window.mtrwClaim.__buildingBridge)return false;
  const old=window.mtrwClaim;
  const wrapped=function(id){setSelected(id);return old.apply(this,arguments)};
  wrapped.__buildingBridge=true;
  window.mtrwClaim=wrapped;
  return true;
};
const watch=()=>{
  install();
  const title=document.getElementById('drawerTitle'),body=document.getElementById('drawerBody');
  if(title&&body&&title.textContent==='Grundstück'&&window.__mtrwBuildingCell){
    const id=window.__mtrwBuildingCell,{state}=getSave();
    if(state.fields?.[id]&&!body.querySelector('.building-grid')&&!body.querySelector('.building-current')){
      const b=document.createElement('button');b.type='button';b.className='panel-action';b.textContent='🏗️ Gebäude auf diesem Feld verwalten';
      b.onclick=()=>{body.querySelector('[data-open-build]')?.click();};
      body.appendChild(b);
    }
  }
  setTimeout(watch,250);
};
watch();
})();
