"use strict";
/*
kdtree

this module provides:
- fast nearest-neighbor search
- large dataset support

this assumes:
- integers only
- within defined limits
- all points are the same length K
*/
const max32bit = 4294967296; //maximum number of inputs on the dataset
const overflow = [-32768, 32767]; //maximum input number in any point
const distance = (p1, p2) => {
    let d = 0;
    for (let i = 0; i < p1.length; i++) d += (p1[i] - p2[i]) ** 2;
    return d;
}; //Euclidean distance formula, sans sqrt()
function fold(view) {
    let hash = 2166136261;
    const fnv1aPrime = 16777619;
    for (const num of view) {
        //low byte
        hash ^= num & 0xff;
        hash = Math.imul(hash, fnv1aPrime);
        //high byte
        hash ^= (num >> 8) & 0xff;
        hash = Math.imul(hash, fnv1aPrime);
    }
    return hash >>> 0;
} //FNV-1a hashing for faster dedupe, fast and efficient enough for this need
function dedupe(data) {
    if (!Array.isArray(data) || data.length === 0) throw new Error("No data");
    const map = new Map();
    const length = data[0].length;
    const min = overflow[0]
    const max = overflow[1];
    for (const pt of data) {
        for (let n = 0; n < length; n++) {
            const num = pt[n];
            if (!Number.isInteger(num)) throw new Error(`${num} is not an integer`);
            if (num < min || num > max) throw new Error(`${num} exceeds bounds of ${min}-${max}`)
        }
        const key = fold(pt); //hash the point for less deduping
        const bucket = map.get(key);
        if (!bucket) {
            map.set(key, [pt]);
            continue;
        } //collision detection and solving, with a deep comparison
        let exists = false;
        outer: for (const entry of bucket) {
            for (let d = 0; d < length; d++) {
                if (entry[d] !== pt[d]) continue outer;
            }
            exists = true;
            break;
        }
        if (!exists) bucket.push(pt);
    }
    if (map.size === 0) throw new Error(`Error in dedupe, map = ${map}`)
    let uniqueLength = 0;
    let offset = 0;
    const buckets = Array.from(map.values())
    for (const bucket of buckets) uniqueLength += bucket.length;
    const output = new INT16(uniqueLength * length, length);
    for (const bucket of buckets) {
        for (const pt of bucket) for (let d = 0; d < length; d++) output[offset++] = pt[d];
    }
    return output;
} //map-based deduplication, uses FNV-1a hash to dedupe datasets
const swap = (arr, a, b) => [arr[a], arr[b]] = [arr[b], arr[a]];
function partition(indices, start, end, pivotIndex, axis, data) {
    const pivotValue = data.index(indices[pivotIndex], axis);
    swap(indices, pivotIndex, end - 1);
    let store = start;
    for (let i = start; i < end - 1; i++) {
        if (data.index(indices[i], axis) < pivotValue) swap(indices, store++, i);
    }
    swap(indices, store, end - 1);
    return store;
}
function quickselect(indices, start, end, k, axis, data) {
    while (true) {
        if (end - start <= 1) return;
        let pivotIndex = start + ((end - start) >> 1);
        pivotIndex = partition(indices, start, end, pivotIndex, axis, data);
        if (k === pivotIndex) return;
        else if (k < pivotIndex) end = pivotIndex;
        else if (k > pivotIndex) start = pivotIndex + 1;
    }
} //the function that partitions the dataset about the pivot
class Branch {
    constructor(pvt, axis, setL, setR, length, mins, maxes) {
        this.pivot = pvt;
        this.axis = axis;
        this.setL = setL;
        this.setR = setR;
        this.mins = mins;
        this.maxes = maxes;
    }
    static get [Symbol.species]() {
        return Branch;
    }
}
/*
INT16

It is an extension of the native Int16Array
- It has the property of unit length
- It is a flattened packed version of the input vectors
- It offers a way to extract whole points and partial scalar point components
- Length is overidden to give it "array-like" logical length as per contents

It only supports the initial Int16Array parameter, not the others

Otherwise it works like an enhanced Int16Array
*/
class INT16 extends Int16Array {
    #UL;
    static get [Symbol.species]() {
        return Int16Array;
    }
    constructor(data, unitLength) {
        super(data);
        this.#UL = unitLength;
    }
    index(i, axis) {
        return this[i * this.#UL + axis];
    } //scalar point access
    point(i, copy = false) {
        const start = i * this.#UL;
        const end = start + this.#UL;
        const view = this.subarray(start, end);
        return copy ? Array.from(view) : view;
    } // vector point reference vs copy access
    get length() {
        return super.length / this.#UL;
    } //"logical" length vs true length
}
/*
A custom wrapper for the leaves to preserve Uint32 but with extra properties
*/
class UINT32 extends Uint32Array {
    constructor(...params) {
        super(...params);
        this.maxes = null;
        this.mins = null;
    }
    minsmaxes() {
        // const maxes = Array.from(this.#data.point(0));
        // const mins = Array.from(this.#data.point(0));
        // for (const index of this.#indexes) {
        //     for (let i = 0; i < this.#length; i++) {
        //         const axis = this.#data.index(index, i);
        //         const max = maxes[i];
        //         const min = mins[i];
        //         if (axis > max) maxes[i] = axis;
        //         else if (axis < min) mins[i] = axis;
        //     }
        // }
    }
    static get [Symbol.species]() {
        return Uint32Array;
    }
}
/*
custom low-level KD-tree with as much emphasis on efficiency as possible
Note the usage of almost exclusively typed arrays, and the quicksort
The aim is to be as memory-compact as possible for storage and usage purposes
*/
export class KDTree {
    #data;
    #length;
    #tree;
    #indexes;
    static #TYPE_LEAF = 0;
    static #TYPE_BRANCH = 1;
    parse(serialTree) {
        const sorted = serialTree.slice().sort((a, b) => a[0] - b[0]);
        const data = sorted[0];
        if (!data || data.length === 0) throw new Error("Invalid data");
        const length = data[1];
        this.#data = new INT16(data.slice(2), length); //step 1, I have reconstructed the dataset
        sorted.shift()
        const newTree = KDTree.#assembleTree(sorted, 0, length);
        this.#tree = newTree;
        this.#length = length;
        this.#indexes = Uint32Array.from(Array.from({ length: this.#data.length }, (_, i) => i));
        return newTree;
    }
    static #assembleTree(set, index, length) {
        if (!set[index]) throw new Error("No item");
        if (set[index][1] === KDTree.#TYPE_LEAF) {
            const maxes = set[index].subarray(-length);
            const mins = set[index].subarray(-length * 2, -length);
            const points = set[index].subarray(2, -length * 2);
            const node = new UINT32(points);
            node.maxes = maxes;
            node.mins = mins;
            return node;
        }
        else if (set[index][1] !== KDTree.#TYPE_BRANCH) throw new Error("Not a branch or leaf");
        const pivot = set[index][2];
        const axis = set[index][3];
        const mins = set[index].subarray(4, 4 + length);
        const maxes = set[index].subarray(4 + length, 4 + length * 2);
        const leftID = set[index][set[index].length - 2];
        const rightID = set[index][set[index].length - 1];
        const node = new Branch(pivot, axis, null, null, length, mins, maxes);
        node.setL = KDTree.#assembleTree(set, leftID, length);
        node.setR = KDTree.#assembleTree(set, rightID, length);
        return node;
    }
    serialize() {
        const flatTree = [];
        flatTree.push(new Float64Array([-1, this.#length, ...this.#data]))
        KDTree.#flatten(this.#tree, 0, flatTree)
        return flatTree;
    }
    static #flatten(branch, index, accumulator) { //index is the node ID
        if (branch instanceof UINT32) {
            const { mins, maxes } = branch;
            accumulator.push(Float64Array.from([index, KDTree.#TYPE_LEAF, ...branch, ...mins, ...maxes]))
            return index;
        } //if leaf, simply return the index it is at
        if (!(branch instanceof Branch)) throw new Error("Branch is invalid");
        //if it is a branch
        const { pivot, axis, mins, maxes, setL, setR } = branch;
        const leftStart = index + 1;
        const leftEnd = KDTree.#flatten(setL, leftStart, accumulator);
        const rightStart = leftEnd + 1;
        const rightLast = KDTree.#flatten(setR, rightStart, accumulator);
        accumulator.push(Float64Array.from([
            index, KDTree.#TYPE_BRANCH, pivot, axis, ...mins, ...maxes, leftStart, rightStart
        ]))
        return rightLast;
    }
    constructor(data) {
        if (data) this.#init(data);
    };
    get data() {
        try { return Array.from(this.#indexes).map(i => this.#data.point(i, true)) }
        catch { throw new Error("No data") }
    }
    #init(data) {
        if (data.length > max32bit) throw new Error("Too much data!");
        if (!data || !Array.isArray(data) || data.length === 0) throw new Error("Invalid Input")
        this.#length = data[0]?.length;
        if (!this.#length) throw new Error("Invalid length");
        if (!data.every(e => Array.isArray(e) && e.length === this.#length)) throw new Error("Inconsistent lengths");
        this.#data = dedupe(data);
        this.#indexes = Uint32Array.from(Array.from({ length: this.#data.length }, (_, i) => i));
        const maxes = Array.from(this.#data.point(0));
        const mins = Array.from(this.#data.point(0));
        for (const index of this.#indexes) {
            for (let i = 0; i < this.#length; i++) {
                const axis = this.#data.index(index, i);
                const max = maxes[i];
                const min = mins[i];
                if (axis > max) maxes[i] = axis;
                else if (axis < min) mins[i] = axis;
            }
        }
        this.#tree = this.#assemble(this.#indexes.slice(), 0, this.#indexes.length, 0, mins, maxes); //future max min
    }
    #assemble(set, start, end, axis, mins, maxes) {
        if (set instanceof Uint32Array && (end - start) < 8) {
            const data = new UINT32(set.slice(start, end));
            data.maxes = maxes;
            data.mins = mins;
            return data;
        }
        const NAxis = (axis + 1) % this.#length;
        const mid = ((end - start) >> 1) + start;
        quickselect(set, start, end, mid, axis, this.#data);
        const PIDX = set[mid];
        const lMaxes = maxes.slice();
        const rMins = mins.slice();
        rMins[axis] = this.#data.index(PIDX, axis);
        lMaxes[axis] = this.#data.index(PIDX, axis);
        const setL = this.#assemble(set, start, mid, NAxis, mins, lMaxes);
        const setR = this.#assemble(set, mid + 1, end, NAxis, rMins, maxes);
        return new Branch(PIDX, axis, setL, setR, this.#length, mins, maxes)
    } //uses quickselect to not duplicate the original array, and the Leaves are Uint32Arrays, not Branches
    clear() {
        this.#data = null;
        this.#tree = null;
        this.#length = null;
        this.#indexes = null;
        return this;
    } //empty the dataset
    newSet(data) {
        this.clear().#init(data);
        return this;
    } //clear, and then initialize with another dataset
    search(q, includeDist = false, branch = this.#tree) {
        if (!Array.isArray(q) || q.length !== this.#length) throw new Error(`Query ${q} is invalid`);
        if (!this.#tree) throw new Error("No tree");
        const result = this.#search(q, branch);
        if (includeDist) return [result[0], Array.from(result[1])];
        return Array.from(result[1]);
    }
    #search(q, branch) {
        if (branch instanceof UINT32) {
            const closest = this.#closest(branch, q);
            return closest;
        } //the leaf nodes are Uint32Arrays, not Branch{}
        const pivot = this.#data.point(branch.pivot);
        const axis = branch.axis;
        const goLeft = q[axis] < pivot[axis]
        const side = goLeft ? branch.setL : branch.setR;
        const other = goLeft ? branch.setR : branch.setL; //corresponding other dataset
        let [bD, bP] = this.#search(q, side);
        const pD = distance(q, pivot);
        if (pD < bD) [bD, bP] = [pD, pivot];
        if (!other) return [bD, bP]
        const otherD = this.#boundDistance(q, other.mins, other.maxes);
        if (otherD < bD) {
            const [oD, oP] = this.#search(q, other);
            if (oD < bD) [bD, bP] = [oD, oP];
        }
        return [bD, bP]
    }
    #boundDistance(q, mins, maxes) {
        let dist = 0;
        for (let i = 0; i < this.#length; i++) {
            let d = 0;
            if (q[i] < mins[i]) d = mins[i] - q[i];
            else if (q[i] > maxes[i]) d = q[i] - maxes[i];
            dist += d * d;
        }
        return dist;
    }
    #closest(list, q) {
        let [bD, bP] = [Infinity, null];
        for (let i = 0; i < list.length; i++) {
            const point = this.#data.point(list[i]);
            const D = distance(point, q);
            if (D < bD) [bD, bP] = [D, point];
        }
        return [bD, bP];
    } //finally brute force the remaining point cloud
}

/*
next steps:
- leaf geometric nodes, not numerical
- optimise closest()

*/