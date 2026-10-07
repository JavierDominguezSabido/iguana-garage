import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {createClient} from '@supabase/supabase-js';

// Herramienta de mantenimiento de desarrollo. Ejecutar con --conditions=react-server.
// Nunca se ejecuta por build/start ni acepta service_role. Dry-run por defecto.
let vite,client;
class MaintenanceError extends Error {}
try {
  for(const file of ['.env.local','.env.maintenance.local'])if(existsSync(file))process.loadEnvFile(file);
  const args=process.argv.slice(2);
  const expected=args.find(a=>a.startsWith('--expected-project-ref='))?.split('=')[1];
  if(!expected || args.some(a=>a!=='--apply'&&!a.startsWith('--expected-project-ref=')))throw new MaintenanceError('Indica --expected-project-ref=REFERENCIA; --apply es opcional.');
  vite=await createServer({configFile:false,server:{middlewareMode:true,watch:null,hmr:false},resolve:{alias:{'@':resolve('src')}}});
  const {getSupabaseConfig}=await vite.ssrLoadModule('/src/lib/supabase/config.ts');
  const {url,key}=getSupabaseConfig();
  if(new URL(url).hostname!==`${expected}.supabase.co`)throw new MaintenanceError('La URL no coincide con el proyecto confirmado.');
  const apply=args.includes('--apply');
  if(apply && process.env.IGUANA_VARIANTS_ALLOW_WRITE!==expected)throw new MaintenanceError('Para escribir confirma IGUANA_VARIANTS_ALLOW_WRITE en el entorno local.');
  const email=process.env.IGUANA_MAINTENANCE_EMAIL,password=process.env.IGUANA_MAINTENANCE_PASSWORD;
  if(!email||!password)throw new MaintenanceError('Faltan credenciales locales de mantenimiento. No compartirlas en chat/logs.');
  client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store',signal:AbortSignal.timeout(30000)})}});
  const login=await client.auth.signInWithPassword({email,password});
  if(login.error||!login.data.user||login.data.user.is_anonymous)throw new MaintenanceError('No se pudo validar la cuenta propietaria.');
  const owner=login.data.user.id;
  const {jobMedia,prepareLegacyVariants}=await vite.ssrLoadModule('/src/features/jobs/data.ts');
  let photos=0,variants=0;
  for(let offset=0;;offset+=100){
    const jobs=await client.from('jobs').select('id').eq('owner_id',owner).order('id').range(offset,offset+99);
    if(jobs.error)throw new MaintenanceError('No se pudo leer el inventario propietario.');
    for(const job of jobs.data)for(const media of await jobMedia(client,job.id)){
      variants+=(await prepareLegacyVariants(client,owner,job.id,media.id,apply)).length;photos++;
    }
    if(jobs.data.length<100)break;
  }
  console.log(JSON.stringify({mode:apply?'apply':'dry-run',photos,variants}));
} catch(error) {
  // No mostrar respuestas de Auth/Storage ni el entorno; solo mensajes propios.
  console.error(error instanceof MaintenanceError?error.message:'Mantenimiento incompleto. Revisar credenciales, migración y permisos antes de reintentar.');process.exitCode=1;
} finally {
  if(client)await client.auth.signOut({scope:'local'});
  await vite?.close();
}
