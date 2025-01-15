import type { PackageType } from './analyze'
import process from 'node:process'
import { cac } from 'cac'
import pc from 'picocolors'
import pm from 'picomatch'
import { listPackages } from './list'
import { analyzePackage } from './run'

const cli = cac('are-we-esm')

const colorMap: Record<PackageType, (str: string) => string> = {
  esm: pc.green,
  dual: pc.cyan,
  faux: pc.magenta,
  cjs: pc.yellow,
}

const descriptions: Record<PackageType, string> = {
  esm: 'ESM-only',
  dual: 'Dual ESM/CJS',
  faux: 'Faux ESM',
  cjs: 'CJS-only',
}

const types = ['esm', 'dual', 'faux', 'cjs'] as PackageType[]

function c(type: PackageType, str: string, bold = false): string {
  let colored = colorMap[type](str)
  if (bold)
    colored = pc.bold(colored)
  return colored
}

cli
  .command('[...globs]')
  .option('--root <root>', 'Root directory to start from', { default: process.cwd() })
  .option('--depth <depth>', 'Depth of the dependencies tree', { default: 10 })
  .action(async (globs: string[], options) => {
    const {
      packages,
    } = await listPackages({
      root: options.root,
      depth: options.depth,
    })

    let filtered = packages
    if (globs.length) {
      const regex = globs.map(glob => pm.toRegex(glob))
      filtered = filtered.filter(l => regex.some(re => re.test(l.from)))
    }

    // TODO: progress bar
    // TODO: cache to disk
    const resolved = await Promise.all(filtered.map(async pkg => await analyzePackage(pkg)))

    const count: Record<PackageType, number> = {
      esm: 0,
      dual: 0,
      faux: 0,
      cjs: 0,
    }
    for (const type of types) {
      const filtered = resolved.filter(x => x.type === type)
      if (filtered.length) {
        console.log()
        console.log(pc.inverse(c(type, ` ${type.toUpperCase()} `, true)), c(type, `${filtered.length} packages:`))
        console.log()
        console.log(filtered.map(x => `  ${c(type, x.from)}${pc.dim(`@${x.version}`)}`).join('\n'))
      }
      count[type] = filtered.length
    }

    const esmRatio = (count.dual + count.esm) / resolved.length
    const summary = [
      '',
      `${pc.blue(pc.bold(String(resolved.length).padStart(8, ' ')))} total packages checked`,
      '',
    ]

    for (const type of types) {
      if (count[type])
        summary.push(`${c(type, String(count[type]).padStart(8, ' '))} packages are ${c(type, descriptions[type])}`)
    }

    summary.push(
      '',
      `${pc.green(pc.bold(`${(esmRatio * 100).toFixed(1)}%`.padStart(8, ' ')))} ESM ready`,
      '',
    )

    if (count.cjs || count.faux) {
      summary.push(
        `   Run ${pc.cyan('pnpm why <package>@<version>')} to find out why you have a package`,
        '',
      )
    }

    console.log(summary.join('\n'))
  })

cli.help()
cli.parse()
