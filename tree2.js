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
    let buffer = new Uint8Array(flat.buffer);
    for (let i = 0; i < flat.length; i += length) {
        const byteStart = i * 4;
        const byteEnd = byteStart + length * 4;
        const point = buffer.subarray(byteStart, byteEnd);
        const key = h32(point);
        const bucket = map.get(key);
        if (!bucket) map.set(key, [byteStart]);
        else if (bucket) {
            let exists = false;
            outer: for (let b = 0; b < bucket.length; b++) {
                const offset = bucket[b];
                const innerPoint = buffer.subarray(offset, offset + (length * 4));
                for (let i = 0; i < innerPoint.length; i++) {
                    if (innerPoint[i] !== point[i]) continue outer;
                }
                exists = true;
                break outer;
            }
            if (!exists) bucket.push(byteStart);
        }
    }

    const flatmap = Array.from(map.values()).flat();
    const final = new Float32Array(flatmap.length * length);
    for (let i = 0; i < final.length; i += length) {
        alert(i)
        const offset = flatmap[i / length];
        for (let j = 0; j < length; j++) {
            final[i + j] = flat[offset / length + j];
        }
    }
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