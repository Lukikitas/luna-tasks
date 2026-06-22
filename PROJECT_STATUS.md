# Luna Tasks - Estado del proyecto

## Estado actual

Aplicacion base implementada localmente, subida a GitHub, conectada a Supabase y desplegada en Vercel. La app compila, el lint pasa limpio, Supabase responde con el schema aplicado y la URL de produccion responde HTTP 200.

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

- Autenticar Supabase CLI con `SUPABASE_ACCESS_TOKEN` o login interactivo si se quiere administrar Supabase por CLI.
- Probar registro/login contra Supabase.
- Probar realtime con dos sesiones reales.
- Crear bucket privado para adjuntos si se habilita subida de archivos.
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
- Vercel CLI queda esperando login interactivo; el deploy se realizo desde Vercel web.
- Repositorio GitHub creado y remoto local conectado: `https://github.com/Lukikitas/luna-tasks`.
- Supabase configurado con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env` local; las tablas principales responden con anon key.
- Produccion: `https://luna-tasks.vercel.app`.
- Las notificaciones de vencimiento cercano requieren una tarea programada o Edge Function en una segunda etapa.
- Adjuntos estan modelados en base de datos, pero la UI de subida queda pendiente hasta crear el bucket de Storage.

## Proximos pasos

1. Agregar `https://luna-tasks.vercel.app` a Supabase Auth URL Configuration.
2. Probar registro/login contra Supabase.
3. Probar realtime con dos sesiones reales.
4. Verificar PC/celular con usuarios reales.
