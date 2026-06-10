import KDTree from "./kdtree.js";
// import BigSet from "./benchmark.js"
import _4Dset from "./points_4d.js"
// import SmallSet from "./data.js"
//////
const newTree = await KDTree.initFrom(_4Dset);
const q = [250,15, 590, 256];
const result = newTree.search(q, {
    axis: [0, 2],
    includeDistance: true
})
console.log(q, result);

// const serialTree = newTree.serialize("es6-typed");
// const deserialTree = await KDTree.initFromSerial(serialTree)