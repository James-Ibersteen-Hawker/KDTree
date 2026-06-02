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
    #nodes;
    #leafsize;
    #nodeCount;
    #pivots;
    #maxes;
    #mins;
    #left;
    #right;
    #axis;
    static async initFrom(data) {
        const kdtree = new KDTree2();
        await kdtree.set(data);
        return kdtree;
    }
    constructor() {}
    async #init(data) {
        if (!data[0]) throw new Error("First element doesn't exist");
        this.#length = data[0]?.length;
        if (this.#length == null) throw new Error("Invalid starting length");
        this.#data = await validate(data, this.#length);
        this.#indexes = Uint32Array.from({length: this.#data.length / this.#length}, (_, i) => i);
        this.#leafsize = 10;
        const maxnodecount = 2 * Math.ceil(this.#data.length / this.#leafsize) - 1;
        this.#pivots = new Uint32Array(maxnodecount); //node 17 is pivots[17]
        this.#maxes = new Float32Array(maxnodecount); //node 17 is maxes[17]
        this.#mins = new Float32Array(maxnodecount); //node 17 is mins[17]
        this.#left = new Uint32Array(maxnodecount); //node 17 is left[17]
        this.#right = new Uint32Array(maxnodecount); //node 17 is right[17]
        this.#axis = new Uint32Array(maxnodecount); //node 17 is axis[17]
        this.#nodeCount = 0;
        //all of these ...[17] combine to create parallel object properties stored in Arrays.
        //I need a list of node indexes, and somehow attribute those indexes to point ranges
        this.#assemble(this.#indexes);
    }
    async set(data) {
        if (!data[0] || data.length <= 1) throw new Error("Invalid Data");
        await this.#init(data);
    }
    #assemble(data) {

    }
}