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
const distance = (p1, p2) => p1.reduce((acc, v, i) => acc + (v - p2[i]) ** 2, 0); //Euclidean distance formula, sans sqrt()
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
    const output = new INT16(uniqueLength, length);
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
    #data;
    constructor(pvt, axis, setL, setR, length) {
        this.pivot = pvt;
        this.axis = axis;
        this.setL = setL;
        this.setR = setR;
        this.mins = new Int16Array(length);
        this.maxs = new Int16Array(length);
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
export class KDTree {
    #data;
    #length;
    #tree;
    #indexes;
    constructor(data) { this.#init(data) };
    get data() {
        try { return Array.from(this.#indexes).map(i => this.#data.index(i)) }
        catch { throw new Error("No data") }
    }
    get tree() {
        return JSON.stringify(this.#tree);
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
        const mins = new Array(this.#data.point(0));
        for (const index in this.#indexes) {
            for (let i = 0; i < this.#length; i++) {
                const axis = this.#data.index(index, i);
                const max = maxes[i];
                const min = mins[i];
                if (axis > max || max === null) maxes[i] = axis;
                else if (axis < min || min === null) mins[i] = axis;
            }
        }
        this.#tree = this.#assemble(this.#indexes.slice(), 0, this.#indexes.length, 0, null, null); //future max min
    }
    #assemble(set, start, end, axis, maxes, mins) {
        if ((end - start) === this.#data.length) console.log("first!")
        if (set instanceof Uint32Array && (end - start) < 8) return set.slice(start, end);
        const NAxis = (axis + 1) % this.#length;
        const mid = ((end - start) >> 1) + start;
        quickselect(set, start, end, mid, axis, this.#data);
        const PIDX = set[mid];
        const setL = this.#assemble(set, start, mid, NAxis, null, null);
        const setR = this.#assemble(set, mid + 1, end, NAxis, null, null);
        return new Branch(PIDX, axis, setL, setR, this.#length)
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
    search(q, branch = this.#tree, bestL, bestP) {
        if (!this.#tree) throw new Error("No tree");
        if (branch instanceof Uint32Array) {
            return ["a", "b", "C"]
        }
        const pivot = this.#data.index(branch.pivot);
        const axis = branch.axis;
        const side = q[axis] < pivot[axis] ? branch.setL : branch.setR;
        const result = this.search(q, side);
        return result;
    }
    #closest(list, q) {
        let [bD, bP] = [Infinity, null];
        for (let i = 0; i < list.length; i++) {
            const point = this.#data.index(list[i]);
            const D = distance(point, q);
            if (D < bD) [bD, bP] = [D, point];
        }
        return [bD, bP];
    } //finally brute force the remaining point cloud
}