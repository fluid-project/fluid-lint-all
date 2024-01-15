"use strict";

var fluid = require("infusion");
const jqUnit = require("node-jqunit");

var child_process = require("child_process");
var fs = require("fs"); // Technically redundant as `fs-extra` takes over the built-in `fs`, but kept for clarity.
var fse = require("fs-extra");
var os = require("os");
var path = require("path");

// Required to pick up our path for fluid.module.resolvePath.
require("../../index.js");

// Require to pick up the static function we will be testing.
require("../../src/js/lint-all.js");

var tmpDirName = "fluid-lint-all-git-tests-" + Math.round((Math.random() * 1000000));
var tmpDirPath = path.resolve(os.tmpdir(), tmpDirName);

fluid.registerNamespace("fluid.tests.lintAll.git");

fluid.tests.lintAll.git.runCommandInTmpDir = function (command) {
    try {
        var output = child_process.execSync(command, {
            cwd: tmpDirPath,
            encoding: "utf-8"
        });
        return output;
    }
    catch (error) {
        fluid.fail(error.stderr | error);
    }
};

// Tests for the git integration that powers the `stagedOnly` option.
jqUnit.module("Git integration tests for `stagedOnly` option.", {
    // Note, our aged QUnit fork uses:
    // -`setup` instead of `beforeEach`
    // -`teardown` instead of `afterEach`
    setup: function () {
        fse.ensureDirSync(tmpDirPath);

        var gitFixturePath = fluid.module.resolvePath("%fluid-lint-all/tests/fixtures/git");
        fse.copySync(gitFixturePath, tmpDirPath);

        fluid.tests.lintAll.git.runCommandInTmpDir("git init");

        fluid.tests.lintAll.git.runCommandInTmpDir("git config user.name \"Test Runner\"");
        fluid.tests.lintAll.git.runCommandInTmpDir("git config user.email johndoe@example.com");

        fluid.tests.lintAll.git.runCommandInTmpDir("git add * .*.json");
        fluid.tests.lintAll.git.runCommandInTmpDir("git commit -m 'Added initial content to git.'");

        fluid.log("Created git test fixture at '" + tmpDirPath + "'");
    },
    teardown: function () {
        fse.removeSync(tmpDirPath);
    }
});

jqUnit.test("A non-git directory should not report changes.", function () {
    var changedFiles = fluid.lintAll.getStagedFiles(os.tmpdir());
    jqUnit.assertEquals("There should be no changed files.", 0, changedFiles.length);
});

jqUnit.test("An up-to-date repo should not report changes.", function () {
    var changedFiles = fluid.lintAll.getStagedFiles(tmpDirPath);
    jqUnit.assertEquals("There should be no changed files.", 0, changedFiles.length);
});

jqUnit.test("Unstaged added files should not be flagged.", function () {
    var newFilePath = path.resolve(tmpDirPath, "src/js/new.js");
    fs.writeFileSync(newFilePath, "\"use strict\;\n\n", { encoding: "utf8" });

    var stagedFiles = fluid.lintAll.getStagedFiles(tmpDirPath);
    jqUnit.assertEquals("Unstaged added files should not be flagged.", 0, stagedFiles.length);
});

jqUnit.test("Staged added files should be flagged.", function () {
    var newFilePath = path.resolve(tmpDirPath, "src/js/new.js");
    fs.writeFileSync(newFilePath, "\"use strict\;\n\n", { encoding: "utf8" });

    fluid.tests.lintAll.git.runCommandInTmpDir("git add src/js/new.js");

    var stagedFiles = fluid.lintAll.getStagedFiles(tmpDirPath);
    jqUnit.assertEquals("Staged added files should be flagged.", 1, stagedFiles.length);
});

jqUnit.test("Unstaged moved files should not be flagged.", function () {
    fluid.tests.lintAll.git.moveFile("src/js/nested/toMove.js", "src/js/moved.js");

    var stagedFiles = fluid.lintAll.getStagedFiles(tmpDirPath);
    jqUnit.assertEquals("Unstaged moved files should not be flagged.", 0, stagedFiles.length);
});

fluid.tests.lintAll.git.moveFile = function (oldPath, newPath) {
    var fullOldPath = path.resolve(tmpDirPath, oldPath);
    var fullNewPath = path.resolve(tmpDirPath, newPath);
    fse.moveSync(fullOldPath, fullNewPath);
};

jqUnit.test("Staged moved files should be flagged.", function () {
    fluid.tests.lintAll.git.moveFile("src/js/nested/toMove.js", "src/js/moved.js");

    fluid.tests.lintAll.git.runCommandInTmpDir("git add src/js/moved.js");

    var stagedFiles = fluid.lintAll.getStagedFiles(tmpDirPath);
    jqUnit.assertEquals("Staged moved files should be flagged.", 1, stagedFiles.length);
});

jqUnit.test("Unstaged moved and modified files should not be flagged.", function () {
    fluid.tests.lintAll.git.moveFile("src/js/nested/toMove.js", "src/js/moved.js");

    var fileToModifyPath = path.resolve(tmpDirPath, "src/js/moved.js");
    fs.appendFileSync(fileToModifyPath, "//More content\n\n", { encoding: "utf8"});

    var stagedFiles = fluid.lintAll.getStagedFiles(tmpDirPath);
    jqUnit.assertEquals("Unstaged moved and modified file should not be flagged.", 0, stagedFiles.length);
});

jqUnit.test("Staged moved and modified files should be flagged.", function () {
    fluid.tests.lintAll.git.moveFile("src/js/nested/toMove.js", "src/js/moved.js");

    var fileToModifyPath = path.resolve(tmpDirPath, "src/js/moved.js");
    fs.appendFileSync(fileToModifyPath, "//More content\n\n", { encoding: "utf8"});

    fluid.tests.lintAll.git.runCommandInTmpDir("git add src/js/moved.js");

    var stagedFiles = fluid.lintAll.getStagedFiles(tmpDirPath);
    jqUnit.assertEquals("Staged moved and modified files should be flagged.", 1, stagedFiles.length);
});

jqUnit.test("Unstaged modified files should not be flagged.", function () {
    var fileToModifyPath = path.resolve(tmpDirPath, "src/js/toModify.js");
    fs.appendFileSync(fileToModifyPath, "//More content\n\n", { encoding: "utf8"});

    var stagedFiles = fluid.lintAll.getStagedFiles(tmpDirPath);

    jqUnit.assertEquals("Unstaged modified files should not be flagged.", 0, stagedFiles.length);
});

jqUnit.test("Staged modified files should be flagged.", function () {
    var fileToModifyPath = path.resolve(tmpDirPath, "src/js/toModify.js");
    fs.appendFileSync(fileToModifyPath, "//More content\n\n", { encoding: "utf8"});

    fluid.tests.lintAll.git.runCommandInTmpDir("git add src/js/toModify.js");

    var stagedFiles = fluid.lintAll.getStagedFiles(tmpDirPath);

    jqUnit.assertEquals("Staged modified files should be flagged.", 1, stagedFiles.length);
});
