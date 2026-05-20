document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('magictableCanvas');
    const ctx = canvas.getContext('2d');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingProgress = document.getElementById('loadingProgress');
    const scrollIndicator = document.getElementById('scrollIndicator');
    
    // Total frames in the magic table sequence
    const frameCount = 80;
    const currentFrame = index => {
        // Generates path like "Magic table sequence/karim rahid table sequence.12.1.jpg"
        return `Magic table sequence/karim rahid table sequence.12.${index + 1}.jpg`;
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

    const render = (image) => {
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
    };

    // Preload all 80 images
    for (let i = 0; i < frameCount; i++) {
        const img = new Image();
        img.src = currentFrame(i);
        
        img.onload = () => {
            loadedImages++;
            loadingProgress.innerText = `${Math.floor((loadedImages / frameCount) * 100)}%`;
            
            // Draw the first frame as soon as it's ready
            if (i === 0 || Object.keys(images).length === 1) {
                resizeCanvas();
                render(img);
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

    const textDesc = document.getElementById('magictableDesc');
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
                    render(images[frameIndex]);
                    
                    canvas.style.transform = 'translateX(0)';
                    if (textDesc) {
                        textDesc.style.opacity = '0';
                        textDesc.style.transform = 'translateY(-40%)';
                        textDesc.style.pointerEvents = 'none';
                    }
                } else {
                    render(images[frameCount - 1]);
                    
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
