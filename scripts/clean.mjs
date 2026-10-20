import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './kernel-source.mjs';

rmSync(join(root, 'dist'), { recursive: true, force: true });
