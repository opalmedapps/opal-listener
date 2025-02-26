The listener is currently following the strangler fig design pattern to develop a new version while maintaining the old one.

## Legacy Part

Legacy code is stored in the `listener` folder.
  - Note: the sub-folder `api/modules` represents an improvement over the legacy structure,
    but is still part of the old version. It may make its way into the new version in some form.

## New Part
New code is stored in the `src` folder. The entry-point for running the listener is `src/server.js`.
The following best-practice improvements are applied to all new code in this folder:

  - Documentation using JSDoc.
      * Each file and method must have a JSDoc comment.
      * `npm run docs`
  - Static analysis using ESLint.
      * `npm run lint`
  - Unit testing using Mocha & Chai.
      * `npm test`
  - Object-oriented structure using JavaScript classes.
  - Improved folder and file structure (one purpose per file).
  - Up-to-date dependencies.
      * Deprecated dependencies (such as `request`) should not be used.
