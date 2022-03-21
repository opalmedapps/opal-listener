The listener is currently following the strangler fig design pattern to develop a new version while maintaining the old one.
* Legacy code is stored in the `listener` folder.
    - Note: the sub-folder `api/modules` represents an improvement over the legacy structure,
      but is still part of the old version. It may make its way into the new version in some form.
* New code is stored in the `src` folder. The entry-point for running the listener is `src/server.js`.
  The following best-practice improvements are applied to all new code in this folder:
    - Documentation using JSDoc.
        * Each file and method must have a JSDoc comment.
    - Static analysis using ESLint.
    - Unit testing using Mocha & Chai.
    - Object-oriented structure using JavaScript classes.
    - Improved folder and file structure (one purpose per file).
