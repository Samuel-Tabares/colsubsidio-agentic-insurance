# `frontend/` — Referencias de diseño (Lovable)

Estas carpetas son **referencia de diseño exacta** hecha en Lovable/Claude Design
por Sarah. **No se compilan ni se despliegan**: el código real y funcional vive en
[`../app/`](../app) (fork de Vocero CRM, Next.js). Cada superficie de `app/` se
construyó portando estas vistas sobre el backend real.

| Carpeta | Qué es | Portado a `app/` como |
|---|---|---|
| [`web-chat/`](./web-chat) | El chat web del afiliado (Asegura). | `app/src/components/surface-asegura.tsx` + `app/src/hooks/use-asegura-channel.ts` → ruta `/chat` |
| [`manager-view/`](./manager-view) | El panel gerencial interno (CRM de clientes + registros de chats). | Sección `/dashboard`, `/contacts` (tabla + detalle) y el restyle de `/inbox` → `app/src/components/{dashboard,admin,contacts,inbox}/` |

Si Sarah ajusta una vista aquí, se replica el cambio a mano en `app/` — estas
carpetas son la fuente de verdad **visual**, no el runtime.
