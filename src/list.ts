import type { DependencyHierarchy, ExtendedPackageNode, RawPackageNode } from './types'
import { x } from 'tinyexec'
import { constructPatternFilter } from './utils'

export interface ListPackagesOptions {
  root: string
  depth: number
  exclude?: string[]
}

export interface ListPackagesResult {
  tree: DependencyHierarchy[]
  packages: ExtendedPackageNode[]
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
  const specs = new Map<string, ExtendedPackageNode>()

  const excludeFilter = constructPatternFilter(options.exclude || [])

  function traverse(_node: RawPackageNode, importers: string[]): void {
    if (_node.from.startsWith('@types'))
      return
    if (excludeFilter(_node.from))
      return
    const node = _node as ExtendedPackageNode
    node.spec ||= `${node.from}@${node.version}`
    node.flatDependents ||= new Set()
    node.flatDependencies ||= new Set()
    for (const im of importers)
      node.flatDependents.add(im)
    if (specs.has(node.spec))
      return
    specs.set(node.spec, node)
    for (const dep of Object.values(node.dependencies || {})) {
      traverse(dep, [...importers, node.spec])
    }
  }

  for (const pkg of tree) {
    for (const dep of Object.values(pkg.dependencies || {})) {
      traverse(dep, [])
    }
    for (const dep of Object.values(pkg.devDependencies || {})) {
      traverse(dep, [])
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
