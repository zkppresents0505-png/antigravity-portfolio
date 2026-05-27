/**
 * portfolio/js/preloader.js
 * High-performance background preloader for Antigravity Portfolio.
 * Caches works page image sequences in the background after the landing page loads,
 * ensuring buttery-smooth transitions with zero delays.
 */

window.addEventListener('load', () => {
    // Wait 2.5 seconds to let the landing page assets and animations settle completely
    setTimeout(startPrefetching, 2500);
});

function startPrefetching() {
    console.log("[Preloader] Starting background prefetch for project image sequences...");
    
    const sequences = [
        {
            name: 'transportation',
            count: 26,
            srcFn: i => `Bus animation sequence/0_${i}.jpg`
        },
        {
            name: 'teapoy',
            count: 45,
            srcFn: i => `Teapoy Sequence 2/keyshot project.10.${i + 1}.jpg`
        },
        {
            name: 'magictable',
            count: 80,
            srcFn: i => `Magic Table Sequence/karim rahid table sequence.12.${i + 1}.jpg`
        },
        {
            name: 'obliviondrone',
            count: 267,
            srcFn: i => `Oblivion drone sequence/oblivion.15.${i + 168}.jpg`
        }
    ];

    // Create a queue of image URLs to load
    const urlQueue = [];

    // 1. Prioritize first 3 frames of all sequences first so the introductions are instant!
    const priorityFrames = 3;
    for (let f = 0; f < priorityFrames; f++) {
        for (const seq of sequences) {
            if (f < seq.count) {
                urlQueue.push(seq.srcFn(f));
            }
        }
    }

    // 2. Queue all remaining frames
    for (const seq of sequences) {
        for (let f = priorityFrames; f < seq.count; f++) {
            urlQueue.push(seq.srcFn(f));
        }
    }

    // 3. Process the queue with limited concurrent connections (max 2 at a time)
    // This keeps the network completely free and preserves CPU performance.
    const maxConcurrent = 2;
    let activeCount = 0;
    let currentIndex = 0;

    function loadNext() {
        if (currentIndex >= urlQueue.length) {
            if (activeCount === 0) {
                console.log("[Preloader] All works image sequences preloaded successfully in background!");
            }
            return;
        }

        while (activeCount < maxConcurrent && currentIndex < urlQueue.length) {
            const url = urlQueue[currentIndex++];
            activeCount++;
            
            const img = new Image();
            img.onload = img.onerror = () => {
                activeCount--;
                // Brief pause to allow the browser thread to breathe
                setTimeout(loadNext, 15);
            };
            img.src = url;
        }
    }

    loadNext();
}
