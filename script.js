import { data } from "./data.js"
try {
class KDTree {
    #data;
    #length;
    #tree;
    static #dedupe(data) {
        const set = new Set();
        const payload = [];
        for (const row of data) {
            const key = row.join(",");
            if (!set.has(key)) {
                set.add(key);
                payload.push(row);
            }
        }
        return payload;
    }
    static distance(p1, p2) {
        return p1.reduce((acc, v, i) => acc + (v - p2[i])**2, 0)
    }
    static Branch = class {
        constructor(pivot, axis) {
            this.pivot = pivot
            this.axis = axis;
            this.setR = null;
            this.setL = null;
            this.boundsR = null;
            this.boundsL = null;
        }
    }
    constructor(data) {
        this.#init(data);
    }
    get data() { return this.#data.map(row => [...row]) }
    #init(data) {
        if (!data || !Array.isArray(data) || data.length === 0) throw new Error("Invalid Input")
        this.#length = data[0]?.length;
        if (!this.#length) throw new Error("Invalid length");
        if (!data.every(e => Array.isArray(e) && e.length === this.#length)) {
            throw new Error("Inconsistent lengths");
        }
        this.#data = KDTree.#dedupe(data);
        this.#tree = this.#assemble(this.#data, 0);
    }
    #assemble(set, axis) {
        if (set.length < 5) return set;
        const newAxis = (axis + 1) % this.#length;
        const sorted = [...set].sort((a, b) => a[axis] - b[axis]);
        const mid = Math.floor((sorted.length) / 2);
        const pivot = sorted[mid];
        const branch = new KDTree.Branch(pivot, axis)
        branch.boundsR = [sorted[mid + 1], sorted.at(-1)];
        branch.boundsL = [sorted[0], sorted[mid - 1]];
        const setR = this.#assemble(sorted.slice(mid + 1), newAxis);
        const setL = this.#assemble(sorted.slice(0, mid), newAxis);
        branch.setR = setR;
        branch.setL = setL;
        return branch;
    }
    clear() {
        this.#data = null;
        this.#tree = null;
        this.#length = null;
        return this;
    }
    newSet(data) {
        this.#init(data);
        return this;
    }
    search(q, set = this.#tree) {
        if (!this.#tree) throw new Error("No tree");
    }
}
const test = new KDTree(data);
} catch (e) {
    alert(e)
}