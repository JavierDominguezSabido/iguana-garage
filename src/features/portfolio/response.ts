import {photoRequest} from "./delivery";
import {derivativePath,preparedWidth} from "./variants";

export const photoHeaders = {"Cache-Control":"private, no-store, max-age=0","CDN-Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
type Download = (path:string)=>Promise<{data:Blob|null;error:unknown}>;
function unavailable(status:number) {return Response.json({error:"Fotografía no disponible"},{status,headers:photoHeaders});}
function missing(error:unknown):boolean {
  if (!error || typeof error !== "object") return false;
  const status = Number("status" in error ? error.status : "statusCode" in error ? error.statusCode : 0);
  return [400,401,403,404].includes(status);
}
function isWebp(bytes:Uint8Array):boolean {
  return bytes.length>=12 && bytes.length<=5*1024*1024 && [82,73,70,70].every((v,i)=>bytes[i]===v) && [87,69,66,80].every((v,i)=>bytes[i+8]===v);
}
export async function publicPhotoResponse(jobId:string,mediaId:string,url:URL,download:Download):Promise<Response> {
  let photo;
  try {photo=photoRequest(jobId,mediaId,url);}catch{return unavailable(404);}
  try {
    const path=derivativePath(jobId,mediaId,preparedWidth(photo.width));
    let result=await download(path); // RLS anon revalida publicación en CADA descarga.
    let legacy=false;
    if(result.error || !result.data){
      if(result.error && !missing(result.error))return unavailable(503);
      if(path===photo.path)return unavailable(404);
      result=await download(photo.path);legacy=true; // Nunca originales ni identidad privilegiada.
      if(result.error || !result.data)return unavailable(result.error && !missing(result.error)?503:404);
    }
    const bytes=new Uint8Array(await result.data.arrayBuffer());
    if(!isWebp(bytes))return unavailable(503);
    // Importar Sharp solo para compatibilidad con medios todavía sin backfill.
    const output=legacy ? new Uint8Array(await (await import("./image-processing")).resizePublicPhoto(bytes,photo.width)) : bytes;
    return new Response(output,{headers:{...photoHeaders,"Content-Type":"image/webp"}});
  }catch{return unavailable(503);}
}
