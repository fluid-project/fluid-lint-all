# fluid-lint-all

This package runs the standard linting checks used within the
[Fluid community](https://fluidproject.org).

## Requirements

If you want to use this package without installing it, you'll need to install [`npx`](https://www.npmjs.com/package/npx).

## Usage

### Adding the Checks as a Dependency of Your Project

1. Install the package using a command like `npm install --save-dev fluid-lint-all`.
2. Add a script to your package.json, something like: ```"lint": "fluid-lint-all"```
3. Run the checks using a command like `npm lint`.

### Running the Checks Using `npx`

To use this package without installing it as a dependency, use a command like:

```npx fluid-lint-all```

Although it's not required, it is recommended that you install the
[standard ESLint configuration used within the community](https://github.com/fluid-project/eslint-config-fluid).  If you
choose not to, you must at least have some kind of `.eslintrc.json` in your repository.  Otherwise, some of the ESLint
checks will fail for lack of a configuration file.

## Tests

To run the tests in this package, use a command like `npm test`.

## Checks Available

| Task                       | Description |
| -------------------------- | ----------- |
| eslint                     | Use [ESLint](https://eslint.org) to lint both javascript and markdown content. |
| eslint.js                  | Check the validity and formatting of Javascript files. |
| eslint.md                  | Check the validity and formatting of Javascript code blocks in Markdown files. |
| json5lint                  | Check the validity of JSON5 files. |
| jsonlint                   | Use [jsonlint](https://www.npmjs.com/package/jsonlint) to check the validity and formatting of JSON files. |
| lintspaces                 | Use [lintspaces](https://github.com/schorfES/node-lintspaces) to check for trailing carriage returns and JSON indentation issues. |
| lintspaces.jsonindentation | Check the indentation of JSON files. |
| lintspaces.newlines        | Check for the presence of a carriage return at the end of a file. |
| markdownlint               | Use [markdownlint](https://github.com/DavidAnson/markdownlint) to check the formatting of Markdown files. |
| mdjsonlint                 | Check the validity and formatting of JSON code blocks within Markdown files. |
| stylelint                  | Use [stylelint](https://stylelint.io) to check the formatting of CSS or SCSS files.|

## Configuration

This package is configured using a JSON file, which by default is named
`.fluidlintallrc.json` and located in the root of your repository.  You can run the checks using
a different configuration file by passing the `configFile` option, as in
`npx fluid-lint-all --configFile ./path/to/your/config.json`.

You can choose to disable any checks that are not relevant to your environment
in the configuration file (see below), but you can also specify which check(s)
to run by passing the `checks` option, as in `npx lint-all --checks=eslint` or
`npx fluid-lint-all --checks=jsonlint,lintspaces.newlines`

Each check supports the following configuration options.

| Option   | type            | Description |
| -------- | --------------- | ----------- |
| enabled  | `Boolean`       | Whether or not to run the check.  If set to `false`, will also disable any sub-checks.  Defaults to `true`. |
| includes | `Array<string>` | An array of glob patterns indicating files to be linted. |
| excludes | `Array<string>` | An array of glob patterns indicating files (that otherwise match the includes) which should be excluded. |
| options  | `Object`        | The libraries (see above) used for most checks support their own configuration options, which should be placed here. |

The defaults for each check appear in [this grade](./src/js/lint-all.js).

## File "globbing"

This package uses [fluid-glob](https://www.npmjs.com/package/fluid-glob) to defined the list of files to scan for each
check.  For each check there are two supported options, `includes` and `excludes`.  They are evaluated roughly in that
order, i.e. you establish more general wildcards for a file type or directory, and exclude individual files or
subdirectories that should not be linted.

See the documentation for fluid-glob for further details on the supported syntax.

## Example Usage

In this example, we disable the markdown checks:

```json
{
    "eslint": {
        "md": {
            "enabled": false
        }
    },
    "markdownlint": {
        "enabled": false
    },
    "mdjsonlint": {
        "enabled": false
    }
}
```

This example demonstrates the way in which configuration options for subchecks (such as `eslint.md`) are nested under
their respective parent (in this case, `eslint`).  Here's an example that changes a configuration option specific to
a particular library:

```json
{
    "json-eslint": {
        "excludes": ["./package-lock.json"],
        "options": {
            "rules": {
                "indent": "on"
            }
        }
    }
}
```

## Migrating from `fluid-grunt-lint-all`

This package was written as a replacement for [fluid-grunt-lint-all](https://www.npmjs.com/package/fluid-grunt-lint-all).

The configuration of this package is very different, as this package does not
use Grunt or any conventions inherited from Grunt.  You will need to create a
new configuration file using the above guide.

This package mitigates the problems we had previously with dependency resolution.  When migrating away from
`fluid-grunt-lint-all`, you should be able to remove all `Grunt` dependencies as well as ESLint plugin dependencies.
