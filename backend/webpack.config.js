const nodeExternals = require('webpack-node-externals');

// @mysten-incubation/memwal is ESM-only (no "require" export condition).
// NestJS webpack externalises all node_modules by default, which causes
// ERR_PACKAGE_PATH_NOT_EXPORTED at runtime. Allowlisting it here forces
// webpack to inline + transpile it into the CJS bundle instead.
module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: ['@mysten-incubation/memwal'],
      }),
    ],
  };
};
