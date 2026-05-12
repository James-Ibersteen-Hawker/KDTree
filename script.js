import { data } from "./data.js"
try {
class KDTree {
    #data;
    #length;
    #tree;
    #map;
    static #dedupe(data) {
        const set = new Set();
        const payload = [];
        for (const point of data) {
            const key = KDTree.encode(point);
            if (!set.has(key)) set.add(key), payload.push(point);
        }
        return payload;
    }
    static encode(point) { return point.join("|") }
    static distance = (p1, p2) => p1.reduce((acc, v, i) => acc + (v - p2[i])**2, 0);
    static Branch = class {
        constructor(pivot, axis, boundsL, boundsR, setL, setR) {
            this.pivot = pivot
            this.axis = axis;
            this.setL = setL;
            this.setR = setR;
            this.boundsL = boundsL;
            this.boundsR = boundsR;
        }
    }
    static INT32 = class extends Int32Array {
        constructor(data, unitLength) {
            super(data);
            this.UL = unitLength;
        }
        index(i) {
            const start = i * this.UL;
            const end = start + this.UL;
            if (end > this.length) throw new Error("Index exceeds bounds");
            const output = new Array(this.UL);
            for (let q = start; q < end; q++) output[q - start] = this[q];
            return output;
        }
    }
    constructor(data) { this.#init(data) };
    get data() { return this.#data.map(row => [...row]) }
    #init(data) {
        if (!data || !Array.isArray(data) || data.length === 0) throw new Error("Invalid Input")
        this.#length = data[0]?.length;
        if (!this.#length) throw new Error("Invalid length");
        if (!data.every(e => Array.isArray(e) && e.length === this.#length)) throw new Error("Inconsistent lengths");
        this.#data = KDTree.#dedupe(data);
        this.#buildMap(this.#data);
        this.#tree = this.#assemble([...this.#data], 0);
        document.getElementById("test").textContent = JSON.stringify(this.#tree)
    }
    #buildMap(data) {
        this.#map = new Map();
        for (let i = 0; i < data.length; i++) this.#map.set(KDTree.encode(data[i]), i)
    }
    #assemble(set, axis) {
        if (set.length < 8) return Uint32Array.from(set, e => this.#map.get(KDTree.encode(e)));
        const NAxis = (axis + 1) % this.#length;
        set.sort((a, b) => a[axis] - b[axis]);
        const mid = set.length >> 1;
        const pivot = set[mid];
        const boundsL = new Uint32Array([
            this.#map.get(KDTree.encode(set[0])),
            this.#map.get(KDTree.encode(set[mid - 1])),
        ]);
        const boundsR = new Uint32Array([
            this.#map.get(KDTree.encode(set[mid + 1])),
            this.#map.get(KDTree.encode(set[set.length - 1])),
        ]); //max is 4294967295;
        const PIDX = this.#map.get(KDTree.encode(pivot));
        const setR = this.#assemble(set.slice(mid + 1), NAxis);
        const setL = this.#assemble(set.slice(0, mid), NAxis);
        return new KDTree.Branch(PIDX, axis, boundsL, boundsR, setL, setR)
    }
    clear() {
        this.#data = null;
        this.#tree = null;
        this.#length = null;
        this.#map = null;
        return this;
    }
    newSet(data) {
        this.#init(data);
        return this;
    }
    search(q, branch = this.#tree, bestL, bestP) {
        if (!this.#tree) throw new Error("No tree");
        if (branch instanceof Uint32Array) {
            return this.#closest(branch, q);
        }
        const pivot = this.#data[branch.pivot];
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
const test = new KDTree(data);
const result = test.search([0,0,0])
alert(result)
} catch (e) {
    alert(e)
}