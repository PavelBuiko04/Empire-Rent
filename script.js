// Normalize navigation entry to GET once per tab session to avoid
// browser "Confirm form resubmission" prompt on refresh.
const GET_NORMALIZED_KEY = "empire-get-normalized";
if (!sessionStorage.getItem(GET_NORMALIZED_KEY)) {
  sessionStorage.setItem(GET_NORMALIZED_KEY, "1");
  const cleanUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(cleanUrl);
}

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ overwrite: 'auto' });
const APARTMENT_ACTIVE_KEY = "empire-apartment-active";
const APARTMENT_PROGRESS_KEY_PREFIX = "empire-apartment-progress-";

// Throttle function to optimize high-frequency mobile events
function throttle(fn, delay) {
  let lastCall = 0;
  let id = null;
  return function(...args) {
    const now = Date.now();
    const remainingTime = delay - (now - lastCall);
    
    clearTimeout(id);
    
    if (remainingTime <= 0) {
      fn.apply(this, args);
      lastCall = now;
    } else {
      id = setTimeout(() => {
        fn.apply(this, args);
        lastCall = Date.now();
      }, remainingTime);
    }
  };
}

document.addEventListener("click", (event) => {
  const anchor = event.target.closest('a[href="#"]');
  if (anchor) {
    event.preventDefault();
  }
});

const video = document.querySelector("#apple-video");
const HERO_MOBILE_BREAKPOINT = 768;
const heroMediaQuery = window.matchMedia(`(max-width: ${HERO_MOBILE_BREAKPOINT}px)`);
let currentHeroSource = "";

function syncHeroVideoSource(force = false) {
  if (!video) return;
  const nextSource = heroMediaQuery.matches ? video.dataset.srcMobile : video.dataset.srcDesktop;
  if (!nextSource) return;
  if (!force && currentHeroSource === nextSource) return;

  ScrollTrigger.getById("hero-video-scroll")?.kill();
  ScrollTrigger.getById("hero-nav-follow")?.kill();
  currentHeroSource = nextSource;
  video.src = nextSource;
  video.load();
}

syncHeroVideoSource(true);
if (heroMediaQuery.addEventListener) {
  heroMediaQuery.addEventListener("change", () => {
    syncHeroVideoSource();
  });
} else if (heroMediaQuery.addListener) {
  heroMediaQuery.addListener(() => {
    syncHeroVideoSource();
  });
}

function apartmentProgressKey(id) {
  return `${APARTMENT_PROGRESS_KEY_PREFIX}${id}`;
}

const apartments = Array.from(document.querySelectorAll(".apartment-card[data-apartment-id]")).map((card) => {
  const id = card.dataset.apartmentId;
  const image = card.querySelector("img");
  const fullVideo = card.querySelector(".apartment-full-video");
  const title = card.querySelector("h3");
  const facts = Array.from(card.querySelectorAll(".apartment-fact"));
  const description = card.querySelector(".apartment-description");
  const history = card.querySelector(".apartment-history");
  const keypoints = Array.from(card.querySelectorAll(".apartment-keypoint"));
  const overlayUi = card.querySelector(".apartment-overlay-ui");
  const overlayToggle = card.querySelector(".apartment-overlay-toggle");
  const backButton = card.querySelector(".apartment-back");
  const previewLoader = new Image();

  if (image?.dataset.landscapeSrc) {
    previewLoader.src = image.dataset.landscapeSrc;
  }

  return {
    id,
    card,
    image,
    fullVideo,
    title,
    facts,
    description,
    history,
    keypoints,
    overlayUi,
    overlayToggle,
    backButton,
    previewLoader,
    placeholder: null,
    expanded: false,
    animating: false,
    videoProgress: 0,
    touchStartY: 0,
    videoReady: false,
    videoPreparing: false,
    readyCallbacks: []
  };
});

let activeApartment = null;

// Initialize throttled video progress setters for optimal mobile performance
apartments.forEach((apartment) => {
  apartment.throttledSetProgress = throttle((newProgress) => {
    setApartmentVideoProgress(apartment, newProgress);
  }, 16);  // 16ms throttle = ~60fps, reduce to 33ms for lower-end mobile devices
});

