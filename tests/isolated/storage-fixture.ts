import {createServer} from "node:http";
import {createClient} from "@supabase/supabase-js";
import type {Database} from "@/lib/supabase/database.types";
import {asRole,isolatedDatabase} from "./database";

// Adaptador de transporte SOLO de pruebas. SQL/RLS son reales; no simula GoTrue
// ni demuestra la plataforma HTTP Storage. Nunca admite una URL o .env externa.
export async function storageFixture({port=0}:{port?:number}={}) {
  const db=await isolatedDatabase();
  const files=new Map<string,{bytes:Buffer;type:string}>();
  const faults: {operation:string;path:string;afterWrite?:boolean}[]=[];
  const calls:{operation:string;path:string;bytes?:number}[]=[];
  const server=createServer(async(req,res)=>{
    const reply=(status:number,data:unknown)=>{res.writeHead(status,{"content-type":"application/json"});res.end(JSON.stringify(data));};
    try {
      const url=new URL(req.url!,"http://localhost");
      if(url.pathname==="/__audit"){return reply(200,calls);}
      if(url.pathname==="/__reset"){calls.length=0;return reply(200,{});}
      const token=req.headers.authorization?.replace("Bearer ","");
      const uid=token && /^[0-9a-f-]{36}$/.test(token)?token:null;
      const role=uid?"authenticated":"anon";
      const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const body=Buffer.concat(chunks);
      if(url.pathname.startsWith("/storage/v1/object/")){
        const parts=url.pathname.slice("/storage/v1/object/".length).split("/").map(decodeURIComponent);
        let operation="",bucket="",path="";
        if(parts[0]==="list"){operation="list";bucket=parts[1];}
        else if(parts[0]==="authenticated"){operation="download";bucket=parts[1];path=parts.slice(2).join("/");}
        else {operation=req.method==="GET"?"download":req.method==="DELETE"?"remove":"upload";bucket=parts[0];path=parts.slice(1).join("/");}
        const call:{operation:string;path:string;bytes?:number}={operation,path};calls.push(call);
        const fault=faults.findIndex(f=>f.operation===operation&&f.path===path);
        if(fault>=0&&!faults[fault].afterWrite){faults.splice(fault,1);return reply(503,{message:"Fallo controlado",statusCode:"503"});}
        if(operation==="list"){
          const input=JSON.parse(body.toString());
          const rows=await asRole<{name:string}>(db,role,uid,"object.list","select name from storage.objects where bucket_id=$1",[bucket]);
          const entries=new Map();const prefix=input.prefix?`${input.prefix}/`:"";
          for(const {name} of rows.rows){if(!name.startsWith(prefix))continue;const tail=name.slice(prefix.length);const entry=tail.split("/")[0];if(!input.search||entry.includes(input.search))entries.set(entry,{name:entry,id:tail.includes("/")?null:name,metadata:{}});}
          return reply(200,[...entries.values()].slice(0,input.limit??100));
        }
        if(operation==="download"){
          const rows=await asRole(db,role,uid,"object.get_authenticated","select name from storage.objects where bucket_id=$1 and name=$2",[bucket,path]);
          const file=files.get(`${bucket}/${path}`);if(!rows.rows.length||!file)return reply(404,{message:"Object not found",statusCode:"404"});
          call.bytes=file.bytes.length;res.writeHead(200,{"content-type":file.type,"cache-control":"private, no-store"});return res.end(file.bytes);
        }
        if(operation==="upload"){
          await asRole(db,role,uid,"object.upload","insert into storage.objects(bucket_id,name) values ($1,$2)",[bucket,path]);
          files.set(`${bucket}/${path}`,{bytes:body,type:String(req.headers["content-type"]??"application/octet-stream")});
          if(fault>=0){faults.splice(fault,1);return reply(503,{message:"ACK perdido",statusCode:"503"});}
          return reply(200,{Key:`${bucket}/${path}`,Id:path});
        }
        const {prefixes}=JSON.parse(body.toString());
        for(const name of prefixes){const rows=await asRole(db,role,uid,"object.delete","delete from storage.objects where bucket_id=$1 and name=$2 returning name",[bucket,name]);if(rows.rows.length)files.delete(`${bucket}/${name}`);}
        return reply(200,prefixes.map((name:string)=>({name})));
      }
      if(url.pathname==="/rest/v1/rpc/list_public_jobs"){
        const input=JSON.parse(body.toString()||"{}");
        const result=await asRole<Record<string,unknown>>(db,role,uid,"","select * from public.list_public_jobs($1,$2)",[input.p_limit??50,input.p_offset??0]);
        return reply(200,result.rows.map(row=>({...row,job_date:row.job_date instanceof Date?row.job_date.toISOString().slice(0,10):row.job_date})));
      }
      const table=url.pathname.slice("/rest/v1/".length);
      if(!["jobs","job_media"].includes(table))return reply(404,{});
      const allowed=["id","owner_id","job_id","name","job_date","paint_code","work_hours","description","is_public","position","storage_path","mime_type","width","height","byte_size","focal_x","focal_y"];
      const filters:string[]=[];const values:unknown[]=[];
      for(const [key,value] of url.searchParams){if(allowed.includes(key)&&value.startsWith("eq.")){values.push(value.slice(3));filters.push(`${key}=$${values.length}`);}}
      const where=filters.length?` where ${filters.join(" and ")}`:"";
      let sql="";
      if(req.method==="GET"){
        const selected=url.searchParams.get("select")??"*";
        const columns=selected==="*"?"*":selected.split(",").filter(c=>allowed.includes(c)).join(",");
        sql=`select ${columns} from public.${table}${where}`;
        const order=url.searchParams.get("order")?.split(".");if(order&&allowed.includes(order[0]))sql+=` order by ${order[0]} ${order[1]==="desc"?"desc":"asc"}`;
        const limit=Number(url.searchParams.get("limit")??100),offset=Number(url.searchParams.get("offset")??0);sql+=` limit ${Math.max(0,limit)} offset ${Math.max(0,offset)}`;
      }else if(req.method==="POST"){
        const input=JSON.parse(body.toString());const keys=Object.keys(input).filter(k=>allowed.includes(k));
        const fault=faults.findIndex(f=>f.operation===`insert-${table}`&&f.path===input.id);
        if(fault>=0&&!faults[fault].afterWrite){faults.splice(fault,1);return reply(503,{message:"Metadata interrumpida",code:"LOCAL_FIXTURE"});}
        values.length=0;values.push(...keys.map(k=>input[k]));sql=`insert into public.${table}(${keys.join(",")}) values (${keys.map((_,i)=>`$${i+1}`).join(",")}) returning *`;
        if(fault>=0){await asRole(db,role,uid,"",sql,values);faults.splice(fault,1);return reply(503,{message:"ACK metadata perdido",code:"LOCAL_FIXTURE"});}
      }else if(req.method==="PATCH"){
        const input=JSON.parse(body.toString());const keys=Object.keys(input).filter(k=>allowed.includes(k));
        const assignments=keys.map(k=>{values.push(input[k]);return `${k}=$${values.length}`});sql=`update public.${table} set ${assignments.join(",")}${where} returning *`;
      }else sql=`delete from public.${table}${where} returning *`;
      const rows=(await asRole<Record<string,unknown>>(db,role,uid,"",sql,values)).rows;
      // PostgREST entrega DATE sin hora; PGlite usa Date en su parser por defecto.
      for(const row of rows)if(row.job_date instanceof Date)row.job_date=row.job_date.toISOString().slice(0,10);
      return reply(200,req.headers.accept?.includes("vnd.pgrst.object")?(rows[0]??null):rows);
    }catch(e){const code=(e as {code?:string}).code;reply(code==="42501"?403:500,{message:"Fallo de fixture SQL",code});}
  });
  await new Promise<void>(resolve=>server.listen(port,"127.0.0.1",resolve));
  const address=server.address();if(!address||typeof address==="string")throw new Error("Fixture local no disponible");
  const url=`http://127.0.0.1:${address.port}`;
  return {db,files,faults,calls,url,
    client:(uid:string|null)=>createClient<Database>(url,"sb_publishable_isolated",{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${uid??"anon"}`}}}),
    close:async()=>{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await db.close();},
  };
}
