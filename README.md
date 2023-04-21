# Template Electron + TypeScript + Webpack

Template for an Electron app using TypeScript for both processes and Webpack to bundle the renderer process.

Setup and package versions should be current as of Dec 23 2022.

## Files

- `src/main`: Main process. Entry point is `main.ts`. Built to `build/main`.
- `src/renderer`: Renderer process. HTML entry point is `static/index.html`; TypeScript entry point is `script/renderer.ts`. The static folder's contents are copied to `build/renderer`, together with Webpack's output bundle.

## Commands

Development mode:

- Build with `npm run build`. Note this uses Webpack development mode.
- Run with `npm start`

Production mode:

- Configure an appropriate [maker](https://www.electronforge.io/config/makers) in `package.json` (default: `.deb` only).
- Build and package with `npm run make`. Destination folder is `out/`. Note this uses Webpack production mode.
- Run by installing the install file for your platform in `out/`.

## TODO

- Delete `.git`, then setup your own Git repo.
- Search for TODO.
- Write your app in `src/`.
- Replace this README.
- Configure Content Security Policy (devtools warning).
