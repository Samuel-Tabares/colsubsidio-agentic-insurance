# Deploy manual a Vercel

`cerebro/` vive dentro del repo del equipo, no en un repo propio. Vercel
necesita saber que la raíz del proyecto es esta subcarpeta, no la raíz del
repo (ahí no hay `package.json`).

## 1. Conectar el repositorio

1. [vercel.com/new](https://vercel.com/new), **Import Git Repository**.
2. Seleccionar `Samuel-Tabares/colsubsidio-agentic-insurance`. Si no aparece,
   autorizar la GitHub App de Vercel sobre ese repo primero (Configure GitHub
   App Permissions).
3. En el paso de configuración, **Root Directory** → `cerebro`. Sin esto,
   Vercel intenta buildear desde la raíz del repo y falla porque ahí no hay
   `package.json`.
4. Framework Preset: se detecta solo como **Next.js**. No tocar Build Command
   ni Output Directory, son los defaults de Next.

## 2. Variables de entorno

Antes de darle a Deploy, o justo después en **Settings → Environment
Variables**, agregar estas tres (Production + Preview + Development, las tres
casillas marcadas):

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | `https://hkzxvmnnqcwkcksdihgh.supabase.co` |
| `SUPABASE_SECRET_KEY` | La secret key del proyecto Supabase (Settings → API Keys en el dashboard de Supabase) |
| `OPENAI_API_KEY` | La key de OpenAI del proyecto |

`CEREBRO_MODEL` es opcional (default `gpt-4o-mini`), solo agregarla si se
quiere forzar otro modelo.

## 3. Deploy

Con el Root Directory y las env vars ya puestas, **Deploy**. Toma ~30
segundos (es un build de Next.js chico, un solo endpoint).

## 4. Confirmar que funciona

Vercel asigna una URL de producción (`https://<algo>.vercel.app`). Probarla
con:

```bash
curl -X POST "https://<la-url-real>.vercel.app/api/decidir" \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "smoke-test",
    "canal": "web",
    "historial": [
      {"rol":"cliente","texto":"hola"},
      {"rol":"bot","texto":"necesito tu numero de serie"},
      {"rol":"cliente","texto":"259"}
    ]
  }'
```

Debe responder `200` con `{"mensajes":[{"tipo":"text","texto":"..."}]}`. Si
da `500`, revisar **Deployments → (el deploy) → Functions → Logs** en el
dashboard de Vercel, ahí sale el error real.

## 5. Activar en Vocero

Con la URL real confirmada, en el entorno donde corre `app/` (Coolify/compose
de Vocero, **no** en Vercel):

```
CEREBRO_MODE=external
CEREBRO_URL=https://<la-url-real>.vercel.app
```

## Actualizaciones futuras

Cada push a la rama conectada (normalmente `main`, o la que se elija al
conectar el proyecto) redeploya solo. Si el equipo prefiere que `cerebro/`
no redeploye en cada commit del monorepo (por ejemplo si cambia algo de
`app/` o `frontend/` sin tocar `cerebro/`), se puede acotar con un
[Ignored Build Step](https://vercel.com/docs/deployments/skip-a-deployment)
que solo buildee si hay cambios bajo `cerebro/`.
