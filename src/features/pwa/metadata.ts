import type {Metadata,Viewport} from "next";

// Enlazado solo por /app, incluido /app/login. El layout raíz sigue sin manifest.
export const privateAppMetadata:Metadata={
  applicationName:"Iguana Garage",
  manifest:"/pwa/manifest.webmanifest",
  appleWebApp:{capable:true,title:"Iguana Garage",statusBarStyle:"black"},
  icons:{apple:{url:"/pwa/apple-touch-icon.png",sizes:"180x180",type:"image/png"}},
};
export const privateAppViewport:Viewport={themeColor:"#0E1110",colorScheme:"dark"};
