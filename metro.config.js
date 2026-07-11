const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Bundle the Dayly companion 3D model as an asset
if (!config.resolver.assetExts.includes("glb")) {
  config.resolver.assetExts.push("glb");
}

// three/examples still exposes a few extensionless package export entries that
// Metro warns about. File-based resolution is the stable path for Expo here.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
