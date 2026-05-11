import { data } from "./data.js"
const data2 = [
    [1,2,3],
    [3,4,5]
]
class Ntree extends Array {
    constructor(data) {
        if (!data.every(e => e.every(Number.isInteger))) throw new Error("Invalid input!")
        super(...data);
        this._data = this.convert(data);
    }
    set set(data) {
        this.length = 0;
        this.push(...data);
        this._data = this.convert(data);
    }
    convert(data) {
        const payload = [...new Map(data.map(e => [JSON.stringify(e), e])).values()];
        const l = payload[0].length;
        if (!payload.every(e => e.length === l)) throw new Error("Inequal lengths");
        const basis = payload.flat();
        const modded = new Uint8Array(basis * 2);
        for (let i = 0, j = 0; i < basis.length; i++, j+= 2) {
            const current = basis[i];
            //move 1 in basis, and move 2 in modded
        }
        return payload;
    }
    static get [Symbol.species]() {
        return Array;
    }
}
const test = new Ntree(data);
alert(test)