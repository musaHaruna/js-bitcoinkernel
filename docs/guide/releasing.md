# Releasing to npm

Native libraries are rebuilt from the pinned Bitcoin Core submodule during a version-tagged release. The workflow packages the resulting macOS-universal, Linux x64, and Linux ARM64 libraries into the npm tarball, verifies every checksum and source commit, runs the type checks, lint, tests, package build, and documentation build, then publishes through npm Trusted Publishing.

## One-time npm setup

1. Decide the npm package name. The current unscoped name is `js-bitcoinkernel`; it must be available to your npm account before the first release. A scoped name such as `@your-npm-user/js-bitcoinkernel` avoids name conflicts, but changing to one also changes the install command and should be done before publishing.
2. Enable two-factor authentication on the npm account.
3. In the npm package settings, add a GitHub Trusted Publisher with owner `musaHaruna`, repository `js-bitcoinkernel`, workflow file `.github/workflows/release.yml`, and environment `npm`.
4. In the GitHub repository settings, create the `npm` environment. Add a required reviewer if releases should have a manual approval gate.

The release workflow uses GitHub's OpenID Connect identity (`id-token: write`) rather than storing an npm access token in GitHub.

## Updating the Bitcoin Core pin

Update Bitcoin Core in its own reviewed build commit before preparing an npm release. Select an official commit, move the submodule Gitlink, rebuild all three native targets, and verify the manifests:

```bash
git submodule update --init --recursive
git -C depend/bitcoin fetch origin <bitcoin-core-commit>
git -C depend/bitcoin checkout --detach <bitcoin-core-commit>
npm run native:build
npm run native:verify
git add depend/bitcoin src/js-kernel/binaries
git commit -m "build: update Bitcoin Core pin"
```

Run the native build on macOS and both Linux architectures, or let the release workflow build each target, before committing the update. The CI and release workflows initialize submodules recursively. `native:verify` requires each binary manifest to name the same Bitcoin Core commit as the project Gitlink, so a source change cannot be released with stale native libraries.

## Release a version

Choose the version before creating the tag. For the first bug-fix prerelease after the current `1.0.0-alpha.0` version, this would be `1.0.0-alpha.1`:

```bash
npm version 1.0.0-alpha.1 --no-git-tag-version
git add package.json package-lock.json
git commit -m "release: 1.0.0-alpha.1"
git tag v1.0.0-alpha.1
git push origin main --tags
```

Pushing the version tag runs `.github/workflows/release.yml`. The workflow must finish successfully before the package becomes available from npm:

```bash
npm install js-bitcoinkernel@1.0.0-alpha.1
```

For an unscoped package, `--access public` in the workflow makes the first publication public. Do not create the tag until the package name and npm Trusted Publisher configuration are correct; a failed trusted-publishing setup fails before npm can publish the artifact.

## Continuous integration and documentation

Pushing to `main` runs the library checks. They validate the checksums of all checked-in native libraries, run the native test suite on Linux x64, Linux ARM64, and macOS, and build the package and documentation. The checked-in native libraries are validated by CI; CI does not commit rebuilt binaries back to the repository.

The documentation workflow deploys GitHub Pages after a push that changes `docs/`, `package.json`, `package-lock.json`, or its workflow file. The release workflow builds fresh libraries separately when a `v*` tag is pushed.
