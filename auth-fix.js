/* MTRW auth compatibility shim.
   Supabase warns that async work started directly inside
   onAuthStateChange can deadlock subsequent auth/API calls.
   Defer callbacks one macrotask so login can finish first.
*/
(function(){
  let tries=0;
  function patch(){
    const client=window.db;
    if(!client?.auth?.onAuthStateChange){
      if(tries++<200)setTimeout(patch,25);
      return;
    }
    if(client.auth.__mtrwDeferredAuthPatch)return;
    const original=client.auth.onAuthStateChange.bind(client.auth);
    client.auth.onAuthStateChange=function(callback){
      return original((event,session)=>{
        setTimeout(()=>{
          try{callback(event,session)}catch(error){console.error('MTRW auth callback error',error)}
        },0);
      });
    };
    client.auth.__mtrwDeferredAuthPatch=true;
  }
  patch();
})();
// deployment trigger 2026-09-15-auth-deadlock-fix-v3