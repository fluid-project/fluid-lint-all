#!/usr/bin/env node

"use strict";
var fluid = require("infusion");
var process = require("process");

require("./args");
require("./lint-all.js");

var supportedChecks = require("../json/supportedChecks.json5");

/**
 *
 * Print our usage instructions (typically when `--help` is passed or an invalid argument is passed).
 *
 */
function printUsageInstructions() {
    fluid.logObjectRenderChars = 256000;
    var usageTextSegs = [
        " ",
        "USAGE: This command supports the following options:",
        " ",
        "  - configFile: The path to the configuration file, see the README for details.",
        " ",
        "  - showCheckedFiles: Display the list of files checked in the final output.",
        " ",
        "  - stagedOnly: Only check files that have been staged for commit.",
        " ",
        "  - checks: A command-delimited list of checks to run.",
        " ",
        "    The following checks are supported:",
        " "
    ];

    fluid.each(supportedChecks, function (checkDef, checkKey) {
        usageTextSegs.push("    - " + checkKey + ": " + checkDef.description);
        if (checkDef.subchecks) {
            fluid.each(checkDef.subchecks, function (subcheckDef, subcheckKey) {
                usageTextSegs.push(" ");
                usageTextSegs.push("       - " + checkKey + "." + subcheckKey + ": " + subcheckDef.description);
            });
        };
        usageTextSegs.push(" ");
    });
    usageTextSegs.push(" ");

    fluid.each(usageTextSegs, function (singleLine) {
        fluid.log(fluid.logLevel.FAIL, singleLine);
    });
}

var argsOptions = fluid.lintAll.parseArgs(process.argv);

if (argsOptions.showHelp) {
    printUsageInstructions();
    process.exit(0);
}
else {
    var argsErrors = [];
    fluid.each(argsOptions, function (argumentValue) {
        if (argumentValue instanceof Error) {
            argsErrors.push(argumentValue.message);
        }
    });

    if (argsErrors.length) {
        printUsageInstructions();

        argsErrors.push[""];
        fluid.each(argsErrors, function (singleError) {
            fluid.log(fluid.logLevel.FAIL, "ERROR: " + singleError + "\n\n");
        });

        process.exit(1);
    }
    else {
        var allChecksPromise = fluid.lintAll.runAllChecks(argsOptions);
        allChecksPromise.then(
            function () {
                process.exit(0);
            },
            function (error) {
                fluid.log(fluid.logLevel.FAIL, error.message);
                process.exit(1);
            }
        );
    }
}
