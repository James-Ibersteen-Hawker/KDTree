// function search(q, nodeID = 0, axis) {
//     const length = this.length; //for brevity and ease of reading
//     const newAxis = (axis + 1) % length;
//     const start = this.node_start[nodeID];
//     const end = this.node_end[nodeID];
//     if (end - start < this.leafsize) return this.closest(q, start, end);
//     const pivot = this.pivots[nodeID];
//     const left = this.left[nodeID];
//     const right = this.right[nodeID];
//     const pivot_pos = pivot * length
//     const pvt_val = this.data[pivot_pos + axis];
//     const go_left = q[axis] < pvt_val;
//     const side = go_left ? left : right;
//     const other = go_left ? right : left;
//     const result = this.search(q, side, newAxis);
//     let best_d = result[0];
//     let best_p = result[1];
//     const pivot_d = this.pivotDistance(q, pivot_pos)
//     if (pivot_d < best_d) {
//         best_d = pivot_d;
//         best_p = pivot;
//     }
//     if (other === -2) return [best_d, best_p]; /* No alternate side */
//     const otherD = this.bounds_distance(q, other);
//     if (otherD < best_d) {
//         const otherResult = this.search(q, other, newAxis);
//         const other_d = otherResult[0];
//         const other_p = otherResult[1];
//         if (other_d < best_d) {
//             best_d = other_d;
//             best_p = other_p;
//         }
//     }
//     return [best_d, best_p];
// }

// function search2(q, node_start = 0, axis_start = 0) {

//     //declared locally for efficiecy
//     const length = this.#length;
//     const pivots = this.#pivots;
//     const data = this.#data;
//     const indexes = this.#indexes;
//     const lefts = this.#left;
//     const rights = this.#right;
//     const starts = this.#node_start;
//     const ends = this.#node_end;
//     const leafSize = this.#leafsize;

//     //explicit stack
//     const stack = [node_start]; //each node will have a dedicated index
//     const axes = [axis_start]; //max dimensionality is 256 dimensional

//     //tracker
//     let best_d = Infinity;
//     let best_p = null;
    
//     //iterative loop
//     while (true) {
//         //clean stack and retrieve data
//         const node_id = stack.pop();
//         const axis = axes.pop();

//         //define SoA object instance (those objectively needed)
//         const start = starts[node_id];
//         const end = ends[node_id];

//         //process
//         if (end - start < leafSize) {
//             //leaf
//         }

//         //if not leaf, define the rest
//         const pivot = pivots[node_id];
//         const left = lefts[node_id];
//         const right = rights[node_id];
//         const pivot_pos = pivot * length;
//         const pvt_val = data[pivot_pos + axis];
//         const go_left = q[axis] < pvt_val;

//         //not leaf
//         const side = go_left ? left : right;
//         const otherside = go_left ? right : left;
//     }
// }