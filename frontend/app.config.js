// Dynamic Expo config — extends app.json.
// Adds the Base44 preview origin to Expo's CORS allow-list so the dev server
// accepts source-map / HMR requests proxied through the external preview hostname.
// The suffix changes whenever the environment is recreated, so it must come from
// the environment, never hardcoded.
module.exports = ({ config }) => {
  const suffix = process.env.BASE44_PUBLIC_HOST_SUFFIX;
  if (suffix) {
    config.extra = config.extra || {};
    config.extra.router = config.extra.router || {};
    config.extra.router.origin = `https://3000-${suffix}`;
  }
  return config;
};
