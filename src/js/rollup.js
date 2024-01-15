// A rollup has sub-checks but does not run any checks directly.
"use strict";
var fluid = require("infusion");

require("./check");

fluid.defaults("fluid.lintAll.rollup", {
    gradeNames: ["fluid.lintAll.check"],
    members: {
        subChecks: []
    },
    invokers: {
        runChecks: {
            funcName: "fluid.lintAll.rollup.runChecks",
            args: ["{that}", "{arguments}.0", "{arguments}.1"] // checksToRun, changedFiles
        },
        // We don't need the standard invoker used by standalone checks, but want to keep the data and other common bits.
        checkImpl: {
            funcName: "fluid.identity"
        }
    }
});

/**
 *
 * Run any sub-checks that are direct sub-components of this `fluid.lintAll.rollup`, and which match the (optional)
 * list of checks to run.
 *
 * @param {Object} that - The `fluid.lintAll.rollup` component.
 * @param {Array<String>} [checksToRun] - An array of check "keys" indicating which checks should be run.  If omitted,
 * all checks are run.
 * @param {Array<String>} changedFiles - An array of paths to changed files, used to limit runs to uncommitted files.
 * @return {Promise <CheckResults>} - A promise that will resolve with the results of the check.
 *
 */
fluid.lintAll.rollup.runChecks = function (that, checksToRun, changedFiles) {
    var childResults = [];
    fluid.visitComponentChildren(that, function (childComponent) {
        if (fluid.componentHasGrade(childComponent, "fluid.lintAll.check")) {
            if (!checksToRun || checksToRun.includes(childComponent.options.key) || checksToRun.includes(that.options.key)) {
                var childResult = childComponent.runChecks(false, changedFiles);
                childResults.push(childResult);
            }
        }
    }, { flat: true });
    return fluid.promise.sequence(childResults);
};
