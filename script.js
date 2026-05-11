import { data } from "./data.js"
const data2 = [
    [1,2,3],
    [3,4,5]
]
class Ntree extends Array {
    static #CUTOFF = 65535;
    static UINT8 = class extends Uint8Array {
        #l;
        constructor(buffer, l) {
            super(buffer);
            this.#l = l;
        }
        get(index) {
            for (let i = index * 2; i < super.length; i += (this.#l * 2)) {
                const view = this.slice(i, i + (this.#l * 2))
                for (let d = 0; d < view.length; d += 2);
                // const num = this[i];
                // const mul = this[i + 1];
                // if (num === null || mul === null) throw new Error(`${index} doesn't exist in ${this}`);
                //this.length vs super.length
                //this needs to return a [x,y,z,.......]

            }
        }
        get trueLength() {
            return (super.length / 2);
        }
        get length() {
            return this.trueLength / this.#l;
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
        const payload = [...new Map(data.map(e => [JSON.stringify(e), e])).values()];
        const l = payload[0].length;
        if (!payload.every(e => e.length === l)) throw new Error("Inequal lengths");
        const basis = payload.flat();
        const modded = new Ntree.UINT8(basis.length * 2, l)
        for (let i = 0, j = 0; i < basis.length; i++, j+= 2) {
            if (basis[i] > Ntree.#CUTOFF) throw new Error(`${basis[i]} is greater than ${Ntree.#CUTOFF}`)
            const [low, high] = [basis[i] & 255, basis[i] >> 8]
            modded[j] = low;
            modded[j + 1] = high;
        }
        return modded;
    }
    search(q, set = this.#data) {
        
    }
    static get [Symbol.species]() {
        return Array;
    }
}

const test = new Ntree(data);
test.search([0,0,0])