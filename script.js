import { KDTree } from "./kdtree.js";
import { testSet } from "./data.js";

try {
    const tree = new KDTree(testSet);
    alert(tree)
} catch (err) {
    alert(err)
}