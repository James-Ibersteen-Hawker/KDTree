import { data } from "./data.js"
const data2 = [
    [1,2,3],
    [3,4,5]
]
class Ntree extends Array {
    #cutoff;
    #data;
    constructor(data) {
        if (!data.every(e => e.every(Number.isInteger))) throw new Error("Invalid input!")
        super(...data);
        this.#cutoff = 65535;
        this.#data = this.#convert(data);
    }
    set set(data) {
        this.length = 0;
        this.push(...data);
        this.#data = this.#convert(data);
    }
    #convert(data) {
        const payload = [...new Map(data.map(e => [JSON.stringify(e), e])).values()];
        const l = payload[0].length;
        if (!payload.every(e => e.length === l)) throw new Error("Inequal lengths");
        const basis = payload.flat();
        const modded = new Uint8Array(basis.length * 2);
        for (let i = 0, j = 0; i < basis.length; i++, j+= 2) {
            if (basis[i] > this.#cutoff) throw new Error(`${basis[i]} is greater than ${this.#cutoff}`)
            const [low, high] = [basis[i] & 255, basis[i] >> 8]
            modded[j] = low;
            modded[j + 1] = high;
        }
        return modded;
    }
    static get [Symbol.species]() {
        return Array;
    }
}

const test = new Ntree(data);