// Dynamic Expo config for the Base44 dev environment.
//
// Expo's dev-server CORS middleware (CorsMiddleware) only permits same-origin,
// localhost, and the hosts listed in `exp.extra.router.origin` / `headOrigin`.
// The preview is served through an external hostname that changes whenever the
// environment is recreated, so we allowlist it dynamically from the
// BASE44_PUBLIC_HOST_SUFFIX env var injected by the platform.
const suffix = process.env.BASE44_PUBLIC_HOST_SUFFIX;

export default ({ config }) => {
  if (suffix) {
    const extra = config.extra || {};
    const router = extra.router || {};
    config.extra = {
      ...extra,
      router: {
        ...router,
        origin: `https://3000-${suffix}`,
      },
    };
  }
  return config;
};
