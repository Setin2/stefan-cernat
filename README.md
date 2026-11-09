# About

[![CI](https://github.com/Setin2/stefan-cernat/actions/workflows/ci.yml/badge.svg)](https://github.com/Setin2/stefan-cernat/actions/workflows/ci.yml)

This is an interactive personal website built with Babylon.js and inspired by Bruno Simon.
The website is still under development and is available at https://setin2.github.io/stefan-cernat/

# Running locally

The application is still being developed and has only a few features so far, so the setup is simple.

1. First clone the repository and install all dependencies using `npm install`.
2. (Optional) If you want webpack to rebuild while you edit, run `npm run watch`.
3. You can start the application using `npm run webserver`, which will use `http-server` to host it on `http://localhost:1338/app/`.

# Linting and formatting

`npm run lint` checks the code with ESLint (`eslint.config.mjs`): common mistakes, TypeScript issues and formatting. Formatting means 4-space indents, double quotes, semicolons and trailing commas, the style the code is written in. Any warning fails the check. `npm run lint:fix` fixes what can be fixed automatically. `.editorconfig` sets up most editors to match.

# Tests

Run `npm test` to run the test suite (Jest). The tests live in `tests/`, in folders that mirror `src/scenes/`:

- Game rules that don't need Babylon, such as the trading market, the fruit flight, the tank's ground contact, adaptive resolution and text layout, are tested directly.
- Everything that does need Babylon or physics, such as the friction fix, the tank's barrel collider, the arcade buttons, impact sounds and both minigames from start to finish, runs in a headless scene. That scene uses Babylon's `NullEngine` with the real cannon.js, so nothing is drawn (see `tests/helpers/scene.ts`).

# Deploying

GitHub Pages serves the site straight from `main`, including the built `dist/` folder, so `dist/` has to be rebuilt and committed with every change:

1. Stop `npm run watch` if it's running (it writes a development build into `dist/`).
2. Run `npm run build` and commit `dist/` together with the source changes.

`npm run verify` runs everything CI checks: lint and formatting, typecheck, tests, the production build, and that `dist/` matches the committed one.

# CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request. It lints and checks formatting, typechecks, runs the tests and builds. It fails if the committed `dist/` isn't the production build of the source, which catches a forgotten `npm run build` before it reaches the live site. The build is reproducible (the same source always builds to the same files), which is what makes that check possible. Dependabot keeps the workflow's actions up to date.

