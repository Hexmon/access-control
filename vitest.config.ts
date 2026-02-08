import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

function workspaceSrc(packageDir: string): string {
  return path.resolve(repoRoot, 'packages', packageDir, 'src', 'index.ts');
}

export default defineConfig({
  resolve: {
    alias: {
      '@hexmon_tech/core': workspaceSrc('core'),
      '@hexmon_tech/policy-dsl': workspaceSrc('policy-dsl'),
      '@hexmon_tech/compiler': workspaceSrc('compiler'),
      '@hexmon_tech/engine-embedded': workspaceSrc('engine-embedded'),
      '@hexmon_tech/engine-rebac': workspaceSrc('engine-rebac'),
      '@hexmon_tech/engine-hybrid': workspaceSrc('engine-hybrid'),
      '@hexmon_tech/adapter-openfga': workspaceSrc('adapter-openfga'),
      '@hexmon_tech/audit': workspaceSrc('audit'),
      '@hexmon_tech/integrations-express': workspaceSrc('integrations-express'),
      '@hexmon_tech/integrations-next-node': workspaceSrc('integrations-next-node'),
      '@hexmon_tech/integrations-nest': workspaceSrc('integrations-nest'),
      '@hexmon_tech/cli': workspaceSrc('cli'),
    },
  },
});
