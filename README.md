# Portfolio de Ian / NNytro

Sitio del portfolio personal con backend de Cloudflare Pages Functions para comisiones. El preview con servidor estático solo muestra la interfaz; para ejecutar el backend local, usá Wrangler.

## Desarrollo local de Functions

1. Instalar Node.js y un gestor de paquetes. En Windows puedes usar `pnpm install` o `npm install` (incluye Wrangler 4 local al proyecto).
2. Copiar `.dev.vars.example` como `.dev.vars` y configurar las credenciales de desarrollo. `.dev.vars` está excluido de Git.
3. Inicializar la base D1 local una vez: `npm run db:local:init`.
4. Ejecutar `npm run dev` para iniciar Wrangler en modo local, cargando `.dev.vars`, y abrir `http://localhost:8788`.

Pages crea D1 y R2 simulados en esta computadora. Google OAuth ya está configurado localmente; Discord y X requieren sus secretos locales o de Cloudflare. Resend puede enviar correos reales desde el entorno local si se crea un pedido; PayPal sigue apagado hasta configurar el sandbox y una URL HTTPS pública. Las nuevas cotizaciones son USD; Mercado Pago/Pix permanecen deshabilitados para USD hasta definir una conversión. En una base D1 existente, hacer un backup y aplicar las migraciones que falten en orden hasta `0008_manual_transfer_methods.sql`; una base nueva se inicializa solo con `schema.sql`. No desplegar `wrangler.jsonc` tal cual: contiene identificadores locales de ejemplo.

## Publicar

Al subir cambios a `main`, `.github/workflows/pages.yml` publica una versión estática en GitHub Pages. En **Settings → Pages**, la fuente debe ser **GitHub Actions**. GitHub Pages no ejecuta las Pages Functions de `functions/api`; por eso allí no funcionan el inicio de sesión, los pedidos, el chat, los recibos ni las publicaciones conectadas a D1/R2.

Para activar esos flujos, conecta este repositorio a Cloudflare Pages y configura las vinculaciones `DB` y `MEDIA_BUCKET`, además de los secretos de producción indicados en `functions/api/SETUP.md`. `wrangler.jsonc` usa identificadores locales de ejemplo y no se debe desplegar tal cual. Los secretos locales de `.dev.vars` están excluidos de Git.

Wrangler local permite probar las Functions con D1/R2 simulados, pero no valida por sí solo el acceso a proveedores externos en producción. PayPal y Mercado Pago/Pix siguen apagados; las transferencias requieren alias configurados y revisión manual del comprobante. El panel de demostración y los controles de `localStorage` no representan aprobaciones ni pagos reales.
