# Documentation README

This directory contains the VitePress documentation site for `js-bitcoinkernel`.

## Local Development

From the repository root:

```bash
npm install
npm run docs:dev
```

VitePress will start a local development server and print the URL.

## Production Build

```bash
npm run docs:build
```

The static site is written to:

```txt
docs/.vitepress/dist
```

Preview the built site with:

```bash
npm run docs:preview
```

## Content Structure

```txt
docs/
├── index.md
├── guide/
│   ├── repository-analysis.md
│   ├── introduction.md
│   ├── installation.md
│   ├── quick-start.md
│   └── architecture.md
├── tutorials/
├── api/
└── .vitepress/
    └── config.ts
```

## Deployment

The repository includes a GitHub Pages workflow at `.github/workflows/docs.yml`.

On pushes to `main`, the workflow:

1. Installs dependencies.
2. Builds the VitePress site.
3. Uploads `docs/.vitepress/dist`.
4. Deploys it to GitHub Pages.

The workflow sets `VITEPRESS_BASE` to the repository-name project path, which is the correct base path for a GitHub Pages project site.

## Native Dependency Note

The documentation build does not load `libbitcoinkernel`. Code examples require a working native library at runtime, but VitePress only renders Markdown and configuration.
