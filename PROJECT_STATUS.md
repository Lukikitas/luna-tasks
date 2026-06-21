# Luna Tasks - Estado del proyecto

## Estado actual

Aplicación base implementada localmente. Falta conectar un proyecto real de Supabase, ejecutar pruebas funcionales con usuarios reales, crear el repositorio remoto y desplegar en Vercel.

## Funciones terminadas

- Proyecto Vite React en JavaScript.
- UI responsive con navegación lateral, mobile, modo claro/oscuro y estados vacíos.
- Autenticación Supabase: registro, login, logout y recuperación de contraseña.
- Espacios de trabajo y miembros.
- Invitaciones básicas por token/enlace.
- Tablero Kanban con `dnd-kit`.
- CRUD principal de tareas.
- Edición de estados personalizados.
- Comentarios, subtareas, etiquetas y responsables.
- Vistas: Kanban, lista, calendario, mis tareas, vencidas y finalizadas.
- Dashboard con métricas y próximos vencimientos.
- Notificaciones internas y actividad reciente.
- Realtime configurado en cliente.
- SQL con tablas, claves, índices, triggers y políticas RLS.
- `.env.example`, `.gitignore` y `vercel.json`.

## Funciones pendientes

- Crear proyecto Supabase real y ejecutar `supabase/schema.sql`.
- Cargar variables reales en `.env` local y en Vercel.
- Probar registro/login contra Supabase.
- Probar realtime con dos sesiones reales.
- Crear bucket privado para adjuntos si se habilita subida de archivos.
- Crear repositorio GitHub y push.
- Desplegar en Vercel.
- Agregar capturas si Lucas las quiere en el README.

## Decisiones técnicas

- JavaScript antes que TypeScript para facilitar mantenimiento.
- CSS propio para evitar dependencia pesada de UI.
- `dnd-kit` para drag and drop.
- Supabase Realtime por suscripciones a tablas del workspace.
- RLS basado en membresía de workspace mediante funciones `is_workspace_member` e `is_workspace_admin`.
- Las claves privadas no se usan ni se guardan en el frontend.

## Problemas conocidos

- El flujo de aceptar invitación por `?invite=` está preparado a nivel de datos, pero falta automatizar la aceptación en UI.
- Las notificaciones de vencimiento cercano requieren una tarea programada o Edge Function en una segunda etapa.
- Adjuntos están modelados en base de datos, pero la UI de subida queda pendiente hasta crear el bucket de Storage.

## Próximos pasos

1. Ejecutar lint y build local.
2. Crear/configurar Supabase.
3. Probar funciones reales con `.env`.
4. Inicializar Git y subir a GitHub.
5. Desplegar en Vercel y verificar PC/celular.