function setApartmentOverlayNavOpen(apartment, isOpen) {
  if (!apartment?.card) return;
  apartment.card.classList.toggle("apartment-nav-open", Boolean(isOpen));
  if (apartment.overlayToggle) {
    apartment.overlayToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  }
}

function flushVideoReadyCallbacks(apartment) {
  while (apartment.readyCallbacks.length) {
    const callback = apartment.readyCallbacks.shift();
    callback?.();
  }
}

function prepareApartmentVideo(apartment, onReady) {
  if (!apartment.fullVideo) {
    onReady?.();
    return;
  }

  if (apartment.videoReady) {
    onReady?.();
    return;
  }

  if (onReady) {
    apartment.readyCallbacks.push(onReady);
  }

  if (apartment.videoPreparing) {
    return;
  }
  apartment.videoPreparing = true;

  const markReady = () => {
    if (apartment.videoReady) return;
    apartment.videoReady = true;
    apartment.videoPreparing = false;
    apartment.fullVideo.pause();

    const finalize = () => flushVideoReadyCallbacks(apartment);
    const onSeeked = () => requestAnimationFrame(finalize);

    apartment.fullVideo.addEventListener("seeked", onSeeked, { once: true });
    try {
      apartment.fullVideo.currentTime = 0.001;
    } catch (_error) {
      finalize();
    }
  };

  if (apartment.fullVideo.readyState >= 2) {
    markReady();
  } else {
    apartment.fullVideo.addEventListener("loadeddata", markReady, { once: true });
    apartment.fullVideo.load();
  }
}

function updateApartmentFacts(apartment, progressValue) {
  const riseStart = 0.1;
  const peak = 0.55;
  const fadeEnd = 0.65;
  let normalized = 0;

  if (progressValue >= riseStart && progressValue <= peak) {
    normalized = (progressValue - riseStart) / (peak - riseStart);
  } else if (progressValue > peak && progressValue <= fadeEnd) {
    normalized = 1 - (progressValue - peak) / (fadeEnd - peak);
  }

  normalized = gsap.utils.clamp(0, 1, normalized);

  apartment.facts.forEach((factBlock, index) => {
    const local = gsap.utils.clamp(0, 1, normalized * 1.35 - index * 0.18);
    gsap.set(factBlock, {
      autoAlpha: local,
      y: gsap.utils.interpolate(22, 0, local),
      scale: gsap.utils.interpolate(0.96, 1, local)
    });
  });

  if (apartment.description) {
    gsap.set(apartment.description, {
      autoAlpha: normalized,
      y: gsap.utils.interpolate(18, 0, normalized)
    });
  }

  const historyStart = 0.6;
  const historyFull = 0.72;
  const historyNormalized = gsap.utils.clamp(
    0,
    1,
    (progressValue - historyStart) / (historyFull - historyStart)
  );

  if (apartment.history) {
    gsap.set(apartment.history, {
      autoAlpha: historyNormalized,
      y: gsap.utils.interpolate(18, 0, historyNormalized)
    });
  }

  apartment.keypoints.forEach((point, index) => {
    const local = gsap.utils.clamp(0, 1, historyNormalized * 1.4 - index * 0.18);
    gsap.set(point, {
      autoAlpha: local,
      y: gsap.utils.interpolate(16, 0, local),
      scale: gsap.utils.interpolate(0.96, 1, local)
    });
  });
}

function setApartmentVideoProgress(apartment, nextProgress) {
  if (!apartment.fullVideo || !apartment.fullVideo.duration) return;
  apartment.videoProgress = gsap.utils.clamp(0, 1, nextProgress);
  apartment.fullVideo.currentTime = apartment.fullVideo.duration * apartment.videoProgress;
  updateApartmentFacts(apartment, apartment.videoProgress);
  sessionStorage.setItem(apartmentProgressKey(apartment.id), String(apartment.videoProgress));
}

