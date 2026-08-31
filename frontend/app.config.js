// Dynamic Expo config extension.
// app.json remains the base config; this file only adds the dev-server allowed
// origin so Expo's CORS middleware accepts the Base44 preview hostname.
// The preview origin changes whenever the environment is recreated, so it is
// derived from BASE44_PUBLIC_HOST_SUFFIX (never hardcoded).

const previewSuffix = process.env.BASE44_PUBLIC_HOST_SUFFIX;
const previewOrigin = previewSuffix ? `https://3000-${previewSuffix}` : undefined;

export default ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    router: {
      ...((config.extra && config.extra.router) || {}),
      ...(previewOrigin ? { origin: previewOrigin, headOrigin: previewOrigin } : {}),
    },
  },
});
