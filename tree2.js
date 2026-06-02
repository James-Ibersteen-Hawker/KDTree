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
 * @param {number} a index 1
 * @param {number} b index 2
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
/*
An algorithm for partitioning the list around medians (not sorting it though)
*/
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
 * @param {number} length length of coordinate / number of axes 
 * @returns Float32Array[x0, y0, z0, x1, y1, z1...]
 */
/*
Deduper using XXHASH, to act as a list fixer. Includes hash checks, using a map{} for storage
Ultimately converts input into Float32Array[]
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
function validateKD(indexes, data, dims, start = 0, end = indexes.length - 1, axis = 0) {
    if (start >= end) return true;

    const mid = Math.floor((start + end) / 2);
    const pivotIndex = indexes[mid];
    const pivotValue = data[pivotIndex * dims + axis];

    // Verify left partition
    for (let i = start; i < mid; i++) {
        const pointIndex = indexes[i];
        const value = data[pointIndex * dims + axis];

        if (value > pivotValue) {
            console.error(
                `Left violation at ${i}: axis=${axis}, value=${value}, pivot=${pivotValue}`
            );
            return false;
        }
    }

    // Verify right partition
    for (let i = mid + 1; i <= end; i++) {
        const pointIndex = indexes[i];
        const value = data[pointIndex * dims + axis];

        if (value < pivotValue) {
            console.error(
                `Right violation at ${i}: axis=${axis}, value=${value}, pivot=${pivotValue}`
            );
            return false;
        }
    }

    const nextAxis = (axis + 1) % dims;

    return (
        validateKD(indexes, data, dims, start, mid - 1, nextAxis) &&
        validateKD(indexes, data, dims, mid + 1, end, nextAxis)
    );
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
    assembly;
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
        //SoA structure - Parallel Arrays
        this.#pivots = new Uint32Array(maxnodecount); //node 17 is pivots[17]
        this.#maxes = new Float32Array(maxnodecount * this.#length); //node 17 is maxes[17]
        this.#mins = new Float32Array(maxnodecount * this.#length); //node 17 is mins[17]
        this.#left = new Uint32Array(maxnodecount); //node 17 is left[17]
        this.#right = new Uint32Array(maxnodecount); //node 17 is right[17]
        this.#axis = new Uint32Array(maxnodecount); //node 17 is axis[17]
        //all of these ...[17] combine to create parallel object properties stored in Arrays.
        //I need a list of node indexes, and somehow attribute those indexes to point range.
        this.#nodeCount = -1;
        this.#current_axis = 0;
        const maxes = this.#data.slice(this.#indexes[0], this.#indexes[0] + this.#length);
        const mins = this.#data.slice(this.#indexes[0], this.#indexes[0] + this.#length);
        for (let i = 0; i < this.#indexes.length; i++) {
            const index = this.#indexes[i];
            const start = index * this.#length;
            const end = start + this.#length
            const point = this.#data.subarray(start, end);
            for (let d = 0; d < this.#length; d++) {
                if (point[d] > maxes[d]) maxes[d] = point[d];
                else if (point[d] < mins[d]) mins[d] = point[d];
            }
            //index is the point, then length is the stride, and axis is the value
        }
        this.#assemble(this.#indexes, maxes, mins, 0, this.#indexes.length - 1, this.#current_axis);
        this.assembly = Array.from(this.#indexes).map(e => {
            const number = this.#data[e * this.#length + 2];
            return number;
        });
        const valid = validateKD(this.#indexes, this.#data, this.#length, 0, this.#indexes.length - 1, this.#current_axis);
        alert(valid)
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
     * @param {number} maxes the local maximum
     * @param {number} mins the local minimum
     * @param {number} start the start of partitioning segment
     * @param {number} end the end of partitioning segment
     * @param {number} axis current axis
     */
    #assemble(set, maxes, mins, start, end, axis) {
        const node = this.#nodeCount++;
        if (end - start <= this.#leafsize) return node;
        const centerIndex = Math.floor((start + end) / 2);
        quickselect(set, start, end, centerIndex, axis, this.#data, this.#length);
        /*
        Each node requires:
        #pivots[]
        #left[]
        #right[]
        #maxes[]
        #mins[]
        #axis[]
        */
        const pivot = this.#indexes[centerIndex]
        this.#pivots[node] = pivot;
        this.#axis[node] = axis;
        for (let d = 0; d < this.#length; d++) {
            this.#maxes[node * this.#length + d] = maxes[d];
            this.#mins[node * this.#length + d] = mins[d];
        }
        const lMaxes = maxes.slice();
        const rMins = mins.slice();
        lMaxes[axis] = this.#data[pivot * this.#length + axis];
        rMins[axis] = this.#data[pivot * this.#length + axis];
        this.#assemble(
            set, //set of indexes
            lMaxes, //maxes of right side continue
            mins, //modified right side minimums
            start, //start of dataset partition
            centerIndex - 1, //end of dataset partition
            (axis + 1) % this.#length //rotated axis
        );
        this.#assemble(
            set,
            maxes,
            rMins,
            centerIndex + 1,
            end,
            (axis + 1) % this.#length
        );
    }
}