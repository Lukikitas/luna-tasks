# Luna Tasks

Dashboard colaborativo de tareas construido con Vite, React, JavaScript y Supabase.

## Tecnologías

- Vite + React
- JavaScript
- Supabase Auth, Database y Realtime
- dnd-kit para Kanban drag and drop
- React Router preparado por dependencias
- Lucide React para iconos
- Vercel para despliegue

## Funciones

- Registro, login, logout y recuperación de contraseña.
- Perfil básico con nombre visible y avatar opcional desde la tabla `profiles`.
- Espacios de trabajo con miembros e invitaciones por enlace/código.
- Tareas con título, descripción, estado, prioridad, responsable, creador, vencimiento, etiquetas, comentarios, subtareas, actividad y notificaciones.
- Estados base y estados personalizados editables.
- Vista Kanban, lista, calendario, mis tareas, vencidas y finalizadas.
- Búsqueda y filtros por texto, estado, responsable, prioridad, etiqueta, creador, vencidas y sin asignar.
- Dashboard con métricas operativas y próximos vencimientos.
- Modo claro, oscuro y automático.
- Sincronización en tiempo real con Supabase Realtime.
- RLS activo para aislar espacios de trabajo.

## Instalación local

```powershell
cd G:\Luna\luna-tasks
npm.cmd install
npm.cmd run dev
```

## Configuración de Supabase

1. Crear un proyecto en Supabase.
2. Abrir SQL Editor.
3. Ejecutar `supabase/schema.sql`.
4. Ir a Authentication y configurar Site URL:

```text
http://localhost:5173
```

5. Agregar también la URL de producción cuando exista.
6. Copiar la Project URL y anon public key al archivo `.env`.

## Variables de entorno

Crear `.env` local usando `.env.example` como guía:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

No usar `service_role_key` en el frontend.

## Scripts

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run preview
npm.cmd run lint
```

## Estructura

```text
src/
  hooks/
  lib/
  App.jsx
  index.css
supabase/
  schema.sql
```

## Despliegue

El proyecto está listo para Vercel:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Producción: https://luna-tasks.vercel.app

`vercel.json` incluye rewrite a `/` para que la app funcione al recargar rutas.

## Próximas mejoras

- Adjuntos usando Supabase Storage con bucket privado.
- Invitaciones aceptadas automáticamente desde `?invite=`.
- Notificaciones por email mediante Edge Functions.
- Exportación CSV de tareas.
- Pruebas E2E automatizadas con Playwright.
