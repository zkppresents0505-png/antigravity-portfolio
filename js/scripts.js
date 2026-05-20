document.addEventListener("DOMContentLoaded", () => {
    // --- Interactive Loader Logic ---
    const pageLoader = document.getElementById('page-loader');
    const loaderPercentage = document.getElementById('loader-percentage');
    const loaderProgress = document.getElementById('loader-progress');
    const loaderContent = document.querySelector('.loader-content');
    
    let progress = 0;
    let progressInterval;

    // Simulate progress while waiting for Spline and assets
    function updateProgress() {
        if (progress < 90) {
            // Random small increments to stagger getting to 90%
            progress += Math.random() * 8;
            if (progress > 90) progress = 90;
            setProgress(progress);
        }
    }

    function setProgress(val) {
        if (loaderPercentage && loaderProgress) {
            loaderPercentage.textContent = Math.floor(val) + '%';
            loaderProgress.style.width = val + '%';
        }
    }

    if (pageLoader) {
        progressInterval = setInterval(updateProgress, 150);

        // Interactive parallax effect mapping cursor to loader content
        pageLoader.addEventListener('mousemove', (e) => {
            const xAxis = (window.innerWidth / 2 - e.pageX) / 30;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 30;
            if (loaderContent) {
                loaderContent.style.transform = `translate(${xAxis}px, ${yAxis}px)`;
            }
        });
    }

    // Wait for all resources (including iframe) to fully load
    window.addEventListener('load', () => {
        clearInterval(progressInterval);
        
        // Fast forward to 100% to indicate completion
        setProgress(100);
        
        // Give users a brief moment to see 100% before hiding
        setTimeout(() => {
            if (pageLoader) {
                pageLoader.classList.add('hidden');
            }
            document.body.classList.remove('loading');
        }, 800);
    });

    // Simple & Fast Custom Cursor
    const cursor = document.querySelector('.cursor');
    const hoverTargets = document.querySelectorAll('.hover-target, a, button, .project-card, .hero-author-row');

    // Direct performance-friendly mapping with section-based activation
    const heroSection = document.getElementById('hero');
    
    document.addEventListener('mousemove', (e) => {
        // Only show custom cursor if mouse is geographically below the hero section
        const heroHeight = heroSection ? heroSection.offsetHeight : window.innerHeight;
        
        if (e.pageY <= heroHeight) {
            // Mouse is in Hero/Landing Area: Use Native Cursors
            if (cursor.style.display !== 'none') {
                cursor.style.display = 'none';
                document.body.classList.remove('custom-cursor-active');
            }
        } else {
            // Mouse is in Work/About/Skills Area: Use Custom Cursor
            if (cursor.style.display !== 'block') {
                cursor.style.display = 'block';
                document.body.classList.add('custom-cursor-active');
            }
            cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate3d(-50%, -50%, 0)`;
        }
    });

    hoverTargets.forEach(target => {
        target.addEventListener('mouseenter', () => cursor.classList.add('hover-active'));
        target.addEventListener('mouseleave', () => cursor.classList.remove('hover-active'));
    });

    // Intersection Observer for scroll animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-up');
    fadeElements.forEach(el => observer.observe(el));

    // Magnetic Button Effect
    const magneticBtns = document.querySelectorAll('.magnetic-btn');
    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0px, 0px)';
            btn.style.transition = 'transform 0.4s var(--transition)';
        });
        
        btn.addEventListener('mouseenter', () => {
            btn.style.transition = 'none';
        });
    });

    // Image Interactive Parallax
    const interactiveImg = document.querySelector('.interactive-img');
    const heroImageContainer = document.querySelector('.hero-image');
    
    if (interactiveImg && heroImageContainer) {
        heroImageContainer.addEventListener('mousemove', (e) => {
            if (window.innerWidth > 768) {
                // Calculate center coordinates of the image wrapper itself
                const rect = heroImageContainer.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                // Tilt relative to the image center instead of full window
                // Negative/Positive rules mimic pressing down where you hover
                const xAxis = -(e.clientX - centerX) / 40;
                const yAxis = (e.clientY - centerY) / 40;
                
                interactiveImg.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg) scale(1.02)`;
            }
        });
        
        // Return to dead-center starting point when mouse leaves
        heroImageContainer.addEventListener('mouseleave', () => {
            if (window.innerWidth > 768) {
                interactiveImg.style.transform = `rotateY(0deg) rotateX(0deg) scale(1)`;
            }
        });
    }

    // Dot Matrix Canvas Background
    const canvas = document.getElementById('hero-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const hero = document.getElementById('hero');
        let width, height;
        let dots = [];
        const spacing = 35; // Space between dots
        const baseRadius = 1;
        const maxRadius = 3;
        const interactionRadius = 200;

        let mouse = { x: -1000, y: -1000 };

        function resize() {
            width = canvas.width = hero.offsetWidth;
            height = canvas.height = hero.offsetHeight;
            initDots();
        }

        function initDots() {
            dots = [];
            for (let x = 0; x < width; x += spacing) {
                for (let y = 0; y < height; y += spacing) {
                    dots.push({
                        x: x + spacing / 2,
                        y: y + spacing / 2,
                        baseX: x + spacing / 2,
                        baseY: y + spacing / 2,
                    });
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);

            dots.forEach(dot => {
                const dx = mouse.x - dot.baseX;
                const dy = mouse.y - dot.baseY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                let radius = baseRadius;
                let opacity = 0.15;

                if (distance < interactionRadius) {
                    const factor = (interactionRadius - distance) / interactionRadius;
                    radius = baseRadius + (maxRadius - baseRadius) * factor;
                    
                    // Repel slightly away from cursor
                    const angle = Math.atan2(dy, dx);
                    const push = factor * 10; 
                    dot.x = dot.baseX - Math.cos(angle) * push;
                    dot.y = dot.baseY - Math.sin(angle) * push;
                    opacity = 0.15 + factor * 0.7;
                } else {
                    // Ease back to original position
                    dot.x += (dot.baseX - dot.x) * 0.1;
                    dot.y += (dot.baseY - dot.y) * 0.1;
                    opacity = 0.15;
                }

                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
                ctx.fill();
            });

            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resize);
        hero.addEventListener('mousemove', (e) => {
            const rect = hero.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        });

        hero.addEventListener('mouseleave', () => {
            mouse.x = -1000;
            mouse.y = -1000;
        });

        resize();
        animate();
    }
});
