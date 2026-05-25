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
    const indices = [];
    for (let i = 0; i < data.length; i++) {
        const point = data[i];
        const key = h32(point);
        const bucket = map.get(key);
        if (!bucket) {
            indices.push(i);
            map.set(key, [i])
        } else {
            let exists = false;
            outer: for (let q = 0; q < bucket.length; q++) {
                const bPoint = data[bucket[q]];
                for (let d = 0; d < length; d++) {
                    if (bPoint[d] !== point[d]) continue outer;
                } //if any is different, ignore. If all are equal, break.
                exists = true;
                break outer;
            }
            if (!exists) {
                indices.push(i)
                bucket.push(i);
            }
        }
    }
    const final = new Float32Array(indices.length * length)
    for (let i = 0; i < indices.length; i++) {
        const point = data[indices[i]];
        for (let d = 0; d < length; d++) final[i * length + d] = point[d];
    }
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