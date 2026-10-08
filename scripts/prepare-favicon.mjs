import sharp from "sharp";
import {writeFile} from "node:fs/promises";

// Conversión técnica estática: arte oficial completo, proporción y transparencia intactas.
// No se ejecuta durante build/start ni en peticiones. Sin nuevas dependencias.
const sizes=[16,32,48];
const images=await Promise.all(sizes.map(async size=>{
  const rgba=await sharp("assets/brand/iguana-garage-symbol.png")
    .resize(size,size,{fit:"contain",background:{r:0,g:0,b:0,alpha:0}}).ensureAlpha().raw().toBuffer();
  const maskStride=Math.ceil(size/32)*4;
  const bitmap=Buffer.alloc(40+size*size*4+maskStride*size);
  bitmap.writeUInt32LE(40,0);bitmap.writeInt32LE(size,4);bitmap.writeInt32LE(size*2,8);
  bitmap.writeUInt16LE(1,12);bitmap.writeUInt16LE(32,14);
  bitmap.writeUInt32LE(bitmap.length-40,20);
  // ICO clásico: píxeles BGRA de abajo arriba y máscara AND alineada a 32 bits.
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const source=(y*size+x)*4,target=40+((size-1-y)*size+x)*4;
    bitmap[target]=rgba[source+2];bitmap[target+1]=rgba[source+1];
    bitmap[target+2]=rgba[source];bitmap[target+3]=rgba[source+3];
    if(rgba[source+3]===0)bitmap[40+size*size*4+(size-1-y)*maskStride+(x>>3)]|=0x80>>(x%8);
  }
  return bitmap;
}));
const directory=Buffer.alloc(6+16*sizes.length);
directory.writeUInt16LE(1,2); // ICO
directory.writeUInt16LE(sizes.length,4);
let offset=directory.length;
for(let index=0;index<sizes.length;index++){
  const entry=6+16*index;
  directory[entry]=sizes[index];directory[entry+1]=sizes[index];
  directory.writeUInt16LE(1,entry+4);directory.writeUInt16LE(32,entry+6);
  directory.writeUInt32LE(images[index].length,entry+8);
  directory.writeUInt32LE(offset,entry+12);
  offset+=images[index].length;
}
await writeFile("src/app/favicon.ico",Buffer.concat([directory,...images]));
