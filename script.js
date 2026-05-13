import { data } from "./data.js"
try {
    class KDTree {
        #data;
        #length;
        #tree;
        #indexes;
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
        static #dedupe(data) {
            const set = new Set();
            const payload = [];
            for (const point of data) {
                for (const num of point) {
                    if (!Number.isInteger(num)) throw new Error("Not an integer!")
                    if (num < KDTree.overflow[0] || num > KDTree.overflow[1]) throw new Error("Exceeds bounds")
                }
                const key = KDTree.encode(point);
                if (!set.has(key)) set.add(key), payload.push(point);
            }
            return new KDTree.INT16(payload.flat(), payload[0].length);
        }
        static encode(point) { return point.join("|") }
        static distance = (p1, p2) => p1.reduce((acc, v, i) => acc + (v - p2[i]) ** 2, 0);
        constructor(data) { this.#init(data) };
        get data() { return Array.from(this.#indexes).map(i => [...this.#data.index(i)]) }
        #init(data) {
            if (!data || !Array.isArray(data) || data.length === 0) throw new Error("Invalid Input")
            this.#length = data[0]?.length;
            if (!this.#length) throw new Error("Invalid length");
            if (!data.every(e => Array.isArray(e) && e.length === this.#length)) throw new Error("Inconsistent lengths");
            this.#data = KDTree.#dedupe(data);
            this.#indexes = Uint32Array.from(Array.from({length: this.#data.length}, (_, i) => i));
            this.#tree = this.#assemble(this.#indexes.slice(), 0);
            document.getElementById("test").textContent = JSON.stringify(this.#tree)
        }
        #assemble(set, axis) {
            if (set.length < 8) return set;
            const NAxis = (axis + 1) % this.#length;
            const sorted = Array.from(set).sort((a, b) => this.#data.index(a)[axis] - this.#data.index(b)[axis]);
            const mid = sorted.length >> 1;
            const boundsL = new Uint32Array([sorted[0], sorted[mid - 1]]);
            const boundsR = new Uint32Array([sorted[mid + 1], sorted[sorted.length - 1]]); //max is 4294967295;
            const PIDX = sorted[mid];
            const setR = this.#assemble(sorted.slice(mid + 1), NAxis);
            const setL = this.#assemble(sorted.slice(0, mid), NAxis);
            return new KDTree.Branch(PIDX, axis, boundsL, boundsR, setL, setR)
        }
        clear() {
            this.#data = null;
            this.#tree = null;
            this.#length = null;
            this.#indexes = null;
            return this;
        }
        newSet(data) {
            this.clear();
            this.#init(data);
            return this;
        }
        search(q, branch = this.#tree, bestL, bestP) {
            if (!this.#tree) throw new Error("No tree");
            if (branch instanceof Uint32Array) {
                return ["a", "b", "C"]
            }
            const pivot = this.#data.index(branch.pivot);
            alert(JSON.stringify(branch))
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
    const result = test.search([0, 0, 0])
    alert(result)
} catch (e) {
    alert(e)
}