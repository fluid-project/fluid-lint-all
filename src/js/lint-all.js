"use strict";
var fluid = require("infusion");
var fs = require("fs");
var path = require("path");
var process = require("process");
var jsonlint = require("@prantlf/jsonlint");
var child_process = require("child_process");

require("json5/lib/register");

require("../../index");

require("./eslint");
require("./json5lint");
require("./jsonEslint");
require("./jsonlint");
require("./lintspaces");
require("./logger");
require("./mapMerge");
require("./markdownlint");
require("./mdjsonlint");
require("./stylelint");
require("./yaml");

fluid.registerNamespace("fluid.lintAll");

/**
 *
 * Instantiate a `fluid.lintAll.checkRunner` with the common configuration file options, and trigger a check run.
 *
 * @param {ParsedArgs} argsOptions - The parsed set of arguments, typically derived from `process.argv`.
 * @return {Promise<Array<CheckResults>>} - A `fluid.promise.sequence` that will be resolved with a (potentially) nested
 * array of `CheckResult` objects.
 *
 */
fluid.lintAll.runAllChecks = function (argsOptions) {
    var configFileOptions = {};

    var configFileArgsPath = fluid.get(argsOptions, "configFile") || ".fluidlintallrc.json";
    var resolvedArgsPath = fluid.module.resolvePath(configFileArgsPath);
    var configFilePath = path.resolve(process.cwd(), resolvedArgsPath);
    if (fs.existsSync(configFilePath)) {
        var configFileContents = fs.readFileSync(configFilePath, { encoding: "utf8"});
        try {
            configFileOptions = jsonlint.parse(configFileContents);
        }
        catch (error) {
            fluid.fail("Error parsing JSON configuration file '" + configFilePath + "':\n" + JSON.stringify(error, null, 2));
        }
    }

    var checkRunner = fluid.lintAll.checkRunner({ userConfig: configFileOptions });

    return checkRunner.runAllChecks(argsOptions);
};

fluid.lintAll.mergeUserOptions = function (defaultIncludesAndExcludes, userConfig) {
    // Clone all "user" settings.
    var mergedObject = fluid.copy(userConfig);

    // Combine all includes and excludes using an alternate strategy.
    var pathsToMerge = [
        "includes",
        "excludes",
        "eslint.js.includes",
        "eslint.js.excludes",
        "eslint.json.includes",
        "eslint.json.excludes",
        "eslint.md.includes",
        "eslint.md.excludes",
        "json5lint.includes",
        "json5lint.excludes",
        "jsonlint.includes",
        "jsonlint.excludes",
        "lintspaces.jsonindentation.includes",
        "lintspaces.jsonindentation.excludes",
        "lintspaces.newlines.includes",
        "lintspaces.newlines.excludes",
        "markdownlint.includes",
        "markdownlint.excludes",
        "mdjsonlint.includes",
        "mdjsonlint.excludes",
        "stylelint.includes",
        "stylelint.excludes",
        "yaml.includes",
        "yaml.excludes"
    ];

    fluid.each(pathsToMerge, function (pathToMerge) {
        var defaultsMaterial = fluid.get(defaultIncludesAndExcludes, pathToMerge);
        var userMaterial = fluid.get(userConfig, pathToMerge);
        var mergedMaterial = fluid.lintAll.mapMerge(defaultsMaterial, userMaterial);
        fluid.set(mergedObject, pathToMerge, mergedMaterial);
    });

    return mergedObject;
};


fluid.defaults("fluid.lintAll.checkRunner", {
    gradeNames: ["fluid.component"],
    distributeOptions: {
        rootPath: {
            "source": "{that}.options.userConfig.rootPath",
            "target": "{that fluid.lintAll.check}.options.rootPath"
        },
        minimatchOptions: {
            "source": "{that}.options.userConfig.minimatchOptions",
            "target": "{that fluid.lintAll.check}.options.minimatchOptions"
        },
        useGitIgnore: {
            "source": "{that}.options.userConfig.useGitIgnore",
            "target": "{that fluid.lintAll.check}.options.useGitIgnore"
        }
    },
    invokers: {
        runAllChecks: {
            funcName: "fluid.lintAll.checkRunner.runAllChecks",
            args: ["{that}", "{arguments}.0"]
        }
    },
    mergePolicy: {
        "userConfig.sources": "nomerge"
    },
    // Options that are fine for normal IoC options merging.
    userConfig: {
        rootPath: process.cwd(),
        useGitIgnore: true,
        "sources": {
            "css": ["./*.css", "./src/**/*.css", "tests/**/*.css"],
            "js": ["./src/**/*.js", "./tests/**/*.js", "./*.js"],
            "json": ["./src/**/*.json", "./tests/**/*.json", "./*.json"],
            "json5": ["./src/**/*.json5", "./tests/**/*.json5", "./*.json5"],
            "md": ["./src/**/*.md", "./tests/**/*.md", "./*.md"],
            "scss": ["./*.scss", "./src/**/*.scss", "tests/**/*.scss"],
            "yaml": ["./*.yml", "./src/**/*.yml", "tests/**/*.yml", ".github/**/*.yml"]
        },
        "minimatchOptions": {
            "dot": true,
            "matchBase": true
        },
        "eslint": {
            "enabled": true,
            "js": {
                "enabled": true,
                "options": {
                    "ignore": false,
                    "resolvePluginsRelativeTo": "@expand:fluid.module.resolvePath(%fluid-lint-all)",
                    "overrideConfig": {}
                }
            },
            "json": {
                "enabled": true,
                options: {
                    "resolvePluginsRelativeTo": "@expand:fluid.module.resolvePath(%fluid-lint-all)",
                    "overrideConfig": {
                        "rules": {
                            /*
                                Our approach doesn't work well with leading comments in json5 files, which appear to be incorrectly
                                indented.  As we check for indentation using lintspaces, we can safely disable that check here.
                            */
                            "@stylistic/js/indent": "off",
                            /*
                                Allow ES5 multi-line strings.
                            */
                            "no-multi-str": "off",
                            "trailing-comma": "off"
                        }
                    }
                }
            },
            "md": {
                "enabled": true,
                "options": {
                    "resolvePluginsRelativeTo": "@expand:fluid.module.resolvePath(%fluid-lint-all)",
                    "overrideConfig": {
                        "env": {
                            "browser": true
                        },
                        "rules": {
                            "no-undef": "off",
                            "strict": "off",
                            "no-unused-vars": "off",
                            "no-console": "off"
                        },
                        "plugins": [
                            "markdown"
                        ]
                    }
                }
            }
        },
        "json5lint": {
            "enabled": true
        },
        "jsonlint": {
            "enabled": true
        },
        "lintspaces": {
            "enabled": true,
            "jsonindentation": {
                "enabled": true,
                "options": {
                    indentation: "spaces",
                    spaces: 4,
                    ignores: ["js-comments"]
                }
            },
            "newlines": {
                "enabled": true,
                options: {
                    newline: true
                }
            }
        },
        "markdownlint": {
            "enabled": true,
            options: { config: "@expand:fluid.require(%markdownlint-config-fluid/.markdownlintrc.json)" }
        },
        "mdjsonlint": {
            "enabled": true
        },
        "stylelint": {
            "enabled": true,
            options: {
                configFile: "@expand:fluid.module.resolvePath(%fluid-lint-all/.stylelintrc.json)"
            }
        },
        "yaml": {
            "enabled": true
        }
    },
    // "special" include/exclude options that must be manually merged above.
    defaultIncludesAndExcludes: {
        "eslint": {
            "js": {
                "includes": "{that}.options.userConfig.sources.js",
                "excludes": []
            },
            "json": {
                "includes": {
                    "expander": {
                        func: "fluid.flatten",
                        args: [["{that}.options.userConfig.sources.json", "{that}.options.userConfig.sources.json5"]]
                    }
                },
                "excludes": []
            },
            "md": {
                "includes": "{that}.options.userConfig.sources.md",
                "excludes": []
            }
        },
        "json5lint": {
            "includes": "{that}.options.userConfig.sources.json5",
            "excludes": []
        },
        "jsonlint": {
            "includes": "{that}.options.userConfig.sources.json",
            "excludes": ["./package-lock.json"]
        },
        "lintspaces": {
            "jsonindentation": {
                "includes": {
                    "expander": {
                        func: "fluid.flatten",
                        args: [["{that}.options.userConfig.sources.json", "{that}.options.userConfig.sources.json5"]]
                    }
                },
                "excludes": ["./package-lock.json"]
            },
            "newlines": {
                "includes": ["./src/**/*", "./tests/**/*", "./*"],
                "excludes": [
                    "./package-lock.json",
                    "*.aiff",
                    "*.eot",
                    "*.gif",
                    "*.ico",
                    "*.jpg",
                    "*.jpeg",
                    "*.mp3",
                    "*.mp4",
                    "*.otf",
                    "*.pdf",
                    "*.png",
                    "*.ppt",
                    "*.pptx",
                    "*.svg",
                    "*.wav",
                    "*.webm",
                    "*.webp",
                    "*.woff",
                    "*.woff2"
                ]
            }
        },
        "markdownlint": {
            "includes": "{that}.options.userConfig.sources.md",
            "excludes": []
        },
        "mdjsonlint": {
            "includes": "{that}.options.userConfig.sources.md",
            "excludes": []
        },
        "stylelint": {
            "includes": {
                "expander": {
                    "func": "fluid.flatten",
                    "args": [["{that}.options.userConfig.sources.css", "{that}.options.userConfig.sources.scss"]]
                }
            },
            "excludes": []
        },
        "yaml": {
            "includes": "{that}.options.userConfig.sources.yaml",
            "excludes": []
        }
    },
    config: {
        expander: {
            funcName: "fluid.lintAll.mergeUserOptions",
            args: ["{that}.options.defaultIncludesAndExcludes", "{that}.options.userConfig"]
        }
    },
    components: {
        "eslint": {
            type: "fluid.lintAll.eslint",
            options: {
                config: "{fluid.lintAll.checkRunner}.options.config.eslint"
            }
        },
        "json5lint": {
            type: "fluid.lintAll.json5lint",
            options: {
                config: "{fluid.lintAll.checkRunner}.options.config.json5lint"
            }
        },
        "jsonlint": {
            type: "fluid.lintAll.jsonlint",
            options: {
                config: "{fluid.lintAll.checkRunner}.options.config.jsonlint"
            }
        },
        "lintspaces": {
            type: "fluid.lintAll.lintspaces",
            options: {
                config: "{fluid.lintAll.checkRunner}.options.config.lintspaces"
            }
        },
        "markdownlint": {
            type: "fluid.lintAll.markdownlint",
            options: {
                config: "{fluid.lintAll.checkRunner}.options.config.markdownlint"
            }
        },
        "mdjsonlint": {
            type: "fluid.lintAll.mdjsonlint",
            options: {
                config: "{fluid.lintAll.checkRunner}.options.config.mdjsonlint"
            }
        },
        "stylelint": {
            type: "fluid.lintAll.stylelint",
            options: {
                config: "{fluid.lintAll.checkRunner}.options.config.stylelint"
            }
        },
        "yaml": {
            type: "fluid.lintAll.yaml",
            options: {
                config: "{fluid.lintAll.checkRunner}.options.config.yaml"
            }
        }
    }
});

