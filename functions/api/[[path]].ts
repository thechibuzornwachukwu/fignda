// Same-origin API: fignda.pages.dev/api/* is handed to the fignda-api Worker over a service binding.
// No CORS round trip, no second domain. The Worker still checks the Origin header itself.

type Env = { API: { fetch(req: Request): Promise<Response> } };

export const onRequest = (ctx: { request: Request; env: Env }) => ctx.env.API.fetch(ctx.request);
