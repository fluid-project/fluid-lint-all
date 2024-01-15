"use strict";
var fluid = require("infusion");

var minimist = require("minimist");

fluid.registerNamespace("fluid.lintAll");

/**
 * @typedef {Object} ParsedArgs - The parsed and annotated set of arguments.
 * @property {Array<String>} [checks]
 * @property {String | Error } [configFile]
 * @property {Boolean} [showHelp]
 * @property {Boolean} [showMergedConfig]
 *
 * Invalid content (such as a missing `configFile` value) is replaced with an `Error`.  If invalid fields are passed,
 * they are replaced with an `Error`.
 */

/**
 *
 * Use `minimist` to parse the arguments and then check for invalid inputs.
 *
 * @param {Array<String>} processArgs - The complete set of arguments, generally `process.argv`.
 * @return {ParsedArgs} - An object representing the parsed arguments.
 *
 */
fluid.lintAll.parseArgs = function (processArgs) {
    var minimistOptions = minimist(processArgs.slice(2), {
        boolean: ["showMergedConfig", "showHelp", "showCheckedFiles", "stagedOnly"],
        string: ["checks", "configFile"],
        alias: {
            "showHelp": ["h", "help"]
        }
    });

    // Minimist only handles parsing and not validation, so we lightly validate the input here.
    var supportedArgKeys = ["checks", "configFile", "showMergedConfig", "stagedOnly", "showHelp", "showCheckedFiles", "help", "h"];
    var argsOptions = fluid.filterKeys(minimistOptions, supportedArgKeys);
    if (argsOptions.checks) {
        argsOptions.checks = argsOptions.checks.trim().replace(/^"(.+)"$/, "$1").split(/ *, */);
    }

    if (minimistOptions.configFile === "") {
        argsOptions.configFile = new Error("Missing filename.");
    }

    var badArgs = fluid.filterKeys(minimistOptions, supportedArgKeys, true);
    fluid.each(badArgs, function (badArgumentValue, badArgumentKey) {
        if (badArgumentKey !== "_") {
            argsOptions[badArgumentKey] = new Error("Invalid argument '" + badArgumentKey + "'.");
        }
    });

    return argsOptions;
};
