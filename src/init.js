import KDTree from "./kdtree.js";
import d50000p from "./linear-benchmarks/50000p.js";
const q = [300 * Math.E, 300.4323834, Math.PI];

const tree = await KDTree.initFrom(d50000p);
const result = tree.search(q, {
    axis: [0, 2],
    includeDistance: true
});
console.log(q, result)