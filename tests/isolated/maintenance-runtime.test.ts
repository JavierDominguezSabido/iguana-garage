import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {ESLint} from "eslint";
import {expect,it} from "vitest";

// Node/Vite reales: no mock de server-only ni credenciales/consultas remotas.
const script=readFileSync("scripts/prepare-photo-variants.mjs","utf8");
const entry=[...script.matchAll(/ssrLoadModule\('([^']+)'\)/g)].at(-1)![1];
function loadModule(path:string,browser=false) {
  return execFileSync(process.execPath,["--conditions=react-server","--input-type=module","-e",`
    import {createServer} from 'vite';import {resolve} from 'node:path';
    const vite=await createServer({configFile:false,server:{middlewareMode:true,watch:null,hmr:false},resolve:{alias:{'@':resolve('src')}}});
    try{${browser?"globalThis.window={};":""}const mod=await vite.ssrLoadModule(${JSON.stringify(path)});console.log(JSON.stringify({listing:typeof mod.jobMedia,maintenance:typeof mod.prepareLegacyVariants}));}
    finally{await vite.close();}
  `],{encoding:"utf8",stdio:["ignore","pipe","pipe"]});
}
it("la entrada real de mantenimiento carga desde Node/Vite sin desactivar server-only",()=>{
  expect(JSON.parse(loadModule(entry).trim())).toEqual({listing:"function",maintenance:"function"});
});
it("la entrada de Next mantiene la protección server-only",()=>{
  expect(()=>loadModule("/src/features/jobs/data.ts")).toThrow(/Server Component/);
});
it("la lógica interna de mantenimiento rechaza un runtime de navegador",()=>{
  expect(()=>loadModule(entry,true)).toThrow(/Solo disponible en servidor/);
});
it("lint impide importar el módulo interno directamente desde la aplicación",async()=>{
  const [result]=await new ESLint().lintText('"use client"; import {jobMedia} from "@/features/jobs/server/media"; export {jobMedia};',{filePath:"src/features/jobs/client-boundary-fixture.tsx"});
  expect(result.messages.some(message=>message.ruleId==="no-restricted-imports")).toBe(true);
});
it.each([
  {name:"proyecto distinto",args:["--expected-project-ref=wrong-project"],env:{},message:"La URL no coincide"},
  {name:"apply sin guard",args:["--expected-project-ref=atibisongftmspwtyndv","--apply"],env:{IGUANA_VARIANTS_ALLOW_WRITE:""},message:"confirma IGUANA_VARIANTS_ALLOW_WRITE"},
  {name:"sin cuenta propietaria",args:["--expected-project-ref=atibisongftmspwtyndv"],env:{IGUANA_MAINTENANCE_PASSWORD:""},message:"Faltan credenciales locales"},
  {name:"clave privilegiada",args:["--expected-project-ref=atibisongftmspwtyndv"],env:{NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"sb_secret_placeholder"},message:"Mantenimiento incompleto"},
])("el CLI rechaza $name antes de autenticar o escribir",({args,env,message})=>{
  const processEnv={...process.env,NEXT_PUBLIC_SUPABASE_URL:"https://atibisongftmspwtyndv.supabase.co",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_fixture",IGUANA_MAINTENANCE_EMAIL:"fixture@example.invalid",IGUANA_MAINTENANCE_PASSWORD:"fixture",IGUANA_VARIANTS_ALLOW_WRITE:"atibisongftmspwtyndv",...env};
  try{execFileSync(process.execPath,["--conditions=react-server","scripts/prepare-photo-variants.mjs",...args],{encoding:"utf8",env:processEnv,stdio:["ignore","pipe","pipe"]});throw new Error("Guard no rechazó la ejecución");}
  catch(error){expect(error).toMatchObject({status:1});expect(String((error as {stderr:unknown}).stderr)).toContain(message);}
});
