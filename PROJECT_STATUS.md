# Luna Tasks - Estado del proyecto

## Estado actual

Aplicacion base implementada localmente. La app compila, el lint pasa limpio y el servidor local responde. La configuracion real de Supabase, GitHub remoto y Vercel esta bloqueada por autenticacion externa o token de acceso.

## Funciones terminadas

- Proyecto Vite React en JavaScript.
- UI responsive con navegacion lateral, mobile, modo claro/oscuro y estados vacios.
- Autenticacion Supabase: registro, login, logout y recuperacion de contrasena.
- Espacios de trabajo y miembros.
- Invitaciones basicas por token/enlace.
- Aceptacion de invitaciones desde `?invite=` mediante RPC segura.
- Tablero Kanban con `dnd-kit`.
- CRUD principal de tareas.
- Edicion de estados personalizados.
- Comentarios, subtareas, etiquetas y responsables.
- Vistas: Kanban, lista, calendario, mis tareas, vencidas y finalizadas.
- Dashboard con metricas y proximos vencimientos.
- Notificaciones internas y actividad reciente.
- Realtime configurado en cliente.
- SQL con tablas, claves, indices, triggers y politicas RLS.
- `.env.example`, `.gitignore` y `vercel.json`.

## Funciones pendientes

- Autenticar Supabase CLI con `SUPABASE_ACCESS_TOKEN` o login interactivo.
- Crear proyecto Supabase real y ejecutar `supabase/schema.sql`.
- Cargar variables reales en `.env` local y en Vercel.
- Probar registro/login contra Supabase.
- Probar realtime con dos sesiones reales.
- Crear bucket privado para adjuntos si se habilita subida de archivos.
- Crear repositorio GitHub y push.
- Desplegar en Vercel.
- Agregar capturas si Lucas las quiere en el README.

## Decisiones tecnicas

- JavaScript antes que TypeScript para facilitar mantenimiento.
- CSS propio para evitar dependencia pesada de UI.
- `dnd-kit` para drag and drop.
- Supabase Realtime por suscripciones a tablas del workspace.
- RLS basado en membresia de workspace mediante funciones `is_workspace_member` e `is_workspace_admin`.
- Las claves privadas no se usan ni se guardan en el frontend.

## Problemas conocidos

- Supabase CLI no permite login automatico en entorno no TTY: requiere `supabase login --token` o `SUPABASE_ACCESS_TOKEN`.
- Vercel CLI queda esperando login interactivo; requiere sesion o `VERCEL_TOKEN`.
- GitHub esta autenticado por conector como `Lukikitas`, pero no hay herramienta disponible para crear repositorios nuevos desde ese conector.
- Las notificaciones de vencimiento cercano requieren una tarea programada o Edge Function en una segunda etapa.
- Adjuntos estan modelados en base de datos, pero la UI de subida queda pendiente hasta crear el bucket de Storage.

## Proximos pasos

1. Completar autenticacion de Supabase, Vercel y GitHub CLI o tokens locales.
2. Crear/configurar Supabase.
3. Probar funciones reales con `.env`.
4. Crear remoto GitHub y subir.
5. Desplegar en Vercel y verificar PC/celular.
