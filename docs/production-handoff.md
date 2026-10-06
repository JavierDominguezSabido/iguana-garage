# Iguana Garage V1 — entrega a Robin y Javier

La web todavía no tiene una dirección de producción. Javier completará la activación que se describe en el informe de preproducción. El número real de WhatsApp y la cuenta definitiva de Robin están pendientes; no se han inventado datos de contacto ni creado usuarios reales.

## Entrar y guardar el primer trabajo

1. Abrir la dirección definitiva seguida de `/login`. Usar la cuenta personal que Javier habrá creado para Robin. Guardar una contraseña larga, única y generada con un gestor; no compartirla por chat ni reutilizar una cuenta de pruebas.
2. Pulsar **Nuevo trabajo**. Escribir el nombre del vehículo o trabajo y su fecha real. El código de pintura es opcional y privado.
3. Pulsar **Añadir fotografías** y elegir una o varias fotos del teléfono. Se admiten JPEG/JPG, PNG y WebP, hasta 10 MiB por foto y 40 millones de píxeles. HEIC/HEIF no está admitido: guardar/exportar como JPEG si el teléfono usa ese formato.
4. Revisar las miniaturas. Una foto puede quitarse antes de guardar. Dejar **Publicar en portfolio** desmarcado para guardar el trabajo como privado.
5. Pulsar **Guardar trabajo** y esperar al detalle. Un aviso de subida incompleta significa que hay que conservar el formulario y reintentar; no dar por terminada una operación que presenta error.

## Publicar, retirar, editar y borrar

- **Publicar:** abrir el trabajo, pulsar **Editar trabajo**, activar **Publicar en portfolio** y guardar. Revisar antes todas sus fotos: matrículas, personas, papeles y cualquier dato visible quedarán visibles en las fotografías publicadas. La app no los borra ni los difumina automáticamente.
- **Retirar:** editar, desmarcar la publicación y guardar. Desaparece de la lista pública y se deniegan nuevas descargas del derivado en su misma URL. Una persona que ya descargó o vio la foto puede conservar su copia.
- **Editar:** cambiar nombre, fecha, código o fotografías y guardar. Esperar la confirmación; una edición con subida incompleta se conserva como privada para poder reintentar.
- **Borrar:** pulsar **Eliminar trabajo** y confirmar. Se eliminan también las fotografías asociadas. Es definitivo: usar **Cancelar** si hay dudas. Ante un fallo, reintentar y comprobar el resultado; no borrar manualmente objetos sueltos en Supabase.
- **Salir:** pulsar **Cerrar sesión**, especialmente en un dispositivo compartido.

## Qué puede ver el público

En `/`, solo trabajos publicados: nombre, fecha y sus fotos preparadas para la web. No se ofrece el acceso al panel en la navegación pública. El código de pintura, propietario, rutas de originales y datos de la cuenta no forman parte del contrato público. Los originales permanecen privados y las fotografías publicadas se sirven como derivados sin metadatos EXIF. La privacidad no elimina información fotografiada dentro de la propia imagen.

Si aún no hay publicaciones, aparece “Estamos preparando las fotografías de nuestros trabajos”. El contacto indica que está pendiente hasta configurar el WhatsApp verdadero. No se cargan trabajos de demostración automáticamente.

## Fotos sin complicaciones

Hacer varias fotos enfocadas y con luz suficiente. Verticales y horizontales funcionan; las dimensiones distintas no son un problema. La app conserva la proporción y adapta las fotos: no hace falta redimensionar manualmente las que cumplen los límites. Las miniaturas pueden recortar una parte para componer la página; al ampliar se ve la foto completa. Usar el original de cámara en vez de una captura de pantalla cuando esté disponible. No subir imágenes totalmente oscuras y revisar siempre qué información personal aparece antes de publicar.

## Prueba en teléfono real: 2–5 minutos por dispositivo

Realizarla después del deployment, con una cuenta real y un primer trabajo real autorizado. No crear demo permanente en producción.

- [ ] Android con Chrome: abrir la home, desplazarse hasta contacto y pie, comprobar WhatsApp y volver arriba.
- [ ] Entrar al panel; escribir con teclado abierto y comprobar que ningún campo/botón queda inaccesible o causa zoom inesperado.
- [ ] Crear el trabajo, seleccionar foto de cámara/galería, guardar y ampliar. Probar una vertical y una horizontal si están disponibles.
- [ ] Publicar; abrir la home en una pestaña privada y comprobar la galería. Retirar y comprobar que ya no aparece; volver a publicar si procede.
- [ ] Editar y cerrar sesión; abrir `/app` directamente y comprobar que pide acceso.
- [ ] Repetir en iPhone/Safari si se dispone de él; comprobar teclado, selector nativo, botón de cierre del modal y orientación del teléfono. Usar JPEG si la cámara guarda HEIC.

La emulación Chrome a 390/768/1440 px y el QA automático no sustituyen estas comprobaciones físicas. No se ha probado un Android físico ni Safari/iPhone desde este entorno.

## Respaldo y recuperación básica

El proyecto usa Supabase Free. No se cuenta con backups diarios restaurables como los planes de pago; Supabase recomienda exportar periódicamente la base de datos y guardar la copia fuera del proyecto. Los backups de base de datos no incluyen los archivos de Storage. Javier debe conservar también las fotos originales y acordar una exportación razonable de los datos cuando empiece el uso real. No se ha construido un sistema de backup propio. [Documentación de Supabase](https://supabase.com/docs/guides/platform/backups).

Antes de borrar un trabajo, conservar fuera de la app lo que haga falta. Borrar el trabajo elimina sus fotos; restaurar solo metadatos de la base de datos no recupera archivos eliminados. Para recuperar, Javier debe usar una copia conocida y comprobar datos y fotografías juntos; no hacer un restore sobre producción sin valorar qué cambios posteriores se perderían.

## Checklist de activación y entrega

- [ ] WhatsApp definitivo confirmado y configurado en el host.
- [ ] Usuario real Robin creado manualmente en Supabase Auth, con email confirmado y contraseña segura y única.
- [ ] Login/logout con Robin comprobado. Borrar o deshabilitar los dos usuarios de pruebas después de terminar QA y validar el acceso real.
- [ ] URL de producción HTTPS existente y smoke realizado, incluida una foto próxima al límite admitido.
- [ ] Supabase **Site URL** actualizado a esa URL; **Redirect URLs** revisadas para permitir solo destinos realmente usados, sin comodines amplios.
- [ ] Registro público y usuarios anónimos siguen deshabilitados; JWT expiry sigue en 3600 segundos.
- [ ] Android real probado; iPhone/Safari probado si está disponible.
- [ ] Primer trabajo real creado, publicado, revisado en portfolio, retirado y vuelto a publicar cuando proceda.
- [ ] Respaldo y recuperación básica entendidos; originales importantes conservados fuera de la app.

Las dos cuentas temporales siguen confirmadas para las verificaciones de desarrollo. No se eliminaron ni se transformaron en la cuenta de Robin. Sus credenciales no están en estos documentos ni en Git.
