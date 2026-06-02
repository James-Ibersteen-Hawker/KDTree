// @ts-check;
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
/**
 * @param {Number} a index 1
 * @param {Number} b index 2
 */
const swap = (arr, a, b) => [arr[a], arr[b]] = [arr[b], arr[a]];
function partition(set, start, end, p, data, axis, length) {
    const pivotValue = data[set[p] * length + axis]; //p is POSITION, of INDEX, in DATA
    swap(set, p, end);
    let storeIndex = start;
    for (let i = start; i < end; i++) {
        if (data[set[i] * length + axis] < pivotValue) {
            swap(set, storeIndex, i);
            storeIndex++;
        }
    }
    swap(set, storeIndex, end);
    return storeIndex;
}
function quickselect(set, start, end, i, axis, data, length) {
    while (true) {
        if (start === end) return set[start];
        const pivotIndex = Math.floor((start + end) / 2);
        const newPivotIndex = partition(set, start, end, pivotIndex, data, axis, length);
        if (i === newPivotIndex) {
            return set[i];
        }
        if (i < newPivotIndex) {
            end = newPivotIndex - 1;
        } else {
            start = newPivotIndex + 1;
        }
    }
}
/**
 * 
 * @param {*} data input array for deduplicating
 * @param {Number} length length of coordinate / number of axes 
 * @returns Float32Array[x0, y0, z0, x1, y1, z1...]
 */
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
    #current_axis;
    /**
     * @param {Array} data Array input of equal lengths
     * @returns Promise - await KDTree
     */
    static async initFrom(data) {
        const kdtree = new KDTree2();
        await kdtree.set(data);
        return kdtree;
    }
    constructor() { /* intentionally blank, to force users to use static initFrom() */ }
    async #init(data) {
        if (!data[0]) throw new Error("First element doesn't exist");
        this.#length = data[0]?.length;
        if (this.#length == null) throw new Error("Invalid starting length");
        this.#data = await validate(data, this.#length);
        this.#indexes = Uint32Array.from({ length: this.#data.length / this.#length }, (_, i) => i);
        this.#leafsize = 10;
        const maxnodecount = 2 * Math.ceil(this.#data.length / this.#leafsize) - 1;
        //AoS structure - Parallel Arrays
        this.#pivots = new Uint32Array(maxnodecount); //node 17 is pivots[17]
        this.#maxes = new Float32Array(maxnodecount); //node 17 is maxes[17]
        this.#mins = new Float32Array(maxnodecount); //node 17 is mins[17]
        this.#left = new Uint32Array(maxnodecount); //node 17 is left[17]
        this.#right = new Uint32Array(maxnodecount); //node 17 is right[17]
        this.#axis = new Uint32Array(maxnodecount); //node 17 is axis[17]
        //all of these ...[17] combine to create parallel object properties stored in Arrays.
        //I need a list of node indexes, and somehow attribute those indexes to point range.
        this.#nodeCount = 0;
        this.#current_axis = 0;
        let max = this.#data[this.#current_axis]; //added benefit of always being the first point since axis loops around
        let min = this.#data[this.#current_axis]; //added benefit of always being the first point since axis loops around
        for (let i = 0; i < this.#indexes.length; i++) {
            const index = this.#indexes[i];
            const scalar = this.#data[index * this.#length + this.#current_axis]
            //index is the point, then length is the stride, and axis is the value
            if (scalar > max) max = scalar;
            else if (scalar < min) min = scalar;
        }
        quickselect(this.#indexes, 0, this.#indexes.length - 1, 29, 0, this.#data, this.#length)
        // this.#assemble(this.#indexes, max, min, 0, this.#indexes.length - 1);
    }
    /**
     * @param {Array} data replace the old set
     */
    async set(data) {
        if (!data[0] || data.length <= 1) throw new Error("Invalid Data");
        await this.#init(data);
    }
    /**
     * 
     * @param {Uint32Array} set the array of indexes to data[]
     * @param {Number} max the local maximum
     * @param {Number} min the local minimum
     * @param {Number} start the start of partitioning segment
     * @param {Number} end the end of partitioning segment
     */
    #assemble(set, max, min, start, end) {
        if (end - start <= this.#leafsize) {
            console.log("leaf");
            return;
        }
        this.#current_axis = this.#current_axis + 1 % this.#length;
    }
}