# KD-Tree Class
Takes an input array of N length of points of K dimension

Optimised with typed arrays and the INT16 custom Int16Array class

Resettable and clearable, with compact storage and opaque access to delicate internals
## How to use
import {KDTree} from "./kdtree.js"

init KDTree --> new KDTree(data[])<br>
search KDTree --> tree.search(pt, includeDistance);<br>
see dataset --> tree.data<br>
clear and reset with tree.clear() and tree.newSet(newData[])