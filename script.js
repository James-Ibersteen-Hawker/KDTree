import { testSet } from "./data.js";
import initXXH from "https://esm.sh/xxhash-wasm";
export const xxhPromise = initXXH();
export class KDTree {
    #data;
    #length;
    #tree;
    #indexes;
    static #hasher;
    static overflow = [-32768, 32767];
    static Branch = class {
        constructor(pivot, axis, boundsL, boundsR, setL, setR) {
            this.pivot = pivot;
            this.axis = axis;
            this.setL = setL;
            this.setR = setR;
            this.boundsL = boundsL;
            this.boundsR = boundsR;
        }
    }
    static INT16 = class extends Int16Array {
        #UL;
        constructor(data, unitLength) {
            super(data);
            this.#UL = unitLength;
        }
        index(i) {
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
    static async #initHasher() {
        if (!this.#hasher) {
            const { h32 } = await xxhPromise;
            this.#hasher = h32;
        }
        return this.#hasher;
    }
    static async #dedupe(data) {
        const h32 = await KDTree.#initHasher();
        const storage = new Int16Array(data.flat());
        const map = new Map();
        const payload = [];
        const length = data[0].length;
        for (let i = 0; i < data.length; i++) {
            const point = data[i];
            for (const num of point) {
                if (!Number.isInteger(num)) throw new Error("Not an integer!")
                if (num < KDTree.overflow[0] || num > KDTree.overflow[1]) throw new Error("Exceeds bounds")
            }
            const byteOffset = i * length * 2;
            const byteLength = length * 2;
            const view = new Uint8Array(storage.buffer, byteOffset, byteLength);
            const key = h32(view);
            if (!map.has(key)) map.set(key, point)
            else {
                //...tumbleweed...//
                
            }
        }
        if (map.size === 0) throw new Error("Error in dedupe");
        return new KDTree.INT16(Array.from(map.values()).flat(), data[0].length);
    }
    static distance = (p1, p2) => p1.reduce((acc, v, i) => acc + (v - p2[i]) ** 2, 0);
    static async create(data) {
        const t = new KDTree();
        await t.init(data)
        return t;
    }
    constructor() {
        this.#data = null;
        this.#length = null;
        this.#tree = null;
        this.#length = null;
    };
    get data() {
        try {
            return Array.from(this.#indexes).map(i => this.#data.index(i))
        } catch { throw new Error("No data") }
    }
    async init(data) {
        if (!data || !Array.isArray(data) || data.length === 0) throw new Error("Invalid Input")
        this.#length = data[0]?.length;
        if (!this.#length) throw new Error("Invalid length");
        if (!data.every(e => Array.isArray(e) && e.length === this.#length)) throw new Error("Inconsistent lengths");
        this.#data = await KDTree.#dedupe(data);
        this.#indexes = Uint32Array.from(Array.from({ length: this.#data.length }, (_, i) => i));
        this.#tree = this.#assemble(this.#indexes.slice(), 0);
        document.getElementById("test").textContent = JSON.stringify(this.#data) //tester
    }
    #assemble(set, axis) {
        if (set instanceof Uint32Array && set.length < 8) return set;
        const NAxis = (axis + 1) % this.#length;
        const sorted = Array.from(set).sort((a, b) => this.#data.index(a)[axis] - this.#data.index(b)[axis]);
        const mid = sorted.length >> 1;
        const boundsL = new Uint32Array([sorted[0], sorted[mid - 1]]);
        const boundsR = new Uint32Array([sorted[mid + 1], sorted[sorted.length - 1]]); //max is 4294967295;
        const PIDX = sorted[mid];
        const setR = this.#assemble(Uint32Array.from(sorted.slice(mid + 1)), NAxis);
        const setL = this.#assemble(Uint32Array.from(sorted.slice(0, mid)), NAxis);
        return new KDTree.Branch(PIDX, axis, boundsL, boundsR, setL, setR)
    }
    clear() {
        this.#data = null;
        this.#tree = null;
        this.#length = null;
        this.#indexes = null;
        return this;
    }
    async newSet(data) {
        this.clear();
        await this.init(data);
        return this;
    }
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
        let best = Infinity;
        let bestp = null;
        for (let i = 0; i < list.length; i++) {
            const point = this.#data[list[i]];
            const D = KDTree.distance(point, q);
            if (D < best) {
                best = D;
                bestp = point;
            }
        }
        return bestp;
    }
}
async function tester() {
    const test = await KDTree.create(testSet)
}
tester();