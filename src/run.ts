import type { PackageNode, ResolvedPackageNode } from './types'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import { analyzePackageJson } from './analyze'
import { stripBomTag } from './utils'

export async function analyzePackage(pkg: PackageNode): Promise<ResolvedPackageNode> {
  const _pkg = pkg as unknown as ResolvedPackageNode
  if (_pkg.type)
    return _pkg
  const content = await fs.readFile(join(pkg.path, 'package.json'), 'utf-8')
  const json = JSON.parse(stripBomTag(content))
  _pkg.type = analyzePackageJson(json)
  return _pkg
}
