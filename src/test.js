async function validate(data, length) {
    const xxhash = await initXXHash();
    const hasher = xxhash.create32();
    const hashlist = new Set(); //store hashes
    const f32_index = []; //store corresponding index in data
    
    const f32 = new Float32Array(length);
    const u8 = new Uint8Array(f32.buffer);
    for (let i = 0; i < data.length; i++) {
        const point = data[i];
        for (let d = 0; d < length; d++) f32[d] = point[d];
        hasher.update(u8);
        const key = hasher.digest();
        hashlist.add(key); //insert key and index at parallel place
        f32_index.push(i);

    }

    // const map = new Map();
    // const indices = [];
    
    // for (let i = 0; i < data.length; i++) {
    //     const point = data[i];
    //     for (let d = 0; d < length; d++) {
    //         f32[d] = point[d];
    //     }
    //     hasher.update(u8);
    //     const key = hasher.digest();
    //     const bucket = map.get(key);
    //     if (!bucket) {
    //         indices.push(i);
    //         map.set(key, [i])
    //     } else {
    //         let exists = false;
    //         outer: for (let q = 0; q < bucket.length; q++) {
    //             const bPoint = data[bucket[q]];
    //             for (let d = 0; d < length; d++) {
    //                 if (bPoint[d] !== point[d]) continue outer;
    //             } //if any is different, ignore. If all are equal, break.
    //             exists = true;
    //             break outer;
    //         }
    //         if (!exists) {
    //             indices.push(i)
    //             bucket.push(i);
    //         }
    //     }
    // }
    // const final = new Float32Array(indices.length * length)
    // for (let i = 0; i < indices.length; i++) {
    //     const point = data[indices[i]];
    //     for (let d = 0; d < length; d++) final[i * length + d] = point[d];
    // }
    // return final;
}