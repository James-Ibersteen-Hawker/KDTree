import { data } from "./data.js"
export class Ntree extends Array {
    static #CUTOFF = 65535;
    static UINT8 = class extends Uint8Array {
        #l;
        constructor(buffer, l) {
            super(buffer);
            this.#l = l;
        }
        get(index) {
            const unit = this.#l * 2;
            const start = index * unit;
            const end = start + unit;
            if (end > super.length || start < 0) return null;
            const result = new Array(this.#l);
            for (let d = start, r = 0; d < end; d += 2, r++) {
                result[r] = this[d] + (this[d + 1] << 8);
            }
            return result;
        }
        get length() {
            return (super.length / 2) / this.#l;
        }
        static get [Symbol.species]() {
            return Uint8Array;
        }
    }
    #data;
    constructor(data) {
        if (!data.every(e => e.every(Number.isInteger))) throw new Error("Invalid input!")
        super(...data);
        this.#data = this.#convert(data);
    }
    set set(data) {
        this.length = 0;
        this.push(...data);
        this.#data = this.#convert(data);
    }
    #convert(data) {
        const map = new Map();
        for (const row of data) map.set(row.join(","), row);
        const payload = [...map.values()]
        const l = payload[0].length;
        if (!payload.every(e => e.length === l)) throw new Error("Inequal lengths");
        const basis = payload.flat();
        const modded = new Ntree.UINT8(basis.length * 2, l)
        for (let i = 0, j = 0; i < basis.length; i++, j += 2) {
            if (basis[i] > Ntree.#CUTOFF) throw new Error(`${basis[i]} is greater than ${Ntree.#CUTOFF}`)
            const [low, high] = [basis[i] & 255, basis[i] >> 8]
            modded[j] = low;
            modded[j + 1] = high;
        }
        return modded;
    }
    static get [Symbol.species]() {
        return Array;
    }
    search(q, set = this.#data) {
        const data = [];
        for (let i = 0; i < set.length; i++) data.push(set.get(i))
        console.log(data)
        if (set.length === 1) return set.get(0)
        const start = set.get(0);
        if (q.length !== start.length) throw new Error("Inequal lengths");
        const end = set.get(set.length - 1);
        const qplace = new Array(q.length);
        const mids = new Array(q.length);
        for (let i = 0; i < start.length; i++) {
            mids[i] = (start[i] + end[i]) / 2;
            qplace[i] = q[i] < mids[i] ? 0 : 1;
        }
        const slice = [];
        iterator: for (let i = 0; i < set.length; i++) {
            const cur = set.get(i);
            const place = new Array(cur.length);
            for (let d = 0; d < cur.length; d++) {
                if (cur[d] > mids[d]) place[d] = 1;
                else place[d] = 0;
                if (qplace[d] !== place[d]) continue iterator;
            }
            slice.push(cur);
        }
        if (slice.length === 0) {
            let [best, bestp] = [Infinity, null];
            for (let i = 0; i < set.length; i++) {
                const dist = this.#distance(set.get(i), q);
                if (dist < best) [best, bestp] = [dist, set.get(i)];
            }
            return bestp;
        }
        return this.search(q, this.#convert(slice));
    }
    #distance(p1, p2) {
        return Math.sqrt(p1.reduce((acc, v, i) => acc + (v - p2[i]) ** 2, 0));
    }
}

const test = new Ntree(data);
const result = test.search([395, 358, 317])
console.log(result);
alert(result)