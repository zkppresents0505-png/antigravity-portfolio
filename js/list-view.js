document.addEventListener('DOMContentLoaded', () => {
    const btnTileView = document.getElementById('btn-tile-view');
    const btnListView = document.getElementById('btn-list-view');
    const tileViewContainer = document.getElementById('tileViewContainer');
    const listViewContainer = document.getElementById('listViewContainer');
    
    const loadingOverlay = document.getElementById('listViewLoadingOverlay');
    const loadingProgress = document.getElementById('listViewLoadingProgress');
    
    let isListViewLoaded = false;
    let isListViewActive = false;

    // View Toggle Logic
    btnTileView.addEventListener('click', () => {
        if (!isListViewActive) return;
        isListViewActive = false;
        
        btnTileView.classList.add('active');
        btnListView.classList.remove('active');
        
        listViewContainer.style.display = 'none';
        tileViewContainer.style.display = 'block';
        window.scrollTo(0, 0);
    });

    btnListView.addEventListener('click', () => {
        if (isListViewActive) return;
        isListViewActive = true;
        
        btnListView.classList.add('active');
        btnTileView.classList.remove('active');
        
        if (!isListViewLoaded) {
            initListView();
        } else {
            tileViewContainer.style.display = 'none';
            listViewContainer.style.display = 'flex';
            window.scrollTo(0, 0);
            resizeCanvases();
            window.dispatchEvent(new Event('scroll'));
        }
    });

    // --- LIST VIEW LOGIC ---

    const trimmerCanvas = document.getElementById('trimmerCanvasListView');
    const trimmerCtx = trimmerCanvas?.getContext('2d');
    const trimmerBlock = document.getElementById('block-trimmer');
    const trimmerDesc = document.getElementById('trimmerDescListView');
    const trimmerFrameCount = 192;
    const trimmerImages = [];

    const transportationCanvas = document.getElementById('transportationCanvasListView');
    const transportationCtx = transportationCanvas?.getContext('2d');
    const transportationBlock = document.getElementById('block-transportation');
    const transportationDesc = document.getElementById('transportationDescListView');
    const transportationFrameCount = 26;
    const transportationImages = [];

    const teapoyCanvas = document.getElementById('teapoyCanvasListView');
    const teapoyCtx = teapoyCanvas?.getContext('2d');
    const teapoyBlock = document.getElementById('block-teapoy');
    const teapoyDesc = document.getElementById('teapoyDescListView');
    const teapoyFrameCount = 45; // trimmed to avoid repetitive rotations
    const teapoyImages = [];

    const magictableCanvas = document.getElementById('magictableCanvasListView');
    const magictableCtx = magictableCanvas?.getContext('2d');
    const magictableBlock = document.getElementById('block-magictable');
    const magictableDesc = document.getElementById('magictableDescListView');
    const magictableFrameCount = 80;
    const magictableImages = [];

    const obliviondroneCanvas = document.getElementById('obliviondroneCanvasListView');
    const obliviondroneCtx = obliviondroneCanvas?.getContext('2d');
    const obliviondroneBlock = document.getElementById('block-obliviondrone');
    const obliviondroneDesc = document.getElementById('obliviondroneDescListView');
    const obliviondroneFrameCount = 267;
    const obliviondroneImages = [];
    // Cinematic masks for stray assembly parts
    const oblivionMasks = [
        { xFrac: 0.68, yFrac: 0.0,  wFrac: 0.32, hFrac: 0.45, fadeStart: 0,  fadeEnd: 55  },
        { xFrac: 0.05, yFrac: 0.05, wFrac: 0.26, hFrac: 0.65, fadeStart: 50, fadeEnd: 140 }
    ];

    // Track which animations have their first frame ready
    const firstFrameReady = { trimmer: false, transportation: false, teapoy: false, magictable: false, obliviondrone: false };
    let viewLaunched = false;

    function resizeCanvases() {
        if (!isListViewActive) return;
        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth * dpr;
        const height = window.innerHeight * dpr;

        if (trimmerCanvas) {
            trimmerCanvas.width = width;
            trimmerCanvas.height = height;
            trimmerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        if (transportationCanvas) {
            transportationCanvas.width = width;
            transportationCanvas.height = height;
            transportationCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        if (teapoyCanvas) {
            teapoyCanvas.width = width;
            teapoyCanvas.height = height;
            teapoyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        if (magictableCanvas) {
            magictableCanvas.width = width;
            magictableCanvas.height = height;
            magictableCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        if (obliviondroneCanvas) {
            obliviondroneCanvas.width = width;
            obliviondroneCanvas.height = height;
            obliviondroneCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }

    window.addEventListener('resize', () => {
        if (isListViewActive) {
            resizeCanvases();
            window.dispatchEvent(new Event('scroll'));
        }
    });

    function renderImageToCanvas(ctx, image, hideWatermark = false) {
        if (!image || !ctx) return;
        
        const vpWidth = window.innerWidth;
        const vpHeight = window.innerHeight;
        
        ctx.clearRect(0, 0, vpWidth, vpHeight);
        
        const hRatio = vpWidth / image.width;
        const vRatio = vpHeight / image.height;
        const ratio  = Math.min(hRatio, vRatio); 
        
        const drawWidth = image.width * ratio;
        const drawHeight = image.height * ratio;
        
        const centerShift_x = (vpWidth - drawWidth) / 2;
        const centerShift_y = (vpHeight - drawHeight) / 2;  
        
        ctx.drawImage(
            image, 
            0, 0, image.width, image.height,
            Math.floor(centerShift_x), Math.floor(centerShift_y), 
            Math.floor(drawWidth), Math.floor(drawHeight)
        );

        if (hideWatermark) {
            const watermarkWidth = drawWidth * 0.25; 
            const watermarkHeight = drawHeight * 0.12; 

            ctx.fillStyle = '#000000';
            
            ctx.fillRect(
                 Math.floor(centerShift_x + drawWidth - watermarkWidth), 
                 Math.floor(centerShift_y + drawHeight - watermarkHeight), 
                 Math.floor(watermarkWidth), 
                 Math.floor(watermarkHeight)
            );
        }
    }

    function initListView() {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
        loadingProgress.innerText = 'Loading...';

        // --- PROGRESSIVE LOADING ---
        // Load first frame of each animation first, then load the rest in background.
        // The view launches as soon as all first-frames are ready.

        function checkAllFirstFramesReady() {
            if (viewLaunched) return;
            const allReady = Object.values(firstFrameReady).every(v => v);
            if (!allReady) return;
            viewLaunched = true;
            isListViewLoaded = true;

            tileViewContainer.style.display = 'none';
            listViewContainer.style.display = 'flex';
            window.scrollTo(0, 0);
            resizeCanvases();

            renderImageToCanvas(trimmerCtx, trimmerImages[0], true);
            renderImageToCanvas(transportationCtx, transportationImages[0], false);
            renderImageToCanvas(teapoyCtx, teapoyImages[0], false);
            renderImageToCanvas(magictableCtx, magictableImages[0], false);
            renderImageToCanvas(obliviondroneCtx, obliviondroneImages[0], false);
            applyOblivionMasks(obliviondroneCtx, 0);

            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
                window.dispatchEvent(new Event('scroll'));
                const triggerBounce = () => {
                    listViewContainer.classList.add('page-bounce-anim');
                    setTimeout(() => listViewContainer.classList.remove('page-bounce-anim'), 1500);
                };
                triggerBounce();
                window.bounceInterval = setInterval(triggerBounce, 4000);
            }, 600);
        }

        function loadSequence(images, srcFn, count, key, startIndex = 0) {
            // Load first frame immediately, rest after a small delay
            const firstImg = new Image();
            firstImg.src = srcFn(startIndex);
            firstImg.onload = () => {
                images[0] = firstImg;
                firstFrameReady[key] = true;
                checkAllFirstFramesReady();
                // Load remaining frames in background
                loadRemainingFrames(images, srcFn, count, startIndex);
            };
            firstImg.onerror = () => {
                // Even on error, mark ready so we don't block forever
                firstFrameReady[key] = true;
                checkAllFirstFramesReady();
            };
        }

        function loadRemainingFrames(images, srcFn, count, startIndex) {
            // Fill array with placeholders first
            for (let i = 1; i < count; i++) {
                if (!images[i]) images[i] = null;
            }
            // Load remaining frames sequentially to avoid overwhelming the browser
            let i = 1;
            function loadNext() {
                if (i >= count) return;
                const img = new Image();
                img.src = srcFn(startIndex + i);
                img.onload = () => {
                    images[i] = img;
                    i++;
                    // Small delay to let main thread breathe
                    setTimeout(loadNext, 8);
                };
                img.onerror = () => { i++; setTimeout(loadNext, 8); };
            }
            setTimeout(loadNext, 100); // Start background load after brief pause
        }

        // Kick off all 5 sequences — first frames load in parallel
        loadSequence(
            trimmerImages,
            i => `trimmer sequence/${(i).toString().padStart(5, '0')}.jpg`,
            trimmerFrameCount,
            'trimmer',
            1  // trimmer is 1-indexed
        );
        loadSequence(
            transportationImages,
            i => `Bus animation sequence/0_${i}.jpg`,
            transportationFrameCount,
            'transportation',
            0
        );
        loadSequence(
            teapoyImages,
            i => `Teapoy sequence 2/keyshot project.10.${i + 1}.jpg`,
            teapoyFrameCount,
            'teapoy',
            0
        );
        loadSequence(
            magictableImages,
            i => `Magic table sequence/karim rahid table sequence.12.${i + 1}.jpg`,
            magictableFrameCount,
            'magictable',
            0
        );
        loadSequence(
            obliviondroneImages,
            i => `Oblivion drone sequence/oblivion.15.${i + 168}.jpg`,
            obliviondroneFrameCount,
            'obliviondrone',
            0
        );
    }

    // Scroll Logic
    const animationBreakPoint = 0.75; 

    // Cinematic mask overlay for Oblivion Drone assembly animation
    function applyOblivionMasks(ctx, frameIndex) {
        if (!ctx) return;
        const vpWidth = window.innerWidth;
        const vpHeight = window.innerHeight;
        // Recalculate draw area (must match renderImageToCanvas logic)
        const img = obliviondroneImages[0];
        if (!img || !img.naturalWidth) return;
        const ratio = Math.min(vpWidth / img.naturalWidth, vpHeight / img.naturalHeight);
        const drawWidth = img.naturalWidth * ratio;
        const drawHeight = img.naturalHeight * ratio;
        const cx = (vpWidth - drawWidth) / 2;
        const cy = (vpHeight - drawHeight) / 2;
        oblivionMasks.forEach(mask => {
            let alpha;
            if (frameIndex <= mask.fadeStart) { alpha = 1; }
            else if (frameIndex >= mask.fadeEnd) { alpha = 0; }
            else {
                const t = (frameIndex - mask.fadeStart) / (mask.fadeEnd - mask.fadeStart);
                alpha = 1 - (t * t * (3 - 2 * t));
            }
            if (alpha <= 0) return;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#000000';
            ctx.fillRect(
                Math.floor(cx + mask.xFrac * drawWidth),
                Math.floor(cy + mask.yFrac * drawHeight),
                Math.ceil(mask.wFrac * drawWidth),
                Math.ceil(mask.hFrac * drawHeight)
            );
            ctx.restore();
        });
    }

    function getLoadedFrame(images, index) {
        // Walk backwards to find nearest loaded frame if target isn't ready yet
        let i = Math.min(index, images.length - 1);
        while (i > 0 && !images[i]) i--;
        return images[i] || null;
    }

    function handleScrollBlock(block, canvas, ctx, images, descElement, frameCount, hideWatermark = false) {
        if (!block || !canvas || !ctx || images.length === 0) return;

        const rect = block.getBoundingClientRect();
        const blockHeight = rect.height;
        const viewportHeight = window.innerHeight;
        
        // Calculate progress based on the block's current position relative to viewport
        let progress = -rect.top / (blockHeight - viewportHeight);
        
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;

        if (progress <= animationBreakPoint) {
            // Animate frames
            const frameProgress = progress / animationBreakPoint;
            const frameIndex = Math.min(frameCount - 1, Math.floor(frameProgress * frameCount));
            const frame = getLoadedFrame(images, frameIndex);
            if (frame) renderImageToCanvas(ctx, frame, hideWatermark);

            canvas.style.transform = 'translateX(0)';
            if (descElement) {
                descElement.style.opacity = '0';
                descElement.style.transform = 'translateY(-40%)';
                descElement.style.pointerEvents = 'none';
            }
        } else {
            // Text reveal
            const lastFrame = getLoadedFrame(images, frameCount - 1);
            if (lastFrame) renderImageToCanvas(ctx, lastFrame, hideWatermark);
            
            const revealProgress = (progress - animationBreakPoint) / (1 - animationBreakPoint);
            const canvasShift = revealProgress * -20; 
            canvas.style.transform = `translateX(${canvasShift}vw)`;
            
            if (descElement) {
                descElement.style.opacity = revealProgress;
                descElement.style.transform = `translateY(-50%)`; 
                descElement.style.pointerEvents = revealProgress > 0.8 ? 'auto' : 'none';
            }
        }
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!isListViewActive || !isListViewLoaded) return;
        
        // Stop bouncing once the user scrolls
        if (window.bounceInterval) {
            clearInterval(window.bounceInterval);
            window.bounceInterval = null;
        }

        if (!ticking) {
            window.requestAnimationFrame(() => {
                handleScrollBlock(trimmerBlock, trimmerCanvas, trimmerCtx, trimmerImages, trimmerDesc, trimmerFrameCount, true);
                handleScrollBlock(transportationBlock, transportationCanvas, transportationCtx, transportationImages, transportationDesc, transportationFrameCount, false);
                handleScrollBlock(teapoyBlock, teapoyCanvas, teapoyCtx, teapoyImages, teapoyDesc, teapoyFrameCount, false);
                handleScrollBlock(magictableBlock, magictableCanvas, magictableCtx, magictableImages, magictableDesc, magictableFrameCount, false);

                // Oblivion Drone with cinematic mask
                if (obliviondroneBlock && obliviondroneCanvas && obliviondroneCtx && obliviondroneImages.length > 0) {
                    const rect = obliviondroneBlock.getBoundingClientRect();
                    let progress = -rect.top / (rect.height - window.innerHeight);
                    progress = Math.max(0, Math.min(1, progress));
                    const animBreak = 0.75;
                    let frameIdx;
                    if (progress <= animBreak) {
                        frameIdx = Math.min(obliviondroneFrameCount - 1, Math.floor((progress / animBreak) * obliviondroneFrameCount));
                        renderImageToCanvas(obliviondroneCtx, obliviondroneImages[frameIdx], false);
                        applyOblivionMasks(obliviondroneCtx, frameIdx);
                        obliviondroneCanvas.style.transform = 'translateX(0)';
                        if (obliviondroneDesc) { obliviondroneDesc.style.opacity = '0'; obliviondroneDesc.style.pointerEvents = 'none'; }
                    } else {
                        frameIdx = obliviondroneFrameCount - 1;
                        renderImageToCanvas(obliviondroneCtx, obliviondroneImages[frameIdx], false);
                        applyOblivionMasks(obliviondroneCtx, frameIdx);
                        const revealProgress = (progress - animBreak) / (1 - animBreak);
                        obliviondroneCanvas.style.transform = `translateX(${revealProgress * -20}vw)`;
                        if (obliviondroneDesc) { obliviondroneDesc.style.opacity = revealProgress; obliviondroneDesc.style.transform = 'translateY(-50%)'; obliviondroneDesc.style.pointerEvents = revealProgress > 0.8 ? 'auto' : 'none'; }
                    }
                }
                
                // Handle Portfolio Iframe Scroll Hijacking
                const portfolioBlock = document.getElementById('block-portfolio');
                if (portfolioBlock) {
                    const iframe = portfolioBlock.querySelector('iframe');
                    const header = document.querySelector('.works-page-header');
                    const headerHeight = header ? header.offsetHeight : 80;
                    const rect = portfolioBlock.getBoundingClientRect();
                    
                    // Allow interaction when the top of the iframe is further down from the header
                    // We use a larger buffer (+ 80) so it doesn't overlap or touch the header before engaging
                    if (rect.top <= headerHeight + 80) {
                        iframe.style.pointerEvents = 'auto';
                    } else {
                        iframe.style.pointerEvents = 'none';
                    }
                }
                
                ticking = false;
            });
            ticking = true;
        }
    });

    // Default view: tile if ?view=tile, otherwise list view
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'tile') {
        btnTileView.click();
    } else {
        btnListView.click();
    }
});
