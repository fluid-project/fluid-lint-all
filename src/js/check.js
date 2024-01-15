"use strict";
var fluid = require("infusion");
var fs = require("fs");
var path = require("path");
var minimatch = require("minimatch");

fluid.defaults("fluid.lintAll.check", {
    gradeNames: ["fluid.component"],
    members: {
        results: {
            key: "{that}.options.key",
            valid:   0,
            invalid: 0,
            checked: 0,
            checkedPaths: [],
            errorsByPath: {}
        }
    },
    invokers: {
        runChecks: {
            funcName: "fluid.lintAll.runChecks",
            args: ["{that}", "{arguments}.0", "{arguments}.1"] // checksToRun, changedFiles
        },
        checkImpl: {
            funcName: "fluid.notImplemented",
            args: ["{that}", "{arguments}.0"] // filesToScan
        }
    }
});

/**
 *
 * A common gateway function that scans for files and triggers the check implementation if needed.
 *
 * @param {Object} that - The `fluid.lintAll.check` component.
 * @param {Array<String>} [checksToRun] - An optional list of checks to run.  All checks are run if this is left out.
 * @param {Array<String>} changedFiles - An array of paths to changed files, used to limit runs to uncommitted files.
 * @return {CheckResults|Promise<CheckResults>} - The results of the check, which can either be a value for synchronous checks, or a `fluid.promise`.
 *
 */
fluid.lintAll.runChecks = function (that, checksToRun, changedFiles) {
    if (that.options.config.enabled && (!checksToRun || checksToRun.includes(that.options.key))) {
        // Use fluid-glob to get the list of files.
        var filesToScan = fluid.glob.findFiles(that.options.rootPath, that.options.config.includes, that.options.config.excludes, that.options.minimatchOptions);

        if (that.options.useGitIgnore) {
            var gitignorePath = path.resolve(that.options.rootPath, ".gitignore");
            if (fs.existsSync(gitignorePath)) {
                var rawGitIgnoreContents = fs.readFileSync(gitignorePath, { encoding: "utf8" });
                var gitIgnores = rawGitIgnoreContents.split(/\r?\n/).filter(function (singleEntry) {
                    var trimmedEntry = singleEntry.trim();
                    if (trimmedEntry === "" || trimmedEntry.startsWith("#")) { return false; }
                    return true;
                });

                // As we are comparing patterns to patterns, we need to ensure that windows-style paths are converted
                // and stripped of their drive letters.
                var sanitisedRootPath = fluid.glob.sanitisePath(that.options.rootPath);
                var filesToIgnore = [];
                fluid.each(gitIgnores, function (singleGitIgnore) {
                    // We cannot use path.resolve here because our glob patterns are all expressed with forward slashes.
                    var pathedPattern = sanitisedRootPath + "/" + singleGitIgnore;
                    var filesToIgnoreForThisPattern = minimatch.match(filesToScan, pathedPattern, that.options.minimatchOptions);
                    if (filesToIgnoreForThisPattern.length) {
                        filesToIgnore = filesToIgnore.concat(filesToIgnoreForThisPattern);
                    }
                });

                if (filesToIgnore.length) {
                    filesToScan = filesToScan.filter(function (singlePath) {
                        return filesToIgnore.indexOf(singlePath) === -1;
                    });
                }
            }
        }

        if (changedFiles && changedFiles.length) {
            filesToScan = filesToScan.filter(function (singlePath) {
                return changedFiles.indexOf(singlePath) !== -1;
            });
        }

        that.results.checked = filesToScan.length;
        that.results.checkedPaths = filesToScan;
        return that.checkImpl(filesToScan);
    }
    else {
        return that.results;
    }
};

/**
 *
 * @typedef {Object} SingleError
 * @param {number} line - The line at which the error was found.
 * @param {number} column - The column at which the error was found.
 * @param {String} message - A description of the error.
 *
 */

/**
 *
 * @typedef CheckResults
 * @param {string} key - The unique identifier of the check being run.
 * @param {number} checked - The number of files checked.
 * @param {number} valid - The number of files that passed the linting checks.
 * @param {number} invalid - The number of files that failed the linting checks.
 * @param {Object <String, Array<SingleError>>} errorsByPath - Arrays of individual linting failures, keyed by the
 * relative path to the file in which they occurred.
 *
 */
