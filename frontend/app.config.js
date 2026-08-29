// Dynamic Expo config for the Base44 dev environment.
// Extends app.json with a router origin derived from an env var so that Expo's
// dev-server CORS middleware (CorsMiddleware) permits the external preview origin.
// `extra.router.origin` is read by @expo/cli and its host is added to the allowed
// CORS hosts list. The value is injected via docker-compose (EXPO_BASE44_PREVIEW_ORIGIN).
export default ({ config }) => {
  const origin = process.env.EXPO_BASE44_PREVIEW_ORIGIN;
  if (origin) {
    config.extra = {
      ...(config.extra || {}),
      router: {
        ...((config.extra && config.extra.router) || {}),
        origin,
      },
    };
  }
  return config;
};
