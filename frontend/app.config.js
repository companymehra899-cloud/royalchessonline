// Dynamic Expo config for the Base44 dev environment.
// The preview is served through a proxy hostname that changes whenever the
// environment is recreated. Expo's CorsMiddleware blocks JS fetches whose
// Origin doesn't match the (proxy-rewritten) Host header, so we register the
// live preview origin as an allowed CORS host via `extra.router.origin`.
export default ({ config }) => {
  const suffix = process.env.BASE44_PUBLIC_HOST_SUFFIX;
  if (suffix) {
    config.extra = {
      ...(config.extra || {}),
      router: {
        ...(config.extra?.router || {}),
        origin: `https://3000-${suffix}`,
      },
    };
  }
  return config;
};
