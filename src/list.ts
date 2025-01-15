import type { DependencyHierarchy, PackageNode, RawPackageNode } from './types'
import { x } from 'tinyexec'
import { constructPatternFilter } from './utils'

export interface ListPackagesOptions {
  root: string
  depth: number
  exclude?: string[]
}

export interface ListPackagesResult {
  tree: DependencyHierarchy[]
  packages: PackageNode[]
}

async function getDependenciesTree(options: ListPackagesOptions): Promise<DependencyHierarchy[]> {
  const args = ['ls', '-r', '--json', '--no-optional', '--depth', String(options.depth)]
  const raw = await x('pnpm', args, { throwOnError: true, nodeOptions: { cwd: options.root } })
  const tree = JSON.parse(raw.stdout) as DependencyHierarchy[]
  return tree
}

export async function listPackages(
  options: ListPackagesOptions,
): Promise<ListPackagesResult> {
  const tree = await getDependenciesTree(options)
  const specs = new Map<string, PackageNode>()

  const excludeFilter = constructPatternFilter(options.exclude || [])

  const map = new WeakMap<RawPackageNode, PackageNode>()
  function normalize(raw: RawPackageNode): PackageNode {
    let node = map.get(raw)
    if (node)
      return node
    node = {
      spec: `${raw.from}@${raw.version}`,
      name: raw.from,
      version: raw.version,
      path: raw.path,
      dependencies: new Set(),
      dependents: new Set(),
      flatDependents: new Set(),
      flatDependencies: new Set(),
      nested: new Set(),
      dev: false,
      prod: false,
      optional: false,
    }
    map.set(raw, node)
    return node
  }

  function traverse(
    _node: RawPackageNode,
    level: number,
    mode: 'dev' | 'prod' | 'optional',
    directImporter: string | undefined,
    nestedImporter: string[],
  ): void {
    if (_node.from.startsWith('@types'))
      return
    if (excludeFilter(_node.from))
      return
    const node = normalize(_node)

    if (directImporter)
      node.dependents.add(directImporter)
    for (const im of nestedImporter)
      node.flatDependents.add(im)
    node.nested.add(level)
    if (mode === 'dev')
      node.dev = true
    if (mode === 'prod')
      node.prod = true
    if (mode === 'optional')
      node.optional = true

    if (specs.has(node.spec))
      return
    specs.set(node.spec, node)
    for (const dep of Object.values(_node.dependencies || {})) {
      traverse(dep, level + 1, mode, node.spec, [...nestedImporter, node.spec])
    }
  }

  for (const pkg of tree) {
    for (const dep of Object.values(pkg.dependencies || {})) {
      traverse(dep, 1, 'prod', undefined, [])
    }
    for (const dep of Object.values(pkg.devDependencies || {})) {
      traverse(dep, 1, 'dev', undefined, [])
    }
  }

  const packages = [...specs.values()].sort((a, b) => a.spec.localeCompare(b.spec))

  for (const pkg of packages) {
    for (const dep of pkg.flatDependents) {
      const node = specs.get(dep)
      if (node)
        node.flatDependencies.add(pkg.spec)
    }
  }

  return {
    tree,
    packages,
  }
}
