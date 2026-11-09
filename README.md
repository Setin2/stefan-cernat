# About

This is an interactive personal website built with Babylon.js and inspired by Bruno Simon.
The website is still under development and is available at https://setin2.github.io/stefan-cernat/

# Running locally

The application is still being developed and has only a few features so far, so the setup is simple.

1. First clone the repository and install all dependencies using `npm install`.
2. (Optional) If you want webpack to rebuild while you edit, run `npm run watch`.
3. You can start the application using `npm run webserver`, which will use `http-server` to host it on `http://localhost:1338/app/`.

# Tests

Run `npm test` to run the test suite (Jest). The tests live in `tests/`, in folders that mirror `src/scenes/`:

- Game rules that don't need Babylon, such as the trading market, the fruit flight, the tank's ground contact, adaptive resolution and text layout, are tested directly.
- Everything that does need Babylon or physics, such as the friction fix, the tank's barrel collider, the arcade buttons, impact sounds and both minigames from start to finish, runs in a headless scene. That scene uses Babylon's `NullEngine` with the real cannon.js, so nothing is drawn (see `tests/helpers/scene.ts`).
