import type { ExtendedPackageNode, ResolvedPackageNode } from './types'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import { analyzePackageJson } from './analyze'

export async function analyzePackage(pkg: ExtendedPackageNode): Promise<ResolvedPackageNode> {
  const _pkg = pkg as unknown as ResolvedPackageNode
  if (_pkg.type)
    return _pkg
  const json = JSON.parse(await fs.readFile(join(pkg.path, 'package.json'), 'utf-8'))
  _pkg.type = analyzePackageJson(json)
  return _pkg
}
