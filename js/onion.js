document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('onionCanvas');
    const ctx = canvas.getContext('2d');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingProgress = document.getElementById('loadingProgress');
    const scrollIndicator = document.getElementById('scrollIndicator');
    
    // Total frames in the onion sequence
    const frameCount = 51;
    const currentFrame = index => {
        // Generates path like "on-ion sequence/Onion animation.22.1.jpg"
        return `on-ion sequence/Onion animation.22.${index}.jpg`;
    };

    const images = [];
    let loadedImages = 0;
    let initialLoadComplete = false;

    // Resize canvas to match display size and pixel ratio
    const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Draw the image onto the canvas, containing it within the viewport maintaining aspect ratio
    const render = (image) => {
        if (!image) return;
        
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
        
        ctx.drawImage(
            image, 
            0, 0, image.width, image.height,
            Math.floor(centerShift_x), Math.floor(centerShift_y), 
            Math.floor(drawWidth), Math.floor(drawHeight)
        );  
    };

    // Stride loading - for 51 frames we load everything (stride = 1)
    const stride = 1;
    const targetFramesToLoad = [];
    for (let i = 1; i <= frameCount; i += stride) {
        targetFramesToLoad.push(i);
    }
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
                            window.dispatchEvent(new Event('scroll'));
                        }, 800);
                    }
                }, 400);
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
                    setTimeout(loadNext, 10);
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
        window.dispatchEvent(new Event('scroll'));
    });

    const textDesc = document.getElementById('onionDesc');
    const animationBreakPoint = 0.75; 

    // Scroll handler using requestAnimationFrame for smooth drawing
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!initialLoadComplete) return;

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
                
                const totalScrollFraction = Math.max(0, Math.min(1, scrollTop / maxScrollTop));
                
                if (totalScrollFraction <= animationBreakPoint) {
                    // Frame animation phase
                    const frameProgress = totalScrollFraction / animationBreakPoint;
                    const frameIndex = Math.min(
                        frameCount - 1,
                        Math.floor(frameProgress * frameCount)
                    );
                    render(findClosestFrame(frameIndex));
                    
                    canvas.style.transform = 'translateX(0)';
                    if (textDesc) {
                        textDesc.style.opacity = '0';
                        textDesc.style.transform = 'translateY(-40%)';
                        textDesc.style.pointerEvents = 'none';
                    }
                } else {
                    // Text Reveal phase
                    render(findClosestFrame(frameCount - 1));
                    
                    const revealProgress = (totalScrollFraction - animationBreakPoint) / (1 - animationBreakPoint);
                    const canvasShift = revealProgress * -20; 
                    canvas.style.transform = `translateX(${canvasShift}vw)`;
                    
                    if (textDesc) {
                        textDesc.style.opacity = revealProgress;
                        textDesc.style.transform = `translateY(-50%)`; 
                        textDesc.style.pointerEvents = revealProgress > 0.8 ? 'auto' : 'none';
                    }
                }
                
                ticking = false;
            });
            ticking = true;
        }
    });

    resizeCanvas();
});