/**
 *
 * Look for any direct sub-components that are `fluid.lintAll.checks`, and run each of them.
 *
 * @param {Object} that - The `fluid.lintAll.checkRunner` component.
 * @param {ParsedArgs} argsOptions - Parsed command line arguments.
 * @return {Promise<Array<CheckResults>>} - A promise that will be resolved with a (potentially nested) array of
 * `CheckResults` objects.
 *
 */
fluid.lintAll.checkRunner.runAllChecks = function (that, argsOptions) {
    var allChecksPromise = fluid.promise();

    var checkPromises = [];

    var overallResults = {
        valid:   0,
        invalid: 0,
        checked: 0
    };

    var checkArgs = fluid.get(argsOptions, "checks");
    fluid.log(fluid.logLevel.WARN);
    fluid.log(fluid.logLevel.WARN, "======================================================");

    if (checkArgs && checkArgs.length) {
        fluid.log(fluid.logLevel.WARN, " fluid-lint-all: Running the following checks:");
        fluid.each(checkArgs, function (singleArgument) {
            fluid.log(fluid.logLevel.WARN, " - " + singleArgument);
        });
    }
    else {
        fluid.log(fluid.logLevel.WARN, "fluid-lint-all: Running all checks.");
    }

    var stagedOnly = fluid.get(argsOptions, "stagedOnly");
    var changedFiles = stagedOnly ? fluid.lintAll.getStagedFiles(that.options.config.rootPath) : [];

    // This is checked in the integration tests, which cannot collect coverage data.
    /* istanbul ignore if */
    if (stagedOnly) {
        fluid.log(fluid.logLevel.WARN, " (Scanning only files with uncommitted changes.)");
    }

    fluid.log(fluid.logLevel.WARN, "======================================================");
    fluid.log(fluid.logLevel.WARN);

    // This is checked in the integration tests, which cannot collect coverage data.
    /* istanbul ignore if */
    if (stagedOnly && !changedFiles.length) {
        fluid.log(fluid.logLevel.WARN, "No files have been changed, skipping all checks...");
        fluid.log(fluid.logLevel.WARN);

        allChecksPromise.resolve();
        return allChecksPromise;
    }

    if (argsOptions.showMergedConfig) {
        var currentLogObjectRenderChars = fluid.logObjectRenderChars;
        fluid.logObjectRenderChars = 100000;
        fluid.log(fluid.logLevel.WARN, "Merged Configuration:");
        fluid.log(fluid.logLevel.WARN, JSON.stringify(that.options.config, null, 2));
        fluid.logObjectRenderChars = currentLogObjectRenderChars;
    }

    fluid.visitComponentChildren(that, function (childComponent) {
        if (fluid.componentHasGrade(childComponent, "fluid.lintAll.check")) {
            var checkPromise = childComponent.runChecks(checkArgs, changedFiles);
            checkPromises.push(checkPromise);
        }
    }, { flat: true });

    var allChecksSequence = fluid.promise.sequence(checkPromises);

    allChecksSequence.then(function (checkResultsArray) {
        fluid.each(fluid.flatten(checkResultsArray), function (checkResults) {
            if (checkResults.checked) {
                fluid.set(overallResults, checkResults.key, fluid.filterKeys(checkResults, ["key"], true));

                overallResults.valid   += checkResults.valid;
                overallResults.invalid += checkResults.invalid;
                overallResults.checked += checkResults.checked;
            }
        });

        if (overallResults.checked) {
            // Output a summary of the results, including all observed errors.
            fluid.lintAll.logger.outputSummary(overallResults, argsOptions);

            if (overallResults.invalid > 0) {
                allChecksPromise.reject(new Error("One or more linting checks did not pass."));
            }
            else {
                allChecksPromise.resolve(overallResults);
            }
        }
        else {
            allChecksPromise.reject(new Error("ERROR: No files checked, please review your configuration and command line arguments."));
        }
    }, allChecksPromise.reject); // TODO: Consider making this more forgiving.
    return allChecksPromise;
};

fluid.lintAll.getStagedFiles = function (pathToCheck) {
    var changedFiles = [];
    var sanitisedRootPath = fluid.glob.sanitisePath(pathToCheck);

    try {
        // https://stackoverflow.com/questions/33610682/git-list-of-staged-files
        var output = child_process.execSync("git diff --cached --name-only ", {
            cwd: pathToCheck,
            encoding: "utf-8"
        });

        var filePaths = output.trimStart().split("\n");

        fluid.each(filePaths.slice(0, -1), function (filePath) {
            changedFiles.push(sanitisedRootPath + "/" + filePath);
        });
    }
    catch (error) {
        fluid.log(error.stderr || error);
    }

    return changedFiles;
};
