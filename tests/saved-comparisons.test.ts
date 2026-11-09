import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSavedComparisons, saveComparisons } from '../lib/saved-comparisons';
test('saved comparisons migrate legacy arrays and deduplicate canonical packages', () => {
 const data = [{packages:['vue','react'],days:7},{packages:['react','vue'],days:7}];
 assert.deepEqual(parseSavedComparisons(JSON.stringify(data)),[{packages:['react','vue'],days:7}]);
 let raw = '';
 saveComparisons({setItem: (_k,v) => {raw=v;}},data);
 assert.equal(JSON.parse(raw).version,1);
 assert.equal(parseSavedComparisons(raw).length,1);
});
test('invalid saved comparisons never become navigation targets', () => {
 for (const raw of ['null','{','{}','{"version":2,"items":[]}',JSON.stringify([{packages:['react','javascript:evil'],days:7},{packages:['react','vue'],days:8},{packages:['react'],days:7}])]) assert.deepEqual(parseSavedComparisons(raw),[]);
});
