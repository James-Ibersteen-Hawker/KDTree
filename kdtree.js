const overflow = [-32768, 32767];
const distance = (p1, p2) => p1.reduce((acc, v, i) => acc + (v - p2[i]) ** 2, 0);
function fold() {

}
function dedupe(data) {
    if (!data) throw new Error("No data");
    const storage = new Int16Array(data.flat());
    const map = new Map();
    const length = data[0].length;
    for (let i = 0; i < data.length; i++) {
        const pt = data[i];
        for (const num of pt) {
            if (!Number.isInteger(num)) throw new Error(`${num} is not an integer`);
            if (num < overflow[0] || num > overflow[1])
                throw new Error(`${num} exceeds bounds of ${overflow.join("-")}`)
        }
        const key = fold(pt);
        if (!map.has(key)) map.set(key, [pt])
        else if (map.has(key)) {
            const bucket = map.get(key);
            const exists = bucket.some((item) => item.every((x, i) => x === pt[i]));
            if (!exists) bucket.push(pt);
        }
    }
    if (map.size === 0) throw new Error(`Error in dedupe, map = ${map}`)
    return new INT16(Array.from(map.values()).flat(), data[0].length)
}
class Branch {
    constructor(pivot, axis, boundsL, boundsR, setL, setR) {
        this.pivot = pivot;
        this.axis = axis;
        this.setL = setL;
        this.setR = setR;
        this.boundsL = boundsL;
        this.boundsR = boundsR;
        this.mins = null;
        this.maxs = null;
    }
    calcBounds(length) {
        this.mins = new Int16Array(length);
        this.maxs = new Int16Array(length);
    }
}
class INT16 extends Int16Array {
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
export class KDTree {
    #data;
    #length;
    #tree;
    #indexes;
    constructor(data) {
        // this.#init(data)
    };
    get data() {
        try {
            return Array.from(this.#indexes).map(i => this.#data.index(i))
        } catch {
            throw new Error("No data")
        }
    }
    #init(data) {
        if (!data || !Array.isArray(data) || data.length === 0) throw new Error("Invalid Input")
        this.#length = data[0]?.length;
        if (!this.#length) throw new Error("Invalid length");
        if (!data.every(e => Array.isArray(e) && e.length === this.#length)) throw new Error("Inconsistent lengths");
        this.#data = dedupe(data);
        // this.#indexes = Uint32Array.from(Array.from({ length: this.#data.length }, (_, i) => i));
        // this.#tree = this.#assemble(this.#indexes.slice(), 0);
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
        return new Branch(PIDX, axis, boundsL, boundsR, setL, setR)
    }
    clear() {
        this.#data = null;
        this.#tree = null;
        this.#length = null;
        this.#indexes = null;
        return this;
    }
    newSet(data) {
        this.clear().#init(data);
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
        let [bD, bP] = [Infinity, null];
        for (let i = 0; i < list.length; i++) {
            const point = this.#data.index(list[i]);
            const D = distance(point, q);
            if (D < bD) [bD, bP] = [D, point];
        }
        return [bD, bP];
    }
}