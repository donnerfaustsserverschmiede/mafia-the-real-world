import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SHOP="jewelry|supermarket|convenience|department_store|clothes|electronics|mobile_phone|computer|furniture|hardware|alcohol|tobacco|car|car_parts|bicycle|motorcycle|beauty|cosmetics|sports|outdoor|shoes|gift|books|mall|general|variety_store|wholesale|doityourself|trade|kiosk|lottery|money_lender|pawnbroker|second_hand|vending_machine";
const AMENITY="bank|atm|casino|post_office";
const GLAT=.0018,GLNG=.0025;
const key=(lat:number,lng:number)=>"z_"+Math.floor(lat/GLAT)+"_"+Math.floor(lng/GLNG);

Deno.serve(async(req:Request)=>{
 try{
  if(req.method!=="POST")throw new Error("POST required");
  const b=await req.json(),south=Number(b.south),west=Number(b.west),north=Number(b.north),east=Number(b.east);
  if(![south,west,north,east].every(Number.isFinite)||south>=north||west>=east)throw new Error("invalid_bbox");
  const q='[out:json][timeout:20];(nwr[shop~"^('+SHOP+')$"]('+south+','+west+','+north+','+east+');nwr[amenity~"^('+AMENITY+')$"]('+south+','+west+','+north+','+east+'););out center;';
  let d:any=null;
  for(const ep of ["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"]){
   try{const r=await fetch(ep+"?data="+encodeURIComponent(q));if(r.ok){d=await r.json();break}}catch(_e){}
  }
  if(!d)throw new Error("osm_unavailable");
  const cells=new Set<string>();
  for(const x of d.elements||[]){const lat=Number(x.lat??x.center?.lat),lng=Number(x.lon??x.center?.lon);if(Number.isFinite(lat)&&Number.isFinite(lng))cells.add(key(lat,lng))}
  return new Response(JSON.stringify({cells:[...cells],count:cells.size}),{headers:{"content-type":"application/json","cache-control":"public,max-age=300"}});
 }catch(e){return new Response(JSON.stringify({error:String(e?.message||e)}),{status:502,headers:{"content-type":"application/json"}})}
});