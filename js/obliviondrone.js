document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('obliviondroneCanvas');
    const ctx = canvas.getContext('2d');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingProgress = document.getElementById('loadingProgress');
    const scrollIndicator = document.getElementById('scrollIndicator');
    
    // Total frames in the sequence
    const frameCount = 267;
    const currentFrame = index => {
        // Generates path like "Oblivion drone sequence/oblivion.15.168.jpg"
        return `Oblivion drone sequence/oblivion.15.${index + 168}.jpg`;
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

    // ─── Mask definitions ───────────────────────────────────────────────────
    // Each mask covers a region (in image-space fraction 0-1) where a stray
    // part sits at the start of the animation.
    // fadeStart / fadeEnd = frame indices (0-based) at which the mask alpha
    // transitions from 1 → 0, timed to when that part starts moving.
    const masks = [
        {
            // Top-right corner — bullets & sphere parts assemble first (~frames 0-50)
            xFrac: 0.68, yFrac: 0.0, wFrac: 0.32, hFrac: 0.45,
            fadeStart: 0, fadeEnd: 55
        },
        {
            // Left side — disc / gun module assembles later (~frames 50-130)
            xFrac: 0.05, yFrac: 0.05, wFrac: 0.26, hFrac: 0.65,
            fadeStart: 50, fadeEnd: 140
        }
    ];

    const render = (image, frameIndex = 0) => {
        if (!image) return;
        
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

        // ─── Draw cinematic black masks over stray parts ─────────────────
        masks.forEach(mask => {
            // Calculate alpha: 1 = fully opaque, 0 = fully transparent
            let alpha;
            if (frameIndex <= mask.fadeStart) {
                alpha = 1;
            } else if (frameIndex >= mask.fadeEnd) {
                alpha = 0;
            } else {
                // Smooth ease-out fade
                const t = (frameIndex - mask.fadeStart) / (mask.fadeEnd - mask.fadeStart);
                alpha = 1 - (t * t * (3 - 2 * t)); // smoothstep
            }

            if (alpha <= 0) return; // skip fully transparent masks

            // Convert image-fraction coords to canvas draw-space coords
            const mx = Math.floor(centerShift_x + mask.xFrac * drawWidth);
            const my = Math.floor(centerShift_y + mask.yFrac * drawHeight);
            const mw = Math.ceil(mask.wFrac * drawWidth);
            const mh = Math.ceil(mask.hFrac * drawHeight);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#000000';
            ctx.fillRect(mx, my, mw, mh);
            ctx.restore();
        });
    };

    // Preload all 267 images
    for (let i = 0; i < frameCount; i++) {
        const img = new Image();
        img.src = currentFrame(i);
        
        img.onload = () => {
            loadedImages++;
            loadingProgress.innerText = `${Math.floor((loadedImages / frameCount) * 100)}%`;
            
            // Draw the first frame as soon as it's ready
            if (i === 0 || Object.keys(images).length === 1) {
                resizeCanvas();
                render(img, 0);
            }
            
            if (loadedImages === frameCount) {
                initialLoadComplete = true;
                setTimeout(() => {
                    loadingOverlay.style.opacity = '0';
                    setTimeout(() => {
                        loadingOverlay.style.display = 'none';
                        window.dispatchEvent(new Event('scroll'));
                    }, 800);
                }, 400); 
            }
        };
        // Store images 
        images[i] = img;
    }
    
    window.addEventListener('resize', () => {
        resizeCanvas();
        window.dispatchEvent(new Event('scroll'));
    });

    const textDesc = document.getElementById('obliviondroneDesc');
    const animationBreakPoint = 0.75; // 75% for frames, 25% for text reveal

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!initialLoadComplete) return;

        if (window.scrollY > 100 && scrollIndicator.style.opacity !== '0') {
            scrollIndicator.style.transition = 'opacity 0.3s ease';
            scrollIndicator.style.opacity = '0';
        } else if (window.scrollY <= 100 && scrollIndicator.style.opacity === '0') {
            scrollIndicator.style.opacity = '0.6';
        }
        
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollTop = window.scrollY || document.documentElement.scrollTop;
                const scrollContainer = document.querySelector('.scroll-container');
                const maxScrollTop = scrollContainer ? scrollContainer.scrollHeight - window.innerHeight : document.documentElement.scrollHeight - window.innerHeight;
                
                const totalScrollFraction = Math.max(0, Math.min(1, scrollTop / maxScrollTop));
                
                if (totalScrollFraction <= animationBreakPoint) {
                    const frameProgress = totalScrollFraction / animationBreakPoint;
                    const frameIndex = Math.min(
                        frameCount - 1,
                        Math.floor(frameProgress * frameCount)
                    );
                    render(images[frameIndex], frameIndex);
                    
                    canvas.style.transform = 'translateX(0)';
                    if (textDesc) {
                        textDesc.style.opacity = '0';
                        textDesc.style.transform = 'translateY(-40%)';
                        textDesc.style.pointerEvents = 'none';
                    }
                } else {
                    render(images[frameCount - 1], frameCount - 1);
                    
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
