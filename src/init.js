import KDTree from "./kdtree.js";
// import BigSet from "./benchmark.js"
import _4Dset from "./points_4d.js"
// import SmallSet from "./data.js"
//////
const newTree = await KDTree.initFrom(_4Dset);
const q = [0,0, 0, 0];
const result = newTree.search(q, {
    includeDistance: true
})
console.log(q, result);

const serialTree = newTree.serialize("es6-typed");
const deserialTree = await KDTree.initFromSerial(serialTree, "es6-typed")
console.log(deserialTree.search(q, {includeDistance: true}))