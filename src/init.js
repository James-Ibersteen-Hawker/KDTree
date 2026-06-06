import KDTree from "./kdtree.js";
import BigSet from "./benchmark.js"
import _4Dset from "./points_4d.js"
import SmallSet from "./data.js"
import fs from "fs/promises";
import path from "path";
//////
let start = performance.now()
const newTree = await KDTree.initFrom(_4Dset);
let end = performance.now()
console.log(start, end)

const q = [0,0, 0, 0]; //query

// for (let i = 0; i < 100000; i++) newTree.search(q);
start = performance.now();
const result = newTree.search(q)
end = performance.now();

console.log(start, end);
console.log(q);
console.log(result);