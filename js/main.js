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
  var APPS_SCRIPT_URL = ""; // 예: "https://script.google.com/macros/s/xxxx/exec"

  // 카카오 디벨로퍼스에서 발급받은 JavaScript 키를 여기에 넣으면 지도가 표시됩니다.
  var KAKAO_MAP_APP_KEY = ""; // 예: "1234567890abcdef1234567890abcdef"

  var WEDDING_DATETIME = new Date("2026-12-13T12:30:00+09:00");
  var VENUE_QUERY = "성균관컨벤션웨딩홀";
  var VENUE_LAT = 37.5886; // 성균관컨벤션웨딩홀 대략 위치 (혜화역 인근)
  var VENUE_LNG = 126.9985;

  var GALLERY_IMAGES = [
    "KUHO8511.jpg", "KUHO8645.jpg", "KUHO8948.jpg", "DYL_9893.jpg",
    "KUHO9004.jpg", "KUHO9022.jpg", "KUHO9110.jpg", "KUHO9197.jpg",
    "KUHO9241.jpg", "DYL_0100.jpg", "KUHO9318.jpg", "KUHO9515.jpg",
    "KUHO9606.jpg", "KUHO9710.jpg", "DYL_0147.jpg", "KUHO9768.jpg",
    "KUHO9773.jpg", "KUHO9782.jpg", "KUHO9889.jpg", "DYL_0187.jpg",
    "KUHO9921.jpg", "KUHO9985.jpg", "KUHO9999.jpg", "KUHO0121.jpg",
    "KUHO0136.jpg", "KUHO0166.jpg", "KUHO0203.jpg", "KUHO0259.jpg",
    "KUHO0269.jpg", "KUHO0295.jpg"
  ];

  document.addEventListener("DOMContentLoaded", function () {
    initReveal();
    initDday();
    initContactModal();
    initCarousel();
    initKakaoMap();
    initTmapLink();
    initRsvpModal();
  });

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
  // 갤러리 캐러셀 (화살표 버튼 + 모바일 스와이프)
  // ---------------------------------------------------------
  function initCarousel() {
    var viewport = document.getElementById("carousel-viewport");
    var img = document.getElementById("carousel-img");
    var prevBtn = document.getElementById("carousel-prev");
    var nextBtn = document.getElementById("carousel-next");
    var indexEl = document.getElementById("carousel-index");
    var totalEl = document.getElementById("carousel-total");
    if (!viewport || !img) return;

    var total = GALLERY_IMAGES.length;
    var current = 0;
    totalEl.textContent = total;

    function preload(idx) {
      var i = (idx + total) % total;
      var pre = new Image();
      pre.src = "assets/img/" + GALLERY_IMAGES[i];
    }

    function render(idx, animate) {
      current = (idx + total) % total;
      indexEl.textContent = current + 1;
      if (animate === false) {
        img.src = "assets/img/" + GALLERY_IMAGES[current];
        return;
      }
      img.classList.add("is-fading");
      setTimeout(function () {
        img.src = "assets/img/" + GALLERY_IMAGES[current];
        img.classList.remove("is-fading");
      }, 150);
      preload(current + 1);
      preload(current - 1);
    }

    render(0, false);
    preload(1);
    preload(-1);

    prevBtn.addEventListener("click", function () { render(current - 1); });
    nextBtn.addEventListener("click", function () { render(current + 1); });

    // 모바일 스와이프
    var startX = 0, startY = 0, tracking = false;
    viewport.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });
    viewport.addEventListener("touchend", function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) render(current + 1); else render(current - 1);
      }
    }, { passive: true });
  }

  // ---------------------------------------------------------
  // 카카오맵
  // ---------------------------------------------------------
  function initKakaoMap() {
    var mapEl = document.getElementById("kakao-map");
    if (!mapEl || !KAKAO_MAP_APP_KEY) return; // 키 없으면 기본 안내문 유지

    mapEl.innerHTML = "";
    var script = document.createElement("script");
    script.src =
      "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" +
      KAKAO_MAP_APP_KEY +
      "&autoload=false";
    script.onload = function () {
      kakao.maps.load(function () {
        var map = new kakao.maps.Map(mapEl, {
          center: new kakao.maps.LatLng(VENUE_LAT, VENUE_LNG),
          level: 3
        });
        var marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(VENUE_LAT, VENUE_LNG)
        });
        marker.setMap(map);
      });
    };
    document.head.appendChild(script);
  }

  // ---------------------------------------------------------
  // TMAP 길찾기 링크
  // (tmap://search?name= 는 TMap이 지원하지 않는 액션이라 열리지 않음.
  //  공식적으로 확인된 형식은 tmap://route?rGoName=&rGoX=&rGoY= 이며,
  //  목적지 좌표가 필요하므로 위의 VENUE_LAT/VENUE_LNG를 사용한다.)
  // ---------------------------------------------------------
  function initTmapLink() {
    var link = document.getElementById("tmap-link");
    if (!link) return;
    link.href =
      "tmap://route?rGoName=" + encodeURIComponent(VENUE_QUERY) +
      "&rGoX=" + VENUE_LNG +
      "&rGoY=" + VENUE_LAT;
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
