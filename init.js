import KDTree from "./kdtree.js";
const set = [
    [0,0,0],
    [1,1,1],
    [2,2,2],
    [3,3,3]
]
const q = [300 * Math.E, 300.4323834, Math.PI];

const tree = await KDTree.initFrom(set);
const result = tree.search(q, {
    includeDistance: true
});
console.log(q, result)

console.log(tree.properties)