"use strict";
/*
Plan:
- Use Float32Arrays
- Use contiguous storage, without a tree-based structure
- Partition linearly instead of vertically
- Keep the array-of-indexes approach and the flatpacked storage
- Child bounds are in parallel arrays, similarly processed to the flatpacked storage
*/
import xxhash from "https://unpkg.com/xxhash-wasm/esm/xxhash-wasm.js";
const hash = xxhash();
async function validate(data, length) {
    const { h32 } = await hash;
    const map = new Map();
    let flat = new Float32Array(data.length * length);
    for (let i = 0; i < data.length; i++) {
        for (let k = 0; k < data[i].length; k++) {
            flat[i * length + k] = data[i][k];
        }
    }
    for (let i = 0; i < flat.length; i += length) {
        const point = flat.subarray(i, i + length);
        const key = h32(point);
        const bucket = map.get(key);
        if (!bucket) map.set(key, [point]);
        else {
            let exists = false;
            outer: for (let i = 0; i < bucket.length; i++) {
                for (let k = 0; k < bucket[i].length; k++) {
                    if (point[k] !== bucket[i][k]) continue outer;
                }
                exists = true;
                break outer;
            }
            if (!exists) bucket.push(point);
        }
    }
    const objArray = map.values().toArray();
    let uniqueItems = 0;
    for (let i = 0; i < objArray.length; i++) uniqueItems += objArray[i].length;
    const final = new Float32Array(uniqueItems * length);
    let offset = 0;
    for (let i = 0; i < objArray.length; i++) {
        const bucket = objArray[i];
        for (let b = 0; b < bucket.length; b++) {
            for (let k = 0; k < bucket[b].length; k++) {
                const index = offset + k;
                final[index] = bucket[b][k];
            }
            offset += length;
        }
    }
    flat = null;
    return final;
}
export default class KDTree2 {
    #data;
    #indexes;
    #length;
    constructor(data) {
        this.ready = this.#init(data);
    }
    async #init(data) {
        if (!data[0]) throw new Error("First element doesn't exist");
        this.#length = data[0]?.length;
        if (this.#length == null) throw new Error("Invalid starting length");
        this.#data = await validate(data, this.#length);
        //now it is all the proper length
    }
}