import sharp from "sharp";
import {mkdir} from "node:fs/promises";

// Derivados técnicos estáticos. Nunca ejecutado por start/build ni por una visita.
// Escala el arte oficial completo, sin recortes, recoloración o nuevas formas.
const source="assets/brand/iguana-garage-symbol.png",directory="public/pwa";
await mkdir(directory,{recursive:true});
for(const [name,size,scale] of [
  ["icon-192",192,.84],["icon-512",512,.84],
  // El rectángulo completo cabe en el círculo central de diámetro 80%.
  ["icon-maskable-512",512,.55],["apple-touch-icon",180,.84],
]){
  const edge=Math.floor(size*scale);
  const {data,info}=await sharp(source).resize({width:edge,height:edge,fit:"inside"}).png().toBuffer({resolveWithObject:true});
  await sharp({create:{width:size,height:size,channels:4,background:"#0E1110"}})
    .composite([{input:data,left:Math.floor((size-info.width)/2),top:Math.floor((size-info.height)/2)}])
    .png().toFile(`${directory}/${name}.png`);
}
