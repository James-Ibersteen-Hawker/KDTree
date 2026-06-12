"use strict";

//this file contains the additional helper functions
//in order to make the class file more clean

//the xxhash used for deduplication

import initXXHash from "xxhash-wasm";
let xxhash = null;
export async function getHash() {
    if (!xxhash) xxhash = await initXXHash();
    return xxhash;
}

//the quickselect functions
//uses median-of-three partitioning
//avoids use of transient arrays
//is the primary partitioner

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
export function quickselect(set, start, end, i, axis, data, length) {
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

//axis to mask conversion

export function axisToMask(axes) {
    let mask = 0;
    for (let i = 0; i < axes.length; i++) {
        mask |= (1 << axes[i])
    }
    return mask;
}

// validation of query and of axes
export const bounds = [-340282346638528859811704183484516925440, 340282346638528859811704183484516925440]

export function validateAxes(axes, length) {
    if (axes.length > length) throw new Error("Too many axes!")
    for (let i = 0; i < axes.length; i++) {
        const axis = axes[i];
        if (Number.isNaN(axis) || !Number.isFinite(axis)) throw new Error(`Axis ${axis} is not computable`);
        if (axis >= length || axis < 0) throw new Error("Axis out of bounds");
    }
}
export function validateQuery(q, length, indexes, data) {
    if (!Array.isArray(q)) throw new Error("Query is not an array");
    if (!indexes || !data) throw new Error("Tree lacks data to search");
    if (q.length !== length) throw new Error("Query is of incorrect length");
    for (let i = 0; i < q.length; i++) {
        if (Number.isNaN(q[i])) throw new Error("Improper input");
        if (!Number.isFinite(q[i]) && q[i] !== 0) throw new Error("Infinite");
        if (q[i] <= bounds[0] || q[i] >= bounds[1]) throw new Error("Out of bounds");
    }
}