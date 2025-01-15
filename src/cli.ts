import type { PackageType } from './analyze'
import type { ResolvedPackageNode } from './types'
import process from 'node:process'
import boxen from 'boxen'
import { cac } from 'cac'
import { Presets, SingleBar } from 'cli-progress'
import pc from 'picocolors'
import { version } from '../package.json'
import { listPackages } from './list'
import { analyzePackage } from './run'
import { constructPatternFilter } from './utils'

const cli = cac('are-we-esm')

const colorMap: Record<PackageType, (str: string) => string> = {
  esm: pc.green,
  dual: pc.cyan,
  faux: pc.magenta,
  cjs: pc.yellow,
}

const types = ['esm', 'dual', 'faux', 'cjs'] as PackageType[]
const nonEsmTypes = ['faux', 'cjs'] as PackageType[]

function c(type: PackageType, str: string, bold = false): string {
  let colored = colorMap[type](str)
  if (bold)
    colored = pc.bold(colored)
  return colored
}

cli
  .command('[...globs]')
  .option('--root <root>', 'Root directory to start from', { default: process.cwd() })
  .option('--depth <depth>', 'Depth of the dependencies tree', { default: 25 })
  .option('--exclude <exclude...>', 'Packages to exclude')
  .option('-P,--prod', 'List only production dependencies', { default: false })
  .option('-D,--dev', 'List only development dependencies', { default: false })
  .option('-a,--all', 'List all packages', { default: false })
  .option('-l,--list', 'Show in a flat list instead of a tree', { default: false })
  .option('-b,--binary', 'Simpiled the module type to CJS and ESM', { default: false })
  .action(async (globs: string[], options) => {
    const {
      packages,
    } = await listPackages({
      root: options.root,
      depth: options.depth,
      exclude: parseCliArray(options.exclude),
    })

    let filtered = packages
    if (options.prod && options.dev) {
      throw new Error('Cannot specify both --prod and --dev')
    }
    if (options.prod) {
      filtered = filtered.filter(x => x.prod && !x.dev)
    }
    if (options.dev) {
      filtered = filtered.filter(x => x.dev && !x.prod)
    }
    if (globs.length) {
      const filter = constructPatternFilter(globs)
      filtered = filtered.filter(x => filter(x.name))
    }

    const bar = new SingleBar({
      clearOnComplete: true,
      hideCursor: true,
      format: `{bar} {value}/{total} ${pc.gray('{name}')}`,
      linewrap: false,
      barsize: 40,
    }, Presets.shades_grey)

    bar.start(filtered.length, 0, { name: 'packages' })

    // TODO: cache to disk
    const resolved = await Promise.all(filtered.map(async (pkg) => {
      const result = await analyzePackage(pkg)
      if (options.binary) {
        if (result.type === 'dual') {
          result.type = 'esm'
        }
        if (result.type === 'faux') {
          result.type = 'cjs'
        }
      }
      bar.increment(1, { name: result.spec })
      return result
    }))

    bar.stop()

    const descriptions: Record<PackageType, string> = {
      esm: options.binary ? 'ESM' : 'ESM-only',
      dual: 'Dual ESM/CJS',
      faux: 'Faux ESM',
      cjs: options.binary ? 'CJS' : 'CJS-only',
    }
    const count: Record<PackageType, number> = { esm: 0, dual: 0, faux: 0, cjs: 0 }
    for (const type of types) {
      const filtered = resolved.filter(x => x.type === type)
      if (options.list && filtered.length && (options.all || nonEsmTypes.includes(type))) {
        console.log()
        console.log(pc.inverse(c(type, ` ${type.toUpperCase()} `, true)), c(type, `${filtered.length} packages:`))
        console.log()
        console.log(filtered.map(x => `  ${c(type, x.name)}${pc.dim(`@${x.version}`)}`).join('\n'))
      }
      count[type] = filtered.length
    }

    if (!options.list) {
      const topLevelPackages = resolved.filter(x => x.flatDependents.size === 0)
      for (const pkg of topLevelPackages) {
        const type = pkg.type
        count[type]++
        const pkgCount = options.binary ? { esm: 0, cjs: 0 } : { esm: 0, dual: 0, faux: 0, cjs: 0 }
        const deps = Array.from(pkg.flatDependencies)
          .map(dep => resolved.find(x => x.spec === dep))
          .filter(Boolean) as ResolvedPackageNode[]

        pkgCount[pkg.type]++
        for (const dep of deps) {
          pkgCount[dep.type]++
        }
        const total = Object.values(pkgCount).reduce((acc, val) => acc + val, 0)
        if (!options.all && !pkgCount.cjs && !pkgCount.faux)
          continue

        let pkgCountString = ''
        if (total > 1) {
          pkgCountString = ' '.repeat(5) + Object.entries(pkgCount).map(([type, count]) => c(type as PackageType, String(count)).trim()).join(pc.gray(' | '))
        }
        console.log(`\n${c(type, pkg.name)}${pc.dim(`@${pkg.version}`)} ${pkgCountString}`)
        for (const dep of deps) {
          if (!options.all && !nonEsmTypes.includes(dep.type))
            continue
          console.log(` ${pc.dim('|')} ${c(dep.type, dep.name)}${pc.dim(`@${dep.version}`)}`)
        }
      }
    }

    if (!options.all) {
      console.log()
      console.log(pc.gray(
        `Listing non-ESM packages in flat tree, pass ${pc.cyan('--all --list')} to list all packages`,
      ))
    }

    if (count.cjs || count.faux) {
      console.log()
      console.log(boxen(
        `  Run ${pc.cyan('pnpm why <package>@<version>')} to find out why you have a package  `,
        {
          borderColor: 'gray',
          borderStyle: 'singleDouble',
          dimBorder: true,
        },
      ))
      console.log()
    }

    const esmRatio = (count.dual + count.esm) / resolved.length
    const summary = [
      '',
      `${pc.blue(pc.bold(String(resolved.length).padStart(8, ' ')))} total packages checked`,
      '',
    ]

    for (const type of types) {
      if (count[type])
        summary.push(`${c(type, String(count[type]).padStart(8, ' '), true)} packages are ${c(type, descriptions[type])}`)
    }

    summary.push(
      '',
      `${pc.green(pc.bold(`${(esmRatio * 100).toFixed(1)}%`.padStart(8, ' ')))} of packages are ESM-compatible`,
      '',
    )

    console.log(boxen(
      summary.join('\n'),
      {
        title: `${pc.inverse(pc.bold(' Are We ESM? '))} ${pc.dim(`v${version}`)}`,
        borderColor: 'gray',
        borderStyle: 'round',
        padding: {
          right: 3,
        },
      },
    ))
  })

cli.help()
cli.parse()

function parseCliArray(value?: string | string[]): string[] {
  const items = Array.isArray(value) ? value.join(',') : value || ''
  return items.split(',').map(i => i.trim()).filter(Boolean)
}
