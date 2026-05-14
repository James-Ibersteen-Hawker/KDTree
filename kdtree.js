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
        const key = fold(pt);
        const bucket = map.get(key);
        if (!bucket) {
            map.set(key, [pt]);
            continue;
        }
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
class Branch {
    #data;
    constructor(data, pvt, axis, setL, setR, length) {
        this.#data = data;
        this.pivot = pvt;
        this.axis = axis;
        this.setL = setL;
        this.setR = setR;
        this.mins = new Int16Array(length);
        this.maxs = new Int16Array(length);
    }
    calcBounds
}
class INT16 extends Int16Array {
    #UL;
    constructor(data, unitLength) {
        super(data);
        this.#UL = unitLength;
    }
    index(i, axis) {
        const start = i * this.#UL;
        const end = start + this.#UL;
        if (end > super.length) throw new Error(`Index ${i} exceeds bounds`);
        const output = new Array(this.#UL);
        for (let q = start; q < end; q++) output[q - start] = this[q];
        return output;
    }
    get length() {
        return super.length / this.#UL;
    }
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
    #init(data) {
        if (data.length > max32bit) throw new Error("Too much data!");
        if (!data || !Array.isArray(data) || data.length === 0) throw new Error("Invalid Input")
        this.#length = data[0]?.length;
        if (!this.#length) throw new Error("Invalid length");
        if (!data.every(e => Array.isArray(e) && e.length === this.#length)) throw new Error("Inconsistent lengths");
        this.#data = dedupe(data);
        this.#indexes = Uint32Array.from(Array.from({ length: this.#data.length }, (_, i) => i));
        this.#tree = this.#assemble(this.#indexes.slice(), 0);
        console.log(this.#tree)
    }
    #assemble(set, axis, maxes, mins) {
        if (set.length === this.#data.length) {
            console.log("first!")
        }
        if (set instanceof Uint32Array && set.length < 8) return set;
        const NAxis = (axis + 1) % this.#length;
        const sorted = Array.from(set).sort((a, b) => this.#data.index(a)[axis] - this.#data.index(b)[axis]);
        const mid = sorted.length >> 1;
        const PIDX = sorted[mid];
        const setR = this.#assemble(Uint32Array.from(sorted.slice(mid + 1)), NAxis);
        const setL = this.#assemble(Uint32Array.from(sorted.slice(0, mid)), NAxis);
        return new Branch(this.#data, PIDX, axis, setL, setR, this.#length)
    }
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