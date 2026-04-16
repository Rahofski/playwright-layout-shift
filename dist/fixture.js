"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expect = exports.test = void 0;
// ============================================================
// fixture.ts — Playwright Test fixture для визуальной стабильности
// ============================================================
const test_1 = require("@playwright/test");
const measure_1 = require("./measure");
const assertion_1 = require("./assertion");
/**
 * Расширенный Playwright Test с fixture `visualStability`.
 */
exports.test = test_1.test.extend({
    visualStability: async ({}, use) => {
        const helper = {
            measure: async (page, scenarioFn, options = {}) => {
                return (0, measure_1.measureVisualStability)(page, scenarioFn, options);
            },
            measureAndAssert: async (page, scenarioFn, options = {}) => {
                const result = await (0, measure_1.measureVisualStability)(page, scenarioFn, options);
                (0, assertion_1.assertVisualStability)(result, options);
                return result;
            },
        };
        await use(helper);
    },
});
var test_2 = require("@playwright/test");
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return test_2.expect; } });
//# sourceMappingURL=fixture.js.map