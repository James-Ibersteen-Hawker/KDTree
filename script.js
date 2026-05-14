import { KDTree } from "./kdtree.js";
import { testSet } from "./data.js";

try {
    const tree = new KDTree(testSet);
    document.getElementById("test").textContent = tree.tree;
} catch (err) {
    alert(err)
}