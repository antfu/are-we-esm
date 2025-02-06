import pm from 'picomatch'

export function constructPatternFilter(patterns: string[]): (str: string) => boolean {
  const matchers = patterns.map((glob) => {
    if (glob.match(/[\^$*{}]/)) {
      const { output } = pm.parse(glob)
      const re = pm.toRegex(output)
      return (str: string) => re.test(str)
    }
    else {
      return (str: string) => str === glob
    }
  })

  return (str: string) => matchers.some(matcher => matcher(str))
}
