"use strict";
import initXXHash from "xxhash-wasm";
let xxhash = null;
async function getHash() {
    if (!xxhash) xxhash = await initXXHash();
    return xxhash;
}
const bounds = [-340282346638528859811704183484516925440, 340282346638528859811704183484516925440]
function swap(arr, a, b) {
    const temp = arr[a];
    arr[a] = arr[b];
    arr[b] = temp;
}
function partition(set, start, end, p, data, axis, length) {
    const pivotValue = data[set[p] * length + axis]; //p is POSITION, of INDEX, in DATA
    swap(set, p, end);
    let storeIndex = start;
    for (let i = start; i < end; i++) {
        if (data[set[i] * length + axis] < pivotValue) swap(set, storeIndex++, i);
    }
    swap(set, storeIndex, end);
    return storeIndex;
}
/**
 * Median of three pivot selection
 * @param {Uint32Array} set index set
 * @param {number} start start of selection
 * @param {number} end end of selection
 * @param {number} data list of points flatpacked
 * @param {number} axis given axis
 * @param {number} length length of stride
 * @returns best index of three[start, end, mid]
 */
function medianOfThree(set, start, end, data, axis, length) {
    const mid = Math.floor((start + end) / 2);
    const a = data[set[start] * length + axis];
    const b = data[set[mid] * length + axis];
    const c = data[set[end] * length + axis];
    if (a < b) {
        if (b < c) return mid; //a < b < c
        if (a < c) return end; //a < b <= c
        return start;
    } else {
        if (a < c) return start; //b < a < c
        if (b < c) return end; //b < a <= c
        return mid;
    }
}
/*
Lomuto style partitioning
Invariant: P is at given {i}
Guarantees elements[axis] < pivot on the left and > pivot on the right
*/
function quickselect(set, start, end, i, axis, data, length) {
    if (start > end) throw new RangeError("Negative region");
    if (i < start || i > end) throw new RangeError("Out of bounds");
    while (true) {
        if (start === end) break;
        const pivotIndex = medianOfThree(set, start, end, data, axis, length)
        const newPivotIndex = partition(set, start, end, pivotIndex, data, axis, length); //determine recursion bias
        if (i === newPivotIndex) break;
        else if (i < newPivotIndex) end = newPivotIndex - 1;
        else if (i > newPivotIndex) start = newPivotIndex + 1;
    }
}
function parseJSONSerial(serial) {
    const [
        length,
        leafsize,
        data,
        indexes,
        pivots,
        mins,
        maxes,
        left,
        right,
        node_start,
        node_end
    ] = JSON.parse(serial);
    return [
        length,
        leafsize,
        new Float32Array(Object.values(data)),
        new Uint32Array(Object.values(indexes)),
        new Uint32Array(Object.values(pivots)),
        new Float32Array(Object.values(mins)),
        new Float32Array(Object.values(maxes)),
        new Int32Array(Object.values(left)),
        new Int32Array(Object.values(right)),
        new Uint32Array(Object.values(node_start)),
        new Uint32Array(Object.values(node_end))
    ]
}
function axisToMask(axes) {
    let mask = 0;
    for (let i = 0; i < axes.length; i++) {
        mask |= (1 << axes[i])
    }
    return mask;
}
function validateAxes(axes, length) {
    if (axes.length > length) throw new Error("Too many axes!")
    for (let i = 0; i < axes.length; i++) {
        const axis = axes[i];
        if (Number.isNaN(axis) || !Number.isFinite(axis)) throw new Error(`Axis ${axis} is not computable`);
        if (axis >= length || axis < 0) throw new Error("Axis out of bounds");
    }
}
/**
 * Uses xxhash to dedupe the input list
 * @param {*} data input array for deduplicating
 * @param {number} length length of coordinate / number of axes 
 * @returns flatpacked Float32Array[x0, y0, z0, x1, y1, z1...]
 */
async function validate(data, length) {
    const hash = await getHash();
    const map = new Map();
    const indices = [];
    const f32 = new Float32Array(length);
    const u8 = new Uint8Array(f32.buffer);
    for (let i = 0; i < data.length; i++) {
        const point = data[i];
        for (let d = 0; d < length; d++) {
            f32[d] = point[d];
        }
        const key = hash.h32Raw(u8);
        let bucket = map.get(key);
        if (!bucket) {
            indices.push(i);
            map.set(key, i)
        } else {
            if (typeof bucket === "number") {
                map.set(key, [bucket]);
                bucket = map.get(key);
            }
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
export default class KDTree {
    #data; //float32
    #indexes; //uint32
    #length;
    #leafsize;
    #nodeCount;
    #pivots; //uint32
    #maxes; //float32
    #mins; //float32
    #left; //int32
    #right; //int32
    #node_start; //uint32
    #node_end; //uint32
    /**
     * @param {Array} data Array input of equal lengths
     * @returns Promise - await KDTree
     */
    static async initFrom(data) {
        if (data.length <= 1) throw new Error("Not enough data");
        const kdtree = new KDTree();
        await kdtree.set(data);
        return kdtree;
    }
    static async initFromSerial(serialInput) {
        const tree = new KDTree();
        if (!serialInput) throw new Error("Input is null or empty")
        if (serialInput) await tree.setFromSerial(serialInput);
        return tree;
    }
    constructor() { } //deliberately blank
    async #init(data) {
        if (!data[0]) throw new Error("First element doesn't exist");
        this.#length = data[0]?.length;
        const length = this.#length;
        if (length == null) throw new Error("Invalid starting length");
        this.#data = await validate(data, length);
        const _data = this.#data;
        const pointCount = _data.length / length;
        if (pointCount <= 1) throw new Error("Not enough data");
        this.#leafsize = 10;
        this.#indexes = new Uint32Array(pointCount);
        for (let i = 0; i < pointCount; i++) this.#indexes[i] = i;
        const maxnodecount = pointCount - (this.#leafsize - 1);
        //SoA structure - Parallel Arrays
        //pivot and axis - general data
        this.#pivots = new Uint32Array(maxnodecount);
        //maxes and mins, flatpacked
        this.#maxes = new Float32Array(maxnodecount * length);
        this.#mins = new Float32Array(maxnodecount * length);
        //left and right index pointers
        this.#left = new Int32Array(maxnodecount).fill(-2);
        this.#right = new Int32Array(maxnodecount).fill(-2);
        //node starts and ends
        this.#node_start = new Uint32Array(maxnodecount);
        this.#node_end = new Uint32Array(maxnodecount);
        //counters
        this.#nodeCount = 0;
        //must be a slice to detach from processing
        const maxes = _data.slice(0, length);
        const mins = _data.slice(0, length);
        for (let i = 1; i < this.#indexes.length; i++) {
            const start = i * length;
            for (let d = 0; d < length; d++) {
                const val = _data[start + d];
                if (val > maxes[d]) maxes[d] = val;
                else if (val < mins[d]) mins[d] = val;
            } //index is the point, then length is the stride, and axis is the value
        }
        if (this.#data.length <= this.#leafsize) return; //not enough points to make a tree
        this.#assemble(this.#indexes, mins, maxes, 0, this.#indexes.length - 1, 0);
    }
    set leafsize(v) {
        this.#leafsize = v;
    }
    get leafsize() {
        return this.#leafsize;
    }
    get size() {
        return this.#indexes.length;
    }
    get components() {
        const bytelength =
            this.#data?.byteLength +
            this.#indexes?.byteLength +
            this.#pivots?.byteLength +
            this.#mins?.byteLength +
            this.#maxes?.byteLength
        this.#left?.byteLength +
            this.#right?.byteLength +
            this.#node_start?.byteLength +
            this.#node_end?.byteLength
        return {
            dimension: this.#length || null,
            leaflength: this.#leafsize,
            length: this.#indexes?.length || 0,
            layout: "implicit",
            storage: "SoA",
            byteSize: bytelength || 0
        }
    }
    get data() {
        if (!this.#data) return null;
        const convertedIndexes = Array.from(this.#indexes);
        return convertedIndexes.map(e => {
            const point = new Array(this.#length);
            for (let i = 0; i < point.length; i++) {
                point[i] = this.#data[e + i];
            }
            return point;
        });
    }
    /**
     * @param {Array} data replace the old set
     */
    async set(data) {
        if (!data[0] || data.length <= 1) throw new Error("Invalid Data");
        await this.#init(data);
    }
    clear() {
        this.#data = null;
        this.#pivots = null;
        this.#indexes = null;
        this.#maxes = null;
        this.#mins = null;
        this.#right = null;
        this.#left = null;
        this.#node_start = null;
        this.#node_end = null;
        this.#nodeCount = 0;
        this.#length = null;
    }
    /**
     * This is the KDtree search function. If axis is specified, it will search solely on that axis
     * @param {Array} q Input
     * @param {Object} [options] Specifies if the function should only search a specific axis
     * @returns either Point[] or (Distance, Point[])
     */
    search(q, { axes = [], includeDistance = false } = {}) {
        axes = Array.from(new Set(axes));
        this.#validateQuery(q);
        validateAxes(axes, this.#length);
        const axismask = axes.length > 0 ? axisToMask(axes) : null;
        let result;
        if (this.#indexes.length <= this.#leafsize) {
            result = this.#closest(q, 0, this.#indexes.length - 1, axismask);
        } else result = this.#search(q, 0, 0, axismask);
        const final_d = result[0];
        const final_p = result[1] * this.#length;
        const point = Array.from(this.#data.slice(final_p, final_p + this.#length));
        if (includeDistance === true) return [Math.sqrt(final_d), point];
        return point;
    }
    /**
     * 
     * @param {String} format the format of the return. "json", "blob", "es6-standard", "es6-typed"
     * @returns JSON-string, Blob{}, Array[], or Float32Array[]
     */
    serialize(format = "json") {
        if (["json", "es6-standard"].includes(format)) {
            const serial = this.#compressTreeNontyped();
            if (format === "json") return JSON.stringify(serial);
            else return serial;
        } else if (["blob", "es6-typed"].includes(format)) {
            const serial = this.#compressTreeTyped();
            if (format === "es6-typed") return serial;
            else return new Blob([serial], { type: "application/octet-stream" });
        } else throw new Error(`Unsupported type ${format}`);
    }
    async setFromSerial(serial) {
        if (!serial) throw new Error("No input")
        //next for type guards
        const type = serial.constructor.name;
        if (["Array", "String"].includes(type)) {
            if (type === "String") serial = parseJSONSerial(serial);
            this.#deconstructSerial(serial)
        } else if (["ArrayBuffer", "Blob"].includes(type)) {
            if (type === "Blob") serial = await serial.arrayBuffer();
            this.#deconstructBuffer(serial);
        } else throw new Error(`Unsupported type ${type}`);
    }
    //general functions
    /**
     * Assembles an implicit KDTree
     * 
     * Mutates indexes[] in place, returns #node for counting
     * 
     * Creates the SoA for each node, with inherited bounds
     * @param {Uint32Array} set the array of indexes to data[]
     * @param {Float32Array} mins the local maximum
     * @param {Float32Array} maxes the local minimum
     * @param {number} start the start of partitioning segment
     * @param {number} end the end of partitioning segment
     * @param {number} axis current axis
     */
    #assemble(set, mins, maxes, start, end, axis) {
        if (end < start) return -2; //initial defence

        const length = this.#length;
        const node = this.#nodeCount++;

        //define node bounds
        this.#node_start[node] = start;
        this.#node_end[node] = end;

        const offset = node * length;
        for (let d = 0; d < length; d++) {
            const pos = offset + d;
            this.#maxes[pos] = maxes[d];
            this.#mins[pos] = mins[d];
        }

        if (end - start < this.#leafsize) return node; //if leaf

        const data = this.#data;
        const center = Math.floor((start + end) / 2);
        const newAxis = axis + 1 === this.#length ? 0 : axis + 1;

        //rearranges [start - end] of the list
        quickselect(set, start, end, center, axis, data, length);

        const pivot = set[center];
        this.#pivots[node] = pivot; //index of pivot in this.#data

        //[rMins, P) - P - [P, lMaxes)
        //keep the altered positions for non-slicing
        const left_dry = maxes[axis];
        const right_dry = mins[axis];
        //change bounds to fit the pivot value
        const pivotValue = data[pivot * length + axis]
        maxes[axis] = pivotValue;
        //recursive assembly
        this.#left[node] = this.#assemble(set, mins, maxes, start, center - 1, newAxis);
        maxes[axis] = left_dry;
        mins[axis] = pivotValue;
        this.#right[node] = this.#assemble(set, mins, maxes, center + 1, end, newAxis);
        mins[axis] = right_dry;
        return node; //return node id for the proper offset
    }
    #search(q, nodeID = 0, axis, axismask) {
        const length = this.#length; //for brevity and ease of reading
        const newAxis = (axis + 1) % length;
        const start = this.#node_start[nodeID];
        const end = this.#node_end[nodeID];
        if (end - start < this.#leafsize) return this.#closest(q, start, end, axismask);
        const pivot = this.#pivots[nodeID];
        const left = this.#left[nodeID];
        const right = this.#right[nodeID];
        const pivot_pos = pivot * length
        const pvt_val = this.#data[pivot_pos + axis];
        const go_left = q[axis] < pvt_val;
        const side = go_left ? left : right;
        const other = go_left ? right : left;
        const result = this.#search(q, side, newAxis, axismask);
        let best_d = result[0];
        let best_p = result[1];
        const pivot_d = this.#pivotDistance(q, pivot_pos, axismask)
        if (pivot_d < best_d) {
            best_d = pivot_d;
            best_p = pivot;
        }
        if (other === -2) return [best_d, best_p]; /* No alternate side */
        const otherD = this.#bounds_distance(q, other, axismask);
        if (otherD < best_d) {
            const otherResult = this.#search(q, other, newAxis, axismask);
            const other_d = otherResult[0];
            const other_p = otherResult[1];
            if (other_d < best_d) {
                best_d = other_d;
                best_p = other_p;
            }
        }
        return [best_d, best_p];
    }
    #bounds_distance(q, nodeID, axismask) { //distance to max / min (whichever is appropriate)
        let dist = 0;
        const node_offset = nodeID * this.#length;
        for (let i = 0; i < this.#length; i++) {
            if (axismask && (axismask & (1 << i)) === 0) continue;
            let d = 0;
            const min = this.#mins[node_offset + i]; //predefine to reduce lookups
            const max = this.#maxes[node_offset + i];
            const qi = q[i]
            if (qi < min) d = min - qi;
            else if (qi > max) d = qi - max;
            dist += d * d;
        }
        return dist;
    }
    #validateQuery(q) {
        if (!Array.isArray(q)) throw new Error("Query is not an array");
        if (!this.#indexes || !this.#data) throw new Error("Tree lacks data to search");
        if (q.length !== this.#length) throw new Error("Query is of incorrect length");
        for (let i = 0; i < q.length; i++) {
            if (Number.isNaN(q[i])) throw new Error("Improper input");
            if (!Number.isFinite(q[i]) && q[i] !== 0) throw new Error("Infinite");
            if (q[i] <= bounds[0] || q[i] >= bounds[1]) throw new Error("Out of bounds");
        }
    }
    /**
     * Finds the closest point based off of a list and query (brute force method)
     * @param {Array} q 
     * @param {number} start
     * @param {number} end
     */
    #closest(q, start, end, axismask) {
        //brute force
        const length = this.#length;
        const indexes = this.#indexes;
        const data = this.#data;
        let best_d = Infinity;
        let best_p = null;
        for (let i = start; i <= end; i++) {
            const index = indexes[i];
            const offset = index * length;
            let dist = 0;
            for (let d = 0; d < length; d++) { //zero-allocation viewing
                if (axismask && (axismask & (1 << d)) === 0) continue;
                const delta = q[d] - data[offset + d];
                dist += delta * delta;
                if (dist >= best_d) break;
            }
            if (dist < best_d) {
                best_p = index;
                best_d = dist;
            } //returning index, final point is computed last
        }
        return [best_d, best_p];
    }
    #pivotDistance(q, p, axismask) {
        let dist = 0;
        for (let i = 0; i < this.#length; i++) {
            if (axismask && (axismask & (1 << i)) === 0) continue;
            const scalar = this.#data[p + i];
            dist += (q[i] - scalar) * (q[i] - scalar);
        }
        return dist;
    }
    //serialization functions
    #compressTreeTyped() {
        const length = this.#length;
        const data = this.#data;
        const indexes = this.#indexes;
        const pivots = this.#pivots;
        const mins = this.#mins;
        const maxes = this.#maxes;
        const lefts = this.#left;
        const rights = this.#right;
        const starts = this.#node_start;
        const ends = this.#node_end;
        const header = new Uint32Array([
            length,
            this.#leafsize,
            data.length,
            pivots.length,
            indexes.length,
            mins.length,
            maxes.length,
            lefts.length,
            rights.length,
            starts.length,
            ends.length
        ]);
        const totalByteSize =
            header.byteLength +
            data.byteLength +
            pivots.byteLength +
            indexes.byteLength +
            mins.byteLength +
            maxes.byteLength +
            lefts.byteLength +
            rights.byteLength +
            starts.byteLength +
            ends.byteLength

        const buffer = new ArrayBuffer(totalByteSize)
        let offset = 0;
        const sections = [
            [Uint32Array, header],
            [Float32Array, data],
            [Uint32Array, pivots],
            [Uint32Array, indexes],
            [Float32Array, mins],
            [Float32Array, maxes],
            [Int32Array, lefts],
            [Int32Array, rights],
            [Uint32Array, starts],
            [Uint32Array, ends],
        ];
        for (let i = 0; i < sections.length; i++) {
            const [type, value] = sections[i];
            new type(buffer, offset, value.length).set(value);
            offset += value.byteLength;
        }
        return buffer;
    }
    #compressTreeNontyped() {
        const serial = [
            this.#length,
            this.#leafsize,
            this.#data,
            this.#indexes,
            this.#pivots,
            this.#mins,
            this.#maxes,
            this.#left,
            this.#right,
            this.#node_start,
            this.#node_end
        ];
        return serial;
    }
    //parse serialization
    #deconstructBuffer(buffer) {
        let offset = 0;
        //extract header metadata
        const header = new Uint32Array(buffer, offset, 11);
        offset += header.byteLength;
        const [
            length,
            leafsize,
            dataL,
            pivotsL,
            indexesL,
            minsL,
            maxesL,
            leftsL,
            rightsL,
            startsL,
            endsL
        ] = header;
        this.#length = length;
        this.#leafsize = leafsize;
        //start assembling the tree
        this.#data = new Float32Array(buffer, offset, dataL);
        offset += this.#data.byteLength;
        this.#pivots = new Uint32Array(buffer, offset, pivotsL);
        offset += this.#pivots.byteLength;
        this.#indexes = new Uint32Array(buffer, offset, indexesL);
        offset += this.#indexes.byteLength
        this.#mins = new Float32Array(buffer, offset, minsL);
        offset += this.#mins.byteLength
        this.#maxes = new Float32Array(buffer, offset, maxesL);
        offset += this.#maxes.byteLength
        this.#left = new Int32Array(buffer, offset, leftsL);
        offset += this.#left.byteLength
        this.#right = new Int32Array(buffer, offset, rightsL);
        offset += this.#right.byteLength
        this.#node_start = new Uint32Array(buffer, offset, startsL);
        offset += this.#node_start.byteLength
        this.#node_end = new Uint32Array(buffer, offset, endsL);
    }
    #deconstructSerial(serial) {
        [
            this.#length,
            this.#leafsize,
            this.#data,
            this.#indexes,
            this.#pivots,
            this.#mins,
            this.#maxes,
            this.#left,
            this.#right,
            this.#node_start,
            this.#node_end
        ] = serial;
    }
}

/*
to-do list:
- k-nearest neighbors
*/