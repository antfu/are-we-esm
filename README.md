# are-we-esm

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

CLI to check your project's ESM support status

![Screenshot](https://github.com/user-attachments/assets/70b1c516-e20b-469f-aae7-fb5c6fd1d525)

## Usage

```bash
pnpx are-we-esm
```

> [!NOTE]
> Only works with **pnpm** projects

## TODOs

- [x] Add progress bar
- [ ] Cache the result to disk
- [ ] Improve `--prod` flag by traversing the tree
- [x] Support exclude list
- [ ] Summary how top-level packages are contribute to ESM support
- [ ] Web UI

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg'/>
  </a>
</p>

## Credits

Thanks to the following projects and their authors for inspiration:

- The ESM/CJS detection logic is modified from [this project](https://github.com/wooorm/npm-esm-vs-cjs/blob/main/script/crawl.js) by [@wooorm](https://github.com/wooorm).

## License

[MIT](./LICENSE) License © 2025-PRESENT [Anthony Fu](https://github.com/antfu)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/are-we-esm?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/are-we-esm
[npm-downloads-src]: https://img.shields.io/npm/dm/are-we-esm?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/are-we-esm
[bundle-src]: https://img.shields.io/bundlephobia/minzip/are-we-esm?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=are-we-esm
[license-src]: https://img.shields.io/github/license/antfu/are-we-esm.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/antfu/are-we-esm/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/are-we-esm
