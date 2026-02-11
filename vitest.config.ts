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
      '@hexmon_tech/acccess-control-core': workspaceSrc('core'),
      '@hexmon_tech/acccess-control-policy-dsl': workspaceSrc('policy-dsl'),
      '@hexmon_tech/acccess-control-compiler': workspaceSrc('compiler'),
      '@hexmon_tech/acccess-control-engine-embedded': workspaceSrc('engine-embedded'),
      '@hexmon_tech/acccess-control-engine-rebac': workspaceSrc('engine-rebac'),
      '@hexmon_tech/acccess-control-engine-hybrid': workspaceSrc('engine-hybrid'),
      '@hexmon_tech/acccess-control-adapter-openfga': workspaceSrc('adapter-openfga'),
      '@hexmon_tech/acccess-control-audit': workspaceSrc('audit'),
      '@hexmon_tech/acccess-control-integrations-express': workspaceSrc('integrations-express'),
      '@hexmon_tech/acccess-control-integrations-next-node': workspaceSrc('integrations-next-node'),
      '@hexmon_tech/acccess-control-integrations-nest': workspaceSrc('integrations-nest'),
      '@hexmon_tech/acccess-control-cli': workspaceSrc('cli'),
    },
  },
});
