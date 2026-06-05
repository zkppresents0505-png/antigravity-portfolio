document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('trimmerCanvas');
    const ctx = canvas.getContext('2d');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingProgress = document.getElementById('loadingProgress');
    const scrollIndicator = document.getElementById('scrollIndicator');
    
    // Total frames in the trimmer sequence
    const frameCount = 192;
    const currentFrame = index => {
        // Generates path like "trimmer sequence/00001.jpg"
        return `trimmer sequence/${index.toString().padStart(5, '0')}.jpg`;
    };

    const images = [];
    let loadedImages = 0;
    let initialLoadComplete = false;

    // Resize canvas to match display size and pixel ratio
    const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        // set actual size in memory (scaled to account for extra pixel density)
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        // Normalize coordinate system to use css pixels
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Draw the image onto the canvas, containing it within the viewport maintaining aspect ratio
    const render = (image) => {
        if (!image) return;
        
        // Width and height in CSS pixels
        const vpWidth = window.innerWidth;
        const vpHeight = window.innerHeight;
        
        ctx.clearRect(0, 0, vpWidth, vpHeight);
        
        const hRatio = vpWidth / image.width;
        const vRatio = vpHeight / image.height;
        const ratio  = Math.min(hRatio, vRatio); // Use min for object-fit: contain
        
        const drawWidth = image.width * ratio;
        const drawHeight = image.height * ratio;
        
        const centerShift_x = (vpWidth - drawWidth) / 2;
        const centerShift_y = (vpHeight - drawHeight) / 2;  
        
        // We use Math.floor to avoid sub-pixel blurring
        ctx.drawImage(
            image, 
            0, 0, image.width, image.height,
            Math.floor(centerShift_x), Math.floor(centerShift_y), 
            Math.floor(drawWidth), Math.floor(drawHeight)
        );  

        // Hide 'veo' watermark at the bottom by drawing a black cover over the bottom corners
        // This ensures the cover moves seamlessly as the canvas transforms left/right
        const watermarkWidth = drawWidth * 0.25; // Cover up to 25% of width from edges
        const watermarkHeight = drawHeight * 0.12; // Cover bottom 12% height

        ctx.fillStyle = '#000000';
        
        // Bottom-Right cover
        ctx.fillRect(
             Math.floor(centerShift_x + drawWidth - watermarkWidth), 
             Math.floor(centerShift_y + drawHeight - watermarkHeight), 
             Math.floor(watermarkWidth), 
             Math.floor(watermarkHeight)
        );

        // Bottom-Left cover (just in case)
        ctx.fillRect(
             Math.floor(centerShift_x), 
             Math.floor(centerShift_y + drawHeight - watermarkHeight), 
             Math.floor(watermarkWidth), 
             Math.floor(watermarkHeight)
        );
    };

    // Stride loading (decimation) to reduce requests and memory. 
    // Stride 2 means we load every 2nd frame (96 total out of 192).
    const stride = 2;
    const targetFramesToLoad = [];
    for (let i = 1; i <= frameCount; i += stride) {
        targetFramesToLoad.push(i);
    }
    // Always load the final frame for absolute visual completeness at the end of scroll
    if (targetFramesToLoad[targetFramesToLoad.length - 1] !== frameCount) {
        targetFramesToLoad.push(frameCount);
    }
    const totalExpectedToLoad = targetFramesToLoad.length;

    // Helper to find the closest loaded frame to prevent canvas flickering
    const findClosestFrame = (index) => {
        if (images[index]) return images[index];
        
        let left = index - 1;
        let right = index + 1;
        while (left >= 0 || right < frameCount) {
            if (left >= 0 && images[left]) return images[left];
            if (right < frameCount && images[right]) return images[right];
            left--;
            right++;
        }
        return null;
    };

    // Preload target images using a throttled, sequential queue
    // 1. Prime the first frame immediately for instant view
    const firstImg = new Image();
    firstImg.src = currentFrame(1);
    firstImg.onload = () => {
        loadedImages++;
        images[0] = firstImg;
        resizeCanvas();
        render(firstImg);
        
        // 2. Start preloading remaining frames in the background
        startBackgroundLoad();
    };
    firstImg.onerror = () => {
        // Fallback in case of image failure
        startBackgroundLoad();
    };

    function startBackgroundLoad() {
        const remainingQueue = targetFramesToLoad.filter(num => num !== 1);
        const maxConcurrent = 3;
        let activeCount = 0;
        let nextQueueIndex = 0;

        function loadNext() {
            if (loadingProgress) {
                loadingProgress.innerText = `${Math.floor((loadedImages / totalExpectedToLoad) * 100)}%`;
            }

            if (loadedImages >= totalExpectedToLoad) {
                initialLoadComplete = true;
                setTimeout(() => {
                    if (loadingOverlay) {
                        loadingOverlay.style.opacity = '0';
                        setTimeout(() => {
                            loadingOverlay.style.display = 'none';
                            // Re-trigger scroll event to show correct frame if user scrolled while loading
                            window.dispatchEvent(new Event('scroll'));
                        }, 800);
                    }
                }, 400); // slight delay to feel smoother
                return;
            }

            while (activeCount < maxConcurrent && nextQueueIndex < remainingQueue.length) {
                const frameNum = remainingQueue[nextQueueIndex++];
                activeCount++;
                
                const img = new Image();
                img.src = currentFrame(frameNum);
                img.onload = () => {
                    images[frameNum - 1] = img;
                    loadedImages++;
                    activeCount--;
                    setTimeout(loadNext, 10); // brief main-thread breathing room
                };
                img.onerror = () => {
                    loadedImages++;
                    activeCount--;
                    setTimeout(loadNext, 10);
                };
            }
        }

        loadNext();
    }
    
    // Handle window resize properly
    window.addEventListener('resize', () => {
        resizeCanvas();
        // re-render current frame based on scroll
        window.dispatchEvent(new Event('scroll'));
    });

    const textDesc = document.getElementById('trimmerDesc');
    const animationBreakPoint = 0.75; // 75% for frames, 25% for text reveal

    // Scroll handler using requestAnimationFrame for smooth drawing
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!initialLoadComplete) return;

        // Hide scroll indicator once user starts scrolling down
        if (window.scrollY > 100 && scrollIndicator && scrollIndicator.style.opacity !== '0') {
            scrollIndicator.style.transition = 'opacity 0.3s ease';
            scrollIndicator.style.opacity = '0';
        } else if (window.scrollY <= 100 && scrollIndicator && scrollIndicator.style.opacity === '0') {
            scrollIndicator.style.opacity = '0.6';
        }
        
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollTop = window.scrollY || document.documentElement.scrollTop;
                const scrollContainer = document.querySelector('.scroll-container');
                const maxScrollTop = scrollContainer ? scrollContainer.scrollHeight - window.innerHeight : document.documentElement.scrollHeight - window.innerHeight;
                
                // Calculate overall scroll fraction between 0 and 1
                const totalScrollFraction = Math.max(0, Math.min(1, scrollTop / maxScrollTop));
                
                if (totalScrollFraction <= animationBreakPoint) {
                    // Frame animation phase
                    // Map 0 -> breakPoint to 0 -> 1 for frame calculations
                    const frameProgress = totalScrollFraction / animationBreakPoint;
                    const frameIndex = Math.min(
                        frameCount - 1,
                        Math.floor(frameProgress * frameCount)
                    );
                    render(findClosestFrame(frameIndex));
                    
                    // Reset canvas position and hide text
                    canvas.style.transform = 'translateX(0)';
                    if (textDesc) {
                        textDesc.style.opacity = '0';
                        textDesc.style.transform = 'translateY(-40%)';
                        textDesc.style.pointerEvents = 'none';
                    }
                } else {
                    // Text Reveal phase
                    // Frame index stays at the last frame
                    render(findClosestFrame(frameCount - 1));
                    
                    // Map breakPoint -> 1 to 0 -> 1 for text reveal calculations
                    const revealProgress = (totalScrollFraction - animationBreakPoint) / (1 - animationBreakPoint);
                    
                    // Move canvas left based on progress (up to -20vw or so)
                    const canvasShift = revealProgress * -20; 
                    canvas.style.transform = `translateX(${canvasShift}vw)`;
                    
                    if (textDesc) {
                        textDesc.style.opacity = revealProgress;
                        textDesc.style.transform = `translateY(-50%)`; // smoothly settles into place
                        textDesc.style.pointerEvents = revealProgress > 0.8 ? 'auto' : 'none';
                    }
                }
                
                ticking = false;
            });
            ticking = true;
        }
    });

    // Initialize canvas size initially
    resizeCanvas();
});
