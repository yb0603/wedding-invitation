/* =========================================================
   김유빈 · 박지인 모바일 청첩장 스크립트
   ========================================================= */
(function () {
  "use strict";

  // ---------------------------------------------------------
  // ⚙️ 배포 전 설정값
  // ---------------------------------------------------------
  // Google Apps Script 웹앱 배포 후 발급되는 URL을 여기에 넣으세요.
  // (설정 방법: js/rsvp-apps-script.gs 및 함께 제공된 배포 안내 참고)
  var APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwFWD4Lz7bj4tGj_k3DpmSyFLiVaY67thazsoVjSiWlr6o2jbPfi73rqJWJ2oZs0zOzbg/exec"; // 예: "https://script.google.com/macros/s/xxxx/exec"

  // 카카오 디벨로퍼스에서 발급받은 JavaScript 키를 여기에 넣으면 지도가 표시됩니다.
  var KAKAO_MAP_APP_KEY = "78c51aaa6f628b3714df8311bcef1547"; // 예: "1234567890abcdef1234567890abcdef"

  var WEDDING_DATETIME = new Date("2026-12-13T12:30:00+09:00");
  var VENUE_QUERY = "성균관컨벤션웨딩홀";
  var VENUE_ADDRESS = "서울 종로구 성균관로 31";
  // 아래 두 값은 카카오맵 지오코더가 실패할 때만 쓰는 대략적인 폴백 좌표.
  // 정확한 위치는 initKakaoMap()에서 VENUE_ADDRESS를 실시간으로 지오코딩해서 구함.
  var VENUE_LAT = 37.5886;
  var VENUE_LNG = 126.9985;

  var GALLERY_IMAGES = [
    "0.jpg", "1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg",
    "7.jpg", "8.jpg", "9.jpg", "10.jpg", "11.jpg", "12.jpg", "13.jpg",
    "14.jpg", "15.jpg", "16.jpg", "17.jpg", "18.jpg", "19.jpg", "20.jpg",
    "21.jpg", "22.jpg"
  ];

  document.addEventListener("DOMContentLoaded", function () {
    initIntroLoader();
    initReveal();
    initDday();
    initContactModal();
    initAccountModal();
    initGallery();
    initKakaoMap();
    initRsvpModal();
    initBgm();
  });

  // ---------------------------------------------------------
  // 인트로 로딩 화면 (하트 + 'Wedding Invitation' 필기체 드로잉 후
  // 약 2초 뒤 커버 문구가 페이드업으로 노출)
  // ---------------------------------------------------------
  function initIntroLoader() {
    var loader = document.getElementById("intro-loader");
    var coverContent = document.getElementById("cover-content");

    if (!loader) {
      if (coverContent) coverContent.classList.add("is-visible");
      return;
    }

    document.documentElement.classList.add("intro-lock");

    // 드로잉 애니메이션(하트 1.4s + Wedding/Invitation 텍스트가 순차로 그려져 ≈ 2.9s)이
    // 끝난 뒤 약 2초 대기했다가 로더를 걷어내고 커버 문구를 페이드업.
    window.setTimeout(function () {
      loader.classList.add("is-hidden");
      document.documentElement.classList.remove("intro-lock");
      if (coverContent) coverContent.classList.add("is-visible");
      window.setTimeout(function () {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 1000);
    }, 4900);
  }

  // ---------------------------------------------------------
  // 배경음악 (자동재생 실패 시 첫 터치/클릭에서 재생 시도)
  // ---------------------------------------------------------
  function initBgm() {
    var audio = document.getElementById("bgm");
    var toggle = document.getElementById("bgm-toggle");
    if (!audio || !toggle) return;

    var setPlaying = function (playing) {
      toggle.classList.toggle("is-playing", playing);
      toggle.setAttribute("aria-pressed", playing ? "true" : "false");
    };

    var tryAutoplay = function () {
      var p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(function () { setPlaying(true); }).catch(function () {
          setPlaying(false);
          document.addEventListener("touchstart", playOnce, { once: true, passive: true });
          document.addEventListener("click", playOnce, { once: true });
        });
      }
    };

    var playOnce = function () {
      audio.play().then(function () { setPlaying(true); }).catch(function () {});
    };

    toggle.addEventListener("click", function () {
      if (audio.paused) {
        audio.play().then(function () { setPlaying(true); }).catch(function () {});
      } else {
        audio.pause();
        setPlaying(false);
      }
    });

    tryAutoplay();
  }

  // ---------------------------------------------------------
  // 스크롤 시 콘텐츠 페이드업 (제목/eyebrow 제외)
  // ---------------------------------------------------------
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    items.forEach(function (el) { io.observe(el); });
  }

  // ---------------------------------------------------------
  // D-DAY 계산 + 카운트업 애니메이션 + 실시간 시:분:초
  // ---------------------------------------------------------
  function initDday() {
    var labelEl = document.getElementById("dday-label");
    var daysEl = document.getElementById("dday-days");
    var hoursEl = document.getElementById("dday-hours");
    var minsEl = document.getElementById("dday-mins");
    var secsEl = document.getElementById("dday-secs");
    var wrap = document.querySelector(".dday-card");
    if (!labelEl || !daysEl) return;

    function pad2(n) { return String(n).padStart(2, "0"); }

    function remaining() {
      return WEDDING_DATETIME.getTime() - Date.now();
    }

    function tick() {
      var diff = remaining();
      var past = diff <= 0;
      labelEl.textContent = past ? "D+" : "D-DAY";
      var abs = Math.abs(diff);
      var d = Math.floor(abs / 86400000);
      var h = Math.floor((abs % 86400000) / 3600000);
      var m = Math.floor((abs % 3600000) / 60000);
      var s = Math.floor((abs % 60000) / 1000);
      daysEl.textContent = d;
      hoursEl.textContent = pad2(h);
      minsEl.textContent = pad2(m);
      secsEl.textContent = pad2(s);
    }

    function startLiveCountdown() {
      tick();
      setInterval(tick, 1000);
    }

    // 숫자 하나를 0에서 target까지 부드럽게 카운트업
    function animateUnit(el, target, duration, format, onDone) {
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
        var value = Math.round(eased * target);
        el.textContent = format ? format(value) : value;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else if (onDone) {
          onDone();
        }
      }
      requestAnimationFrame(step);
    }

    // 처음 화면에 들어올 때: 일 → 시 → 분 → 초 순서로 하나씩 카운트업,
    // 다 끝나면 실시간 카운트다운(매초 갱신) 시작
    function countUpAllThenGoLive() {
      var diff = remaining();
      var past = diff <= 0;
      labelEl.textContent = past ? "D+" : "D-DAY";
      var abs = Math.abs(diff);
      var targetD = Math.floor(abs / 86400000);
      var targetH = Math.floor((abs % 86400000) / 3600000);
      var targetM = Math.floor((abs % 3600000) / 60000);
      var targetS = Math.floor((abs % 60000) / 1000);

      animateUnit(daysEl, targetD, 700, null, function () {
        animateUnit(hoursEl, targetH, 450, pad2, function () {
          animateUnit(minsEl, targetM, 450, pad2, function () {
            animateUnit(secsEl, targetS, 350, pad2, startLiveCountdown);
          });
        });
      });
    }

    if (!wrap || !("IntersectionObserver" in window)) {
      countUpAllThenGoLive();
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countUpAllThenGoLive();
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    io.observe(wrap);
  }

  // ---------------------------------------------------------
  // 축하 연락하기 모달
  // ---------------------------------------------------------
  function initContactModal() {
    var openBtn = document.getElementById("open-contact");
    var closeBtn = document.getElementById("close-contact");
    var overlay = document.getElementById("contact-modal");
    if (!openBtn || !overlay) return;

    openBtn.addEventListener("click", function () {
      overlay.classList.add("is-open");
    });
    closeBtn.addEventListener("click", function () {
      overlay.classList.remove("is-open");
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.classList.remove("is-open");
    });
  }

  // ---------------------------------------------------------
  // 계좌번호 모달: 복사 버튼 + 토스 앱 바로 송금 딥링크
  // ---------------------------------------------------------
  function initAccountModal() {
    var openBtn = document.getElementById("open-account");
    var closeBtn = document.getElementById("close-account");
    var overlay = document.getElementById("account-modal");
    if (!openBtn || !overlay) return;

    openBtn.addEventListener("click", function () {
      overlay.classList.add("is-open");
    });
    closeBtn.addEventListener("click", function () {
      overlay.classList.remove("is-open");
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.classList.remove("is-open");
    });

    function fallbackCopy(text) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
    }

    var copyBtns = overlay.querySelectorAll(".account-copy");
    for (var i = 0; i < copyBtns.length; i++) {
      copyBtns[i].addEventListener("click", function () {
        var btn = this;
        var num = btn.getAttribute("data-account");
        var showCopied = function () {
          var original = btn.textContent;
          btn.textContent = "복사됨";
          btn.classList.add("is-copied");
          setTimeout(function () {
            btn.textContent = original;
            btn.classList.remove("is-copied");
          }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(num).then(showCopied).catch(function () {
            fallbackCopy(num);
            showCopied();
          });
        } else {
          fallbackCopy(num);
          showCopied();
        }
      });
    }

    // 토스 앱 딥링크 (비공식 스킴이라 기기/앱 버전에 따라 동작하지 않을 수 있음 —
    // 그럴 땐 위 복사 버튼으로 계좌번호를 복사해 붙여넣으면 된다)
    var tossBtns = overlay.querySelectorAll(".account-toss");
    for (var j = 0; j < tossBtns.length; j++) {
      tossBtns[j].addEventListener("click", function () {
        var bank = this.getAttribute("data-bank");
        var account = this.getAttribute("data-account");
        window.location.href =
          "supertoss://send?bank=" + encodeURIComponent(bank) +
          "&accountNo=" + encodeURIComponent(account) +
          "&origin=qr";
      });
    }
  }

  // ---------------------------------------------------------
  // 갤러리 캐러셀 (화살표 버튼 + 모바일 스와이프) + 확대 라이트박스
  // ---------------------------------------------------------
  function initGallery() {
    var grid = document.getElementById("gallery-grid");
    if (!grid) return;

    var lightbox = document.getElementById("gallery-lightbox");
    var lightboxImg = document.getElementById("lightbox-img");
    var lightboxIndexEl = document.getElementById("lightbox-index");
    var lightboxTotalEl = document.getElementById("lightbox-total");
    var lightboxClose = document.getElementById("lightbox-close");
    var lightboxPrev = document.getElementById("lightbox-prev");
    var lightboxNext = document.getElementById("lightbox-next");
    var lightboxViewport = document.getElementById("lightbox-viewport");

    var total = GALLERY_IMAGES.length;
    var current = 0;
    if (lightboxTotalEl) lightboxTotalEl.textContent = total;

    GALLERY_IMAGES.forEach(function (name, i) {
      var thumb = document.createElement("img");
      thumb.className = "gallery-grid__thumb";
      thumb.src = "assets/img/" + name;
      thumb.alt = "김유빈 박지인 웨딩 갤러리";
      thumb.loading = "lazy";
      thumb.addEventListener("click", function () { openLightbox(i); });
      grid.appendChild(thumb);
    });

    function preload(idx) {
      var i = (idx + total) % total;
      var pre = new Image();
      pre.src = "assets/img/" + GALLERY_IMAGES[i];
    }

    function render(idx, animate) {
      current = (idx + total) % total;
      var src = "assets/img/" + GALLERY_IMAGES[current];
      lightboxIndexEl.textContent = current + 1;
      resetZoom();

      if (animate === false) {
        lightboxImg.src = src;
      } else {
        lightboxImg.classList.add("is-fading");
        setTimeout(function () {
          lightboxImg.src = src;
          lightboxImg.classList.remove("is-fading");
        }, 150);
      }

      preload(current + 1);
      preload(current - 1);
    }

    // 확대 라이트박스
    if (!lightbox) return;

    // 핀치 줌 / 팬 상태
    var MIN_ZOOM = 1, MAX_ZOOM = 4;
    var zoomScale = 1, zoomX = 0, zoomY = 0;

    function applyZoom() {
      lightboxImg.style.transform =
        "translate(" + zoomX + "px, " + zoomY + "px) scale(" + zoomScale + ")";
    }
    function resetZoom() {
      zoomScale = 1; zoomX = 0; zoomY = 0;
      lightboxImg.style.transform = "";
    }
    function clampPan() {
      var maxOffset = Math.max(0, (zoomScale - 1) * 160);
      zoomX = Math.max(-maxOffset, Math.min(maxOffset, zoomX));
      zoomY = Math.max(-maxOffset, Math.min(maxOffset, zoomY));
    }
    function touchDistance(t1, t2) {
      var dx = t1.clientX - t2.clientX;
      var dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function openLightbox(idx) {
      render(idx, false);
      lightbox.classList.add("is-open");
    }
    function closeLightbox() {
      lightbox.classList.remove("is-open");
      resetZoom();
    }

    lightboxClose.addEventListener("click", closeLightbox);
    lightboxPrev.addEventListener("click", function () { render(current - 1); });
    lightboxNext.addEventListener("click", function () { render(current + 1); });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    // 라이트박스 제스처: 두 손가락 핀치 줌, 확대 중 한 손가락 팬,
    // 확대 안 된 상태에서는 한 손가락 스와이프로 사진 넘기기
    var gestureMode = null;
    var pinchStartDist = 0, pinchStartScale = 1;
    var panStartX = 0, panStartY = 0, panOriginX = 0, panOriginY = 0;
    var swipeStartX = 0, swipeStartY = 0;

    lightboxViewport.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        gestureMode = "pinch";
        pinchStartDist = touchDistance(e.touches[0], e.touches[1]);
        pinchStartScale = zoomScale;
      } else if (e.touches.length === 1) {
        if (zoomScale > 1) {
          gestureMode = "pan";
          panStartX = e.touches[0].clientX;
          panStartY = e.touches[0].clientY;
          panOriginX = zoomX;
          panOriginY = zoomY;
        } else {
          gestureMode = "swipe";
          swipeStartX = e.touches[0].clientX;
          swipeStartY = e.touches[0].clientY;
        }
      }
    }, { passive: true });

    lightboxViewport.addEventListener("touchmove", function (e) {
      if (gestureMode === "pinch" && e.touches.length === 2) {
        e.preventDefault();
        var dist = touchDistance(e.touches[0], e.touches[1]);
        zoomScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartScale * (dist / pinchStartDist)));
        clampPan();
        applyZoom();
      } else if (gestureMode === "pan" && e.touches.length === 1) {
        e.preventDefault();
        zoomX = panOriginX + (e.touches[0].clientX - panStartX);
        zoomY = panOriginY + (e.touches[0].clientY - panStartY);
        clampPan();
        applyZoom();
      }
    }, { passive: false });

    lightboxViewport.addEventListener("touchend", function (e) {
      if (gestureMode === "pinch") {
        if (zoomScale <= 1.02) resetZoom();
      } else if (gestureMode === "swipe") {
        var dx = e.changedTouches[0].clientX - swipeStartX;
        var dy = e.changedTouches[0].clientY - swipeStartY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) render(current + 1); else render(current - 1);
        }
      }
      gestureMode = null;
    }, { passive: true });
  }

  // ---------------------------------------------------------
  // 카카오맵
  // VENUE_ADDRESS를 카카오 지오코더로 실시간 변환해서 정확한 좌표에 지도를 찍는다.
  // (좌표를 수동으로 하드코딩하면 부정확할 수 있어, 주소 → 좌표 변환을 직접 한다.)
  // ---------------------------------------------------------
  function initKakaoMap() {
    var mapEl = document.getElementById("kakao-map");
    if (!mapEl || !KAKAO_MAP_APP_KEY) return; // 키 없으면 기본 안내문 유지

    mapEl.innerHTML = "";
    var script = document.createElement("script");
    script.src =
      "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" +
      KAKAO_MAP_APP_KEY +
      "&autoload=false&libraries=services";
    script.onload = function () {
      kakao.maps.load(function () {
        function renderMap(lat, lng) {
          var center = new kakao.maps.LatLng(lat, lng);
          var map = new kakao.maps.Map(mapEl, { center: center, level: 3 });
          var marker = new kakao.maps.Marker({ position: center });
          marker.setMap(map);
        }

        var geocoder = new kakao.maps.services.Geocoder();
        geocoder.addressSearch(VENUE_ADDRESS, function (result, status) {
          if (status === kakao.maps.services.Status.OK && result[0]) {
            var lat = parseFloat(result[0].y);
            var lng = parseFloat(result[0].x);
            renderMap(lat, lng);
          } else {
            // 지오코딩 실패 시에만 대략 좌표로 대체
            renderMap(VENUE_LAT, VENUE_LNG);
          }
        });
      });
    };
    document.head.appendChild(script);
  }

  // ---------------------------------------------------------
  // RSVP 모달 + 전송
  // ---------------------------------------------------------
  function initRsvpModal() {
    var openBtn = document.getElementById("open-rsvp");
    var closeBtn = document.getElementById("close-rsvp");
    var overlay = document.getElementById("rsvp-modal");
    var form = document.getElementById("rsvp-form");
    var msg = document.getElementById("rsvp-msg");
    if (!openBtn || !overlay || !form) return;

    openBtn.addEventListener("click", function () {
      overlay.classList.add("is-open");
    });
    closeBtn.addEventListener("click", function () {
      overlay.classList.remove("is-open");
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.classList.remove("is-open");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!APPS_SCRIPT_URL) {
        msg.classList.add("is-error");
        msg.textContent = "관리자 설정이 완료되면 참석 의사 전달이 활성화됩니다.";
        return;
      }

      var data = {
        name: form.name.value.trim(),
        side: form.side.value,
        attend: form.attend.value,
        count: form.count.value,
        tel: form.tel.value.trim()
      };

      if (!data.name) {
        msg.classList.add("is-error");
        msg.textContent = "이름을 입력해주세요.";
        return;
      }

      var submitBtn = form.querySelector(".rsvp-submit");
      submitBtn.disabled = true;
      msg.classList.remove("is-error");
      msg.textContent = "전달 중...";

      fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" }, // Apps Script CORS 단순 요청 유지용
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          if (result && result.ok) {
            msg.classList.remove("is-error");
            msg.textContent = "참석 의사가 전달되었습니다. 감사합니다.";
            form.reset();
            setTimeout(function () { overlay.classList.remove("is-open"); }, 1400);
          } else {
            throw new Error("응답 오류");
          }
        })
        .catch(function () {
          msg.classList.add("is-error");
          msg.textContent = "전달에 실패했습니다. 잠시 후 다시 시도해주세요.";
        })
        .finally(function () {
          submitBtn.disabled = false;
        });
    });
  }
})();
