// Metro config for the RN proof app.
//
// The app imports the shared layers straight from the repo (../../src/core, ../../src/react)
// and the fixtures (../../fixtures). No copying, symlinks or publishing.
//
// Every bare import (react, zod, ...) made from a file OUTSIDE this app is re-resolved as if
// it came from this app, so it always uses examples/rn/node_modules. That guarantees exactly
// one copy of React in the bundle, and means the repo root needs no node_modules at all.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '../..');
const sharedFolders = [path.join(repoRoot, 'src'), path.join(repoRoot, 'fixtures')];

const config = getDefaultConfig(projectRoot);

config.watchFolders = sharedFolders;

// Never pick anything up from the root package's node_modules.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SEP = '[\\\\/]'; // either path separator
const pathPattern = (p) => p.split(/[\\/]/).map(escapeRegex).join(SEP);
config.resolver.blockList = [new RegExp(`^${pathPattern(path.join(repoRoot, 'node_modules'))}${SEP}.*`)];
config.resolver.nodeModulesPaths = [path.join(projectRoot, 'node_modules')];

const isBare = (name) => !name.startsWith('.') && !path.isAbsolute(name);
const appEntry = path.join(projectRoot, 'index.ts');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromOutsideApp = !context.originModulePath.startsWith(projectRoot + path.sep);
  if (fromOutsideApp && isBare(moduleName)) {
    return context.resolveRequest({ ...context, originModulePath: appEntry }, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
