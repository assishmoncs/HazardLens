import test from "node:test";
import assert from "node:assert/strict";
import { band, confidenceForModel, DEFAULT_MODEL_UNCERTAINTY } from "../src/models/uncertainty.js";
import { MODEL_PROVENANCE } from "../src/models/consequences.js";
import { validationSummary } from "../src/validation/benchmarks.js";

test("uncertainty bands stay ordered and bounded",()=>{
 const result=band(100,.2);
 assert.equal(result.estimate,100);
 assert.equal(result.lower,80);
 assert.equal(result.upper,120);
 assert.ok(result.lower<=result.estimate && result.estimate<=result.upper);
});

test("model confidence is explicit rather than pretending calibration",()=>{
 assert.equal(confidenceForModel(MODEL_PROVENANCE["thermal-point-source-v1"],0),"medium");
 assert.equal(confidenceForModel(MODEL_PROVENANCE["thermal-point-source-v1"],.9),"high");
 assert.equal(DEFAULT_MODEL_UNCERTAINTY.length,5);
});

test("validation benchmark suite passes invariant checks",()=>{
 const summary=validationSummary();
 assert.ok(summary.total>=5);
 assert.equal(summary.failed,0);
 assert.equal(summary.empiricalValidation,false);
});
