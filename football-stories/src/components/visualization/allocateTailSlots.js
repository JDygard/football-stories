export function allocateTailSlots(ribbons) {
  // ribbons: [{ id, startY, endY }]
  // returns: Map<id, slotIndex>

  const sorted = [...ribbons].sort((a, b) => a.startY - b.startY);

  const active = []; // [{ endY, slot }]
  const free = [];   // sorted slot indices
  let nextSlot = 0;

  const result = new Map();

  for (const r of sorted) {
    // ---------------------------------------------
    // Release ALL finished ribbons
    // ---------------------------------------------
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].endY <= r.startY) {
        const { slot } = active.splice(i, 1)[0];

        // insert slot into free list sorted
        const idx = free.findIndex(s => s > slot);
        if (idx === -1) free.push(slot);
        else free.splice(idx, 0, slot);
      }
    }

    // ---------------------------------------------
    // Assign LOWEST available slot
    // ---------------------------------------------
    const slot =
      free.length > 0
        ? free.shift()
        : nextSlot++;

    result.set(r.id, slot);

    // ---------------------------------------------
    // Mark ribbon as active
    // ---------------------------------------------
    active.push({
      endY: r.endY,
      slot,
    });
  }

  return result;
}


function heapPush(heap, item) {
  heap.push(item);
  heap.sort((a, b) => a.endY - b.endY);
}

function heapPop(heap) {
  return heap.shift();
}
