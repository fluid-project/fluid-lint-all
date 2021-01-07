"use strict";
var fluid = require("infusion");
var path = require("path");
var stylelint = require("stylelint");

fluid.require("fluid-glob");

require("./check");

fluid.defaults("fluid.lintAll.stylelint", {
    gradeNames: ["fluid.lintAll.check"],
    key: "stylelint",
    invokers: {
        runChecks: {
            funcName: "fluid.lintAll.stylelint.runChecks"
        }
    }
});

fluid.lintAll.stylelint.runChecks = function (that, checksToRun) {
    var wrappedPromise = fluid.promise();

    if (that.options.config.enabled && !checksToRun || checksToRun.includes(that.options.key)) {
        // Use fluid-glob to get the list of files.
        var filesToScan = fluid.glob.findFiles(that.options.rootPath, that.options.config.includes, that.options.config.excludes, that.options.minimatchOptions);

        if (filesToScan.length) {
            var stylelintOptions = fluid.copy(that.options.config.options);
            stylelintOptions.files = filesToScan;
            if (stylelintOptions.configFile) {
                stylelintOptions.configFile = fluid.module.resolvePath(stylelintOptions.configFile);
            }

            try {
                var stylelintPromise = stylelint.lint(stylelintOptions);
                stylelintPromise["catch"](wrappedPromise.reject);
                stylelintPromise.then(function (results) {
                    if (results.errored) {
                        fluid.each(results.results, function (fileResults) {
                            if (fileResults.errored) {
                                var relativePath = path.relative(that.options.rootPath, fileResults.source);
                                that.results.errorsByPath[relativePath] = [];
                                that.results.invalid++;
                                fluid.each(fileResults.warnings, function (singleWarning) {
                                    if (singleWarning.severity === "error") {
                                        that.results.errorsByPath[relativePath].push({
                                            line: singleWarning.line,
                                            column: singleWarning.column,
                                            message: singleWarning.text
                                        });
                                    }
                                });
                            }
                        });
                    }
                    that.results.checked = filesToScan.length;
                    that.results.valid = that.results.checked - that.results.invalid;
                    wrappedPromise.resolve(that.results);
                });
            }
            catch (e) {
                fluid.log(fluid.logLevel.WARN, e);
                wrappedPromise.reject(e);
            }
        }
        else {
            wrappedPromise.resolve(that.results);
        }
    }
    else {
        wrappedPromise.resolve(that.results);
    }

    return wrappedPromise;
};
