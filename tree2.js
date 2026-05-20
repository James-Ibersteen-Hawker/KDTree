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
async function validate(data) {
    const { h32 } = await hash;
    const map = new Map();
    for (let i = 0; i < data.length; i++) {
        alert(data[i])
        
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
        this.#data = await validate(data);
        //now it is all the proper length
    }
}