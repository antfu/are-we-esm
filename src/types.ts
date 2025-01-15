import type { PackageDependencyHierarchy } from '@pnpm/list'
import type { ProjectManifest } from '@pnpm/types'
import type { PackageType } from './analyze'

export type RawPackageNode = Pick<ProjectManifest, 'description' | 'license' | 'author' | 'homepage'> & {
  alias: string | undefined
  version: string
  path: string
  resolved?: string
  from: string
  repository?: string
  dependencies?: Record<string, RawPackageNode>
}

export type DependencyHierarchy = Pick<PackageDependencyHierarchy, 'name' | 'version' | 'path'> &
  Required<Pick<PackageDependencyHierarchy, 'private'>> &
  {
    dependencies?: Record<string, RawPackageNode>
    devDependencies?: Record<string, RawPackageNode>
    optionalDependencies?: Record<string, RawPackageNode>
    unsavedDependencies?: Record<string, RawPackageNode>
  }

export interface PackageNode {
  spec: string
  name: string
  version: string
  path: string
  dependencies: Set<string>
  dependents: Set<string>
  flatDependents: Set<string>
  flatDependencies: Set<string>
  nested: Set<number>
  dev: boolean
  prod: boolean
  optional: boolean
}

export interface ResolvedPackageNode extends PackageNode {
  type: PackageType
}