function handleApartmentWheel(apartment, event) {
  if (!apartment.expanded || !apartment.fullVideo) return;
  // wheel events aren't fired on touch devices, so this is purely desktop
  event.preventDefault();
  setApartmentVideoProgress(apartment, apartment.videoProgress + event.deltaY / 1400);
}

function handleApartmentTouchStart(apartment, event) {
  if (!apartment.expanded) return;
  apartment.touchStartY = event.touches[0].clientY;
}

function handleApartmentTouchMove(apartment, event) {
  if (!apartment.expanded) return;
  // while the apartment is open we take over the vertical gesture so
  // swiping up/down scrubs the video rather than scrolling the page
  event.preventDefault();
  const currentY = event.touches[0].clientY;
  const delta = apartment.touchStartY - currentY;
  apartment.touchStartY = currentY;
  // Throttle video progress updates to 16ms (60fps) on mobile
  apartment.throttledSetProgress(apartment.videoProgress + delta / 1000);
}

function lockPageScroll() {
  document.documentElement.classList.add("apartment-scroll-locked");
  document.body.classList.add("apartment-scroll-locked");
}

function unlockPageScroll() {
  document.documentElement.classList.remove("apartment-scroll-locked");
  document.body.classList.remove("apartment-scroll-locked");
}

function getViewportWidth() {
  return window.visualViewport?.width || window.innerWidth;
}

function getViewportHeight() {
  return window.visualViewport?.height || window.innerHeight;
}

function openApartment(apartment, options = {}) {
  const { instant = false, restoredProgress = 0 } = options;
  if (!apartment || !apartment.image || apartment.expanded || apartment.animating) {
    return;
  }
  if (activeApartment && activeApartment !== apartment) {
    return;
  }

  apartment.animating = !instant;
  const startRect = apartment.card.getBoundingClientRect();
  apartment.placeholder = document.createElement("div");
  apartment.placeholder.className = "apartment-placeholder";
  apartment.placeholder.style.display = "block";
  apartment.placeholder.style.width = `${startRect.width}px`;
  apartment.placeholder.style.height = `${startRect.height}px`;
  apartment.placeholder.style.borderRadius = "28px";
  apartment.placeholder.style.justifySelf = "center";
  apartment.card.insertAdjacentElement("afterend", apartment.placeholder);

  apartment.card.classList.add("apartment-card-expanded");
  document.body.classList.add("apartment-overlay-open");
  lockPageScroll();
  activeApartment = apartment;
  sessionStorage.setItem(APARTMENT_ACTIVE_KEY, apartment.id);
  if (apartment.overlayUi) {
    gsap.set(apartment.overlayUi, { autoAlpha: 0 });
  }
  const viewportWidth = getViewportWidth();
  const viewportHeight = getViewportHeight();

  gsap.set(apartment.card, {
    position: "fixed",
    top: instant ? 0 : startRect.top,
    left: instant ? 0 : startRect.left,
    width: instant ? viewportWidth : startRect.width,
    height: instant ? viewportHeight : startRect.height,
    margin: 0,
    borderRadius: instant ? 0 : 28,
    zIndex: 40
  });

  apartment.image.src = apartment.image.dataset.landscapeSrc;
  apartment.card.classList.remove("apartment-video-active");

  const finalizeOpen = () => {
    apartment.videoProgress = restoredProgress || 0;
    updateApartmentFacts(apartment, 0);
    // attach handlers unconditionally; on mobile they'll intercept
    // vertical swipes so the user can scrub the video.
    apartment.card.addEventListener("wheel", apartment.onWheel, { passive: false });
    apartment.card.addEventListener("touchstart", apartment.onTouchStart, { passive: false });
    apartment.card.addEventListener("touchmove", apartment.onTouchMove, { passive: false });
    setApartmentOverlayNavOpen(apartment, false);
    apartment.expanded = true;
    apartment.animating = false;
    if (apartment.title) gsap.set(apartment.title, { scale: 2 });

    prepareApartmentVideo(apartment, () => {
      apartment.card.classList.add("apartment-video-active");
      setApartmentVideoProgress(apartment, restoredProgress || 0);
    });
  };

  if (instant) {
    if (apartment.overlayUi) {
      gsap.set(apartment.overlayUi, { autoAlpha: 1 });
    }
    finalizeOpen();
    return;
  }

  gsap.to(apartment.card, {
    top: 0,
    left: 0,
    width: viewportWidth,
    height: viewportHeight,
    borderRadius: 0,
    duration: 0.72,
    ease: "power3.inOut",
    onComplete: finalizeOpen
  });

  if (apartment.title) {
    gsap.to(apartment.title, {
      scale: 2,
      duration: 0.72,
      ease: "power3.inOut"
    });
  }

  if (apartment.overlayUi) {
    gsap.to(apartment.overlayUi, {
      autoAlpha: 1,
      duration: 0.72,
      ease: "power2.out"
    });
  }
}

function closeApartment(apartment) {
  if (!apartment || !apartment.image || !apartment.expanded || apartment.animating) {
    return;
  }

  const endRect = apartment.placeholder?.getBoundingClientRect();
  if (!endRect) return;

  apartment.animating = true;
  apartment.card.removeEventListener("wheel", apartment.onWheel);
  apartment.card.removeEventListener("touchstart", apartment.onTouchStart);
  apartment.card.removeEventListener("touchmove", apartment.onTouchMove);

  const collapseCard = () => {
    if (apartment.overlayUi) {
      gsap.to(apartment.overlayUi, {
        autoAlpha: 0,
        duration: 0.62,
        ease: "power2.out"
      });
    }

    if (apartment.title) {
      gsap.to(apartment.title, {
        scale: 1,
        duration: 0.62,
        ease: "power3.inOut"
      });
    }

    gsap.to(apartment.card, {
      top: endRect.top,
      left: endRect.left,
      width: endRect.width,
      height: endRect.height,
      borderRadius: 28,
      duration: 0.62,
      ease: "power3.inOut",
      onComplete() {
        apartment.card.classList.remove("apartment-video-active");
        if (apartment.fullVideo) {
          apartment.fullVideo.pause();
          apartment.fullVideo.currentTime = 0;
        }
        apartment.videoProgress = 0;
        updateApartmentFacts(apartment, 0);
        apartment.image.src = apartment.image.dataset.portraitSrc;
        apartment.expanded = false;
        apartment.animating = false;
        apartment.card.classList.remove("apartment-card-expanded");
        setApartmentOverlayNavOpen(apartment, false);
        document.body.classList.remove("apartment-overlay-open");
        unlockPageScroll();
        if (apartment.overlayUi) {
          gsap.set(apartment.overlayUi, { clearProps: "opacity,visibility,pointerEvents" });
        }
        gsap.set(apartment.card, { clearProps: "all" });
        apartment.placeholder?.remove();
        apartment.placeholder = null;
        activeApartment = null;
        sessionStorage.setItem(APARTMENT_ACTIVE_KEY, "");
        sessionStorage.setItem(apartmentProgressKey(apartment.id), "0");
      }
    });
  };

  if (apartment.fullVideo && apartment.fullVideo.duration) {
    apartment.fullVideo.pause();
    const rewind = { progress: apartment.videoProgress };
    const rewindDuration = Math.max(0.35, apartment.videoProgress * 0.9);

    gsap.to(rewind, {
      progress: 0,
      duration: rewindDuration,
      ease: "none",
      onUpdate() {
        setApartmentVideoProgress(apartment, rewind.progress);
      },
      onComplete: collapseCard
    });
  } else {
    collapseCard();
  }
}

function restoreApartmentState() {
  const activeId = sessionStorage.getItem(APARTMENT_ACTIVE_KEY);
  if (!activeId) return;
  const apartment = apartments.find((item) => item.id === activeId);
  if (!apartment) return;
  const savedProgress = Number(sessionStorage.getItem(apartmentProgressKey(activeId)) || "0");
  const restoredProgress = Number.isFinite(savedProgress) ? savedProgress : 0;
  openApartment(apartment, { instant: true, restoredProgress });
}

apartments.forEach((apartment) => {
  apartment.onWheel = (event) => handleApartmentWheel(apartment, event);
  apartment.onTouchStart = (event) => handleApartmentTouchStart(apartment, event);
  apartment.onTouchMove = (event) => handleApartmentTouchMove(apartment, event);
  
  // Optional: Light throttle wheel events on desktop for skipped repaints (change to 16 if needed)
  // apartment.onWheel = throttle((event) => handleApartmentWheel(apartment, event), 8);

  apartment.overlayUi?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  apartment.overlayToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = apartment.card.classList.contains("apartment-nav-open");
    setApartmentOverlayNavOpen(apartment, !isOpen);
  });

  apartment.card.querySelectorAll(".apartment-overlay-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      setApartmentOverlayNavOpen(apartment, false);
    });
  });

  apartment.backButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeApartment(apartment);
  });

  apartment.card.addEventListener("click", () => {
    if (!apartment.expanded && !activeApartment) {
      openApartment(apartment);
    }
  });

  apartment.card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (apartment.expanded) {
        closeApartment(apartment);
      } else if (!activeApartment) {
        openApartment(apartment);
      }
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeApartment) {
    closeApartment(activeApartment);
  }
});

requestAnimationFrame(() => {
  restoreApartmentState();
});

apartments.forEach((apartment) => {
  prepareApartmentVideo(apartment);
});

const topNav = document.querySelector(".top-nav");
const topNavToggle = document.querySelector(".top-nav-toggle");
const topNavLinks = document.querySelector(".top-nav-links");
const introBadge = document.querySelector(".intro-badge");
const leftBlock = document.querySelector(".end-block-left");
const rightBlock = document.querySelector(".end-block-right");
const introEnd = 0.12;
const blocksStart = 0.88;
const blocksEnd = 0.98;
let heroVideoTween = null;
let heroResizeTimer = null;

function setTopNavOpenState(isOpen) {
  if (!topNav || !topNavToggle) return;
  topNav.classList.toggle("nav-open", isOpen);
  topNavToggle.setAttribute("aria-expanded", String(isOpen));
}

if (topNav && topNavToggle && topNavLinks) {
  setTopNavOpenState(false);

  topNavToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setTopNavOpenState(!topNav.classList.contains("nav-open"));
  });

  topNavLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      setTopNavOpenState(false);
    });
  });

  document.addEventListener("click", (event) => {
    if (window.innerWidth > 900) return;
    if (!topNav.contains(event.target)) {
      setTopNavOpenState(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setTopNavOpenState(false);
    }
  });

  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth > 900) {
        setTopNavOpenState(false);
      }
    },
    { passive: true }
  );
}

function getTopNavOffset() {
  if (!topNav) return 24;
  const rootVar = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--nav-top-offset")
  );
  if (Number.isFinite(rootVar)) return rootVar;
  const inlineTop = parseFloat(getComputedStyle(topNav).top);
  return Number.isFinite(inlineTop) ? inlineTop : 24;
}

function placeTopNavAbsolute() {
  if (!topNav) return;
  gsap.set(topNav, {
    position: "absolute",
    top: getTopNavOffset(),
    left: "50%",
    xPercent: -50,
    y: 0,
    autoAlpha: 1
  });
}

function placeTopNavFixed() {
  if (!topNav) return;
  gsap.set(topNav, {
    position: "fixed",
    top: getTopNavOffset(),
    left: "50%",
    xPercent: -50,
    autoAlpha: 1
  });
}

function getHeroScrollDistance() {
  if (window.innerWidth <= 767) return "+=150%";
  if (window.innerWidth <= 1023) return "+=180%";
  return "+=220%";
}

function clearHeroScrollScene() {
  ScrollTrigger.getById("hero-video-scroll")?.kill();
  ScrollTrigger.getById("hero-nav-follow")?.kill();
  if (heroVideoTween) {
    heroVideoTween.kill();
    heroVideoTween = null;
  }
}

function initHeroScrollScene() {
  // always rebuild the scene when size changes; the behaviour will
  // differ between desktop and mobile but the page should always
  // respond to scroll.
  if (!video || !video.duration) return;

  clearHeroScrollScene();
  video.pause();
  placeTopNavAbsolute();

  const isMobile = getViewportWidth() <= HERO_MOBILE_BREAKPOINT;
  
  if (introBadge) {
    gsap.set(introBadge, { autoAlpha: 1 });
  }
  if (leftBlock) {
    gsap.set(leftBlock, { xPercent: -100, autoAlpha: 0 });
  }
  if (rightBlock) {
    gsap.set(rightBlock, { xPercent: 100, autoAlpha: 0 });
  }

  heroVideoTween = gsap.to(video, {
    currentTime: video.duration,
    ease: "none",
    scrollTrigger: {
      id: "hero-video-scroll",
      trigger: ".video-section",
      start: "top top",
      end: getHeroScrollDistance(),
      scrub: isMobile ? 1 : true,
      // always pin so that scrolling is consumed by the video first;
      // anticipatePin is reduced on mobile to avoid jumping when the
      // element unpins
      pin: true,
      anticipatePin: isMobile ? 0 : 1,
      pinSpacing: true,
      invalidateOnRefresh: true,
      normalizeScroll: isMobile ? true : false,
      onLeave() {
        placeTopNavFixed();
        // On mobile: reveal content sections when hero is done scrolling
        if (isMobile) {
          document.body.classList.add("showcase-visible");
          document.body.classList.add("about-visible");
          document.body.classList.add("stats-visible");
          document.body.classList.add("worker-visible");
          document.body.classList.add("consult-visible");
          document.body.classList.add("footer-visible");
        }
      },
      onEnterBack() {
        placeTopNavAbsolute();
        // On mobile: hide content sections when returning to hero
        if (isMobile) {
          document.body.classList.remove("showcase-visible");
          document.body.classList.remove("about-visible");
          document.body.classList.remove("stats-visible");
          document.body.classList.remove("worker-visible");
          document.body.classList.remove("consult-visible");
          document.body.classList.remove("footer-visible");
        }
      },
      onUpdate(self) {
        const introProgress = gsap.utils.clamp(0, 1, self.progress / introEnd);
        if (introBadge) {
          gsap.set(introBadge, { autoAlpha: 1 - introProgress });
        }

        const blocksProgress = gsap.utils.clamp(
          0,
          1,
          (self.progress - blocksStart) / (blocksEnd - blocksStart)
        );
        if (leftBlock) {
          gsap.set(leftBlock, {
            xPercent: gsap.utils.interpolate(-100, 0, blocksProgress),
            autoAlpha: blocksProgress
          });
        }
        if (rightBlock) {
          gsap.set(rightBlock, {
            xPercent: gsap.utils.interpolate(100, 0, blocksProgress),
            autoAlpha: blocksProgress
          });
        }
      }
    }
  });

  if (topNav) {
    // follow behaviour only on wide non‑mobile viewports to avoid
    // forcing extra layout on phones
    const shouldFollowOnPage = !isMobile && window.innerWidth > 900;
    ScrollTrigger.create({
      id: "hero-nav-follow",
      trigger: ".video-section",
      start: "bottom top",
      end: "max",
      onEnter() {
        placeTopNavFixed();
        gsap.set(topNav, { y: 0 });
      },
      onUpdate(self) {
        if (!shouldFollowOnPage) return;
        const delta = Math.max(0, self.scroll() - self.start);
        gsap.set(topNav, { y: delta });
      },
      onEnterBack() {
        placeTopNavFixed();
        if (!shouldFollowOnPage) {
          gsap.set(topNav, { y: 0 });
          return;
        }
        const delta = Math.max(0, self.scroll() - self.start);
        gsap.set(topNav, { y: delta });
      },
      onLeaveBack() {
        gsap.set(topNav, { y: 0 });
        placeTopNavAbsolute();
      }
    });
  }

  ScrollTrigger.refresh();
}

video.addEventListener("loadedmetadata", initHeroScrollScene);

window.addEventListener(
  "resize",
  () => {
    window.clearTimeout(heroResizeTimer);
    heroResizeTimer = window.setTimeout(() => {
      initHeroScrollScene();
    }, 140);
  },
  { passive: true }
);

if (video.readyState >= 1) {
  initHeroScrollScene();
}
