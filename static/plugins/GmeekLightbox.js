(function () {
  // 灯箱插件
  class Lightbox {
    constructor(options = {}) {
      // 默认配置
      this.options = Object.assign(
        {
          selector: ".markdown-body img, .article-content img", // 更通用的选择器
          lazyAttribute: "data-src", // 懒加载属性
          animationDuration: 300,
          closeOnOverlayClick: true,
          onOpen: null,
          onClose: null,
          onNavigate: null,
        },
        options
      );

      this.images = [];
      this.currentIndex = 0;
      this.isOpen = false;
      this.isZoomed = false;
      this.zoomLevel = 1;
      this.touchStartX = 0;
      this.touchEndX = 0;
      this.wheelTimer = null;
      this.previousBodyOverflow = "";

      this.init();
    }

    init() {
      this.createStyles();
      this.createLightbox();
      this.bindEvents();
      this.gatherImages();
    }

    // 收集图片
    gatherImages() {
      this.images = Array.from(
        document.querySelectorAll(this.options.selector)
      );

      // 为图片添加特殊属性以标识它们
      this.images.forEach((img) => {
        img.setAttribute("data-lightbox", "true");
      });
    }

    createStyles() {
      // 避免重复创建样式
      if (document.querySelector("#lb-lightbox-styles")) return;

      const style = document.createElement("style");
      style.id = "lb-lightbox-styles";
      style.textContent = `
        .lb-lightbox-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(5px);
          display: flex;
          justify-content: center;
          align-items: center;
          opacity: 0;
          transition: opacity ${this.options.animationDuration}ms ease;
          pointer-events: none;
          z-index: -1;
        }
        .lb-lightbox-overlay.active {
          opacity: 1;
          pointer-events: auto;
          z-index: 10000;
        }
        .lb-lightbox-content-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
              width: 100%;
          height: 100%;
        }
        .lb-lightbox-container {
          max-width: 90%;
          max-height: 90%;
          position: relative;
          transition: transform ${this.options.animationDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1);
        }
        .lb-lightbox-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          transition: transform ${this.options.animationDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity ${this.options.animationDuration}ms ease;
          cursor: grab;
        }
        .lb-lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background-color: rgba(255, 255, 255, 0.8);
          color: #333;
          border: none;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          font-size: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          z-index: 10001;
        }
        .lb-lightbox-nav:hover {
          background-color: rgba(255, 255, 255, 1);
          transform: translateY(-50%) scale(1.1);
        }
        .lb-lightbox-nav:active {
          transform: translateY(-50%) scale(0.9);
        }
        .lb-lightbox-prev {
          left: 20px;
        }
        .lb-lightbox-next {
          right: 20px;
        }
        .lb-lightbox-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background-color: rgba(255, 255, 255, 0.8);
          color: #333;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          font-size: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          z-index: 10001;
        }
        .lb-lightbox-close:hover {
          background-color: rgba(255, 255, 255, 1);
          transform: scale(1.1);
        }
        .lb-lightbox-close:active {
          transform: scale(0.9);
        }
        .lb-lightbox-caption {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          background: rgba(0, 0, 0, 0.5);
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 14px;
          max-width: 80%;
          text-align: center;
          z-index: 10001;
        }
        @media (max-width: 768px) {
          .lb-lightbox-nav {
            width: 40px;
            height: 40px;
            font-size: 20px;
          }
          .lb-lightbox-close {
            width: 35px;
            height: 35px;
            font-size: 20px;
          }
          .lb-lightbox-caption {
            font-size: 12px;
            bottom: 10px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    createLightbox() {
      // 避免重复创建
      if (document.querySelector(".lb-lightbox-overlay")) return;

      this.overlay = document.createElement("div");
      this.overlay.className = "lb-lightbox-overlay";

      this.contentWrapper = document.createElement("div");
      this.contentWrapper.className = "lb-lightbox-content-wrapper";

      this.container = document.createElement("div");
      this.container.className = "lb-lightbox-container";

      this.image = document.createElement("img");
      this.image.className = "lb-lightbox-image";
      this.image.setAttribute("draggable", "false");

      this.caption = document.createElement("div");
      this.caption.className = "lb-lightbox-caption";

      this.prevButton = document.createElement("button");
      this.prevButton.className = "lb-lightbox-nav lb-lightbox-prev";
      this.prevButton.innerHTML = "&#10094;";
      this.prevButton.setAttribute("aria-label", "上一张图片");

      this.nextButton = document.createElement("button");
      this.nextButton.className = "lb-lightbox-nav lb-lightbox-next";
      this.nextButton.innerHTML = "&#10095;";
      this.nextButton.setAttribute("aria-label", "下一张图片");

      this.closeButton = document.createElement("button");
      this.closeButton.className = "lb-lightbox-close";
      this.closeButton.innerHTML = "&times;";
      this.closeButton.setAttribute("aria-label", "关闭灯箱");

      this.container.appendChild(this.image);
      this.contentWrapper.appendChild(this.container);
      this.contentWrapper.appendChild(this.caption);
      this.contentWrapper.appendChild(this.prevButton);
      this.contentWrapper.appendChild(this.nextButton);
      this.contentWrapper.appendChild(this.closeButton);

      this.overlay.appendChild(this.contentWrapper);

      document.body.appendChild(this.overlay);
    }

    bindEvents() {
      // 事件委托处理图片点击
      document.addEventListener("click", (e) => {
        // 检查点击元素是否是图片或图片的父链接
        const target = e.target;
        const img = target.closest("img");
        const anchor = target.closest("a");

        // 处理图片点击
        if (img && img.hasAttribute("data-lightbox")) {
          this.handleImageClick(e, img);
        }
        // 处理包裹图片的链接点击
        else if (anchor && anchor.querySelector("img[data-lightbox]")) {
          const imgInAnchor = anchor.querySelector("img[data-lightbox]");
          if (imgInAnchor) {
            this.handleImageClick(e, imgInAnchor);
          }
        }
      });

      // 灯箱内部事件
      this.overlay.addEventListener(
        "click",
        this.handleOverlayClick.bind(this)
      );
      this.prevButton.addEventListener(
        "click",
        this.showPreviousImage.bind(this)
      );
      this.nextButton.addEventListener("click", this.showNextImage.bind(this));
      this.closeButton.addEventListener("click", this.close.bind(this));
      document.addEventListener("keydown", this.handleKeyDown.bind(this));
      this.overlay.addEventListener("wheel", this.handleWheel.bind(this), {
        passive: false,
      });
      this.overlay.addEventListener(
        "touchstart",
        this.handleTouchStart.bind(this),
        { passive: true }
      );
      this.overlay.addEventListener("touchend", this.handleTouchEnd.bind(this));

      // 图片拖动事件
      this.image.addEventListener("mousedown", this.handleDragStart.bind(this));
      document.addEventListener("mousemove", this.handleDragMove.bind(this));
      document.addEventListener("mouseup", this.handleDragEnd.bind(this));
    }

    handleImageClick(event, img) {
      if (img && !this.isOpen) {
        // 阻止默认行为和事件冒泡
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        // 重新收集图片（因为可能有动态加载的内容）
        this.gatherImages();
        this.currentIndex = this.images.indexOf(img);
        this.open();
      }
    }

    handleOverlayClick(event) {
      if (event.target === this.overlay && this.options.closeOnOverlayClick) {
        this.close();
      }
    }

    handleKeyDown(event) {
      if (!this.isOpen) return;

      switch (event.key) {
        case "ArrowLeft":
          this.showPreviousImage();
          break;
        case "ArrowRight":
          this.showNextImage();
          break;
        case "Escape":
          this.close();
          break;
        case "+":
        case "=":
          this.zoom(0.2);
          break;
        case "-":
          this.zoom(-0.2);
          break;
      }
    }

    handleWheel(event) {
      if (!this.isOpen) return;

      event.preventDefault();
      clearTimeout(this.wheelTimer);

      // 如果按住Ctrl键，则缩放
      if (event.ctrlKey) {
        const delta = Math.sign(event.deltaY);
        this.zoom(-delta * 0.1);
      }
      // 否则导航图片
      else {
        this.wheelTimer = setTimeout(() => {
          const delta = Math.sign(event.deltaY);
          if (delta > 0) {
            this.showNextImage();
          } else {
            this.showPreviousImage();
          }
        }, 50);
      }
    }

    handleTouchStart(event) {
      if (!this.isOpen) return;
      this.touchStartX = event.touches[0].clientX;
    }

    handleTouchEnd(event) {
      if (!this.isOpen) return;

      this.touchEndX = event.changedTouches[0].clientX;
      const difference = this.touchStartX - this.touchEndX;

      if (Math.abs(difference) > 50) {
        if (difference > 0) {
          this.showNextImage();
        } else {
          this.showPreviousImage();
        }
      }
    }

    handleDragStart(event) {
      if (!this.isZoomed) return;

      this.isDragging = true;
      this.dragStartX = event.clientX - this.image.offsetLeft;
      this.dragStartY = event.clientY - this.image.offsetTop;
      this.image.style.cursor = "grabbing";
    }

    handleDragMove(event) {
      if (!this.isDragging || !this.isZoomed) return;

      const offsetX = event.clientX - this.dragStartX;
      const offsetY = event.clientY - this.dragStartY;

      // 限制拖动范围
      const maxX = (this.container.clientWidth * (this.zoomLevel - 1)) / 2;
      const maxY = (this.container.clientHeight * (this.zoomLevel - 1)) / 2;

      this.image.style.left = `${Math.max(-maxX, Math.min(offsetX, maxX))}px`;
      this.image.style.top = `${Math.max(-maxY, Math.min(offsetY, maxY))}px`;
    }

    handleDragEnd() {
      if (!this.isDragging) return;

      this.isDragging = false;
      this.image.style.cursor = "grab";
    }

    open() {
      if (this.images.length === 0) return;

      this.isOpen = true;
      this.overlay.classList.add("active");
      this.showImage();
      this.previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      if (typeof this.options.onOpen === "function") {
        this.options.onOpen();
      }
    }

    close() {
      this.isOpen = false;
      this.overlay.classList.remove("active");
      document.body.style.overflow = this.previousBodyOverflow;

      setTimeout(() => {
        this.image.style.transform = "";
        this.image.style.left = "";
        this.image.style.top = "";
        this.zoomLevel = 1;
        this.isZoomed = false;
      }, this.options.animationDuration);

      if (typeof this.options.onClose === "function") {
        this.options.onClose();
      }
    }

    showPreviousImage() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.showImage();
      }
    }

    showNextImage() {
      if (this.currentIndex < this.images.length - 1) {
        this.currentIndex++;
        this.showImage();
      }
    }

    showImage() {
      if (this.currentIndex < 0 || this.currentIndex >= this.images.length)
        return;

      const imgElement = this.images[this.currentIndex];
      // 支持懒加载属性
      const imgSrc =
        imgElement.getAttribute(this.options.lazyAttribute) || imgElement.src;

      // 获取图片描述
      const captionText = imgElement.getAttribute("alt") || "";
      this.caption.textContent = captionText;
      this.caption.style.display = captionText ? "block" : "none";

      this.image.style.opacity = "0";
      this.image.style.transform = "";
      this.image.style.left = "";
      this.image.style.top = "";
      this.zoomLevel = 1;
      this.isZoomed = false;

      const newImage = new Image();
      newImage.src = imgSrc;
      newImage.onload = () => {
        this.image.src = imgSrc;
        this.image.alt = captionText;
        this.image.style.opacity = "1";
      };

      this.prevButton.style.display = this.currentIndex > 0 ? "block" : "none";
      this.nextButton.style.display =
        this.currentIndex < this.images.length - 1 ? "block" : "none";

      if (typeof this.options.onNavigate === "function") {
        this.options.onNavigate(this.currentIndex);
      }

      this.preloadImages();
    }

    zoom(factor) {
      this.zoomLevel += factor;
      this.zoomLevel = Math.max(1, Math.min(this.zoomLevel, 3));
      this.image.style.transform = `scale(${this.zoomLevel})`;
      this.isZoomed = this.zoomLevel !== 1;

      // 重置拖动位置
      if (!this.isZoomed) {
        this.image.style.left = "";
        this.image.style.top = "";
      }
    }

    preloadImages() {
      if (this.currentIndex > 0) {
        const prevImg = this.images[this.currentIndex - 1];
        const prevSrc =
          prevImg.getAttribute(this.options.lazyAttribute) || prevImg.src;
        new Image().src = prevSrc;
      }

      if (this.currentIndex < this.images.length - 1) {
        const nextImg = this.images[this.currentIndex + 1];
        const nextSrc =
          nextImg.getAttribute(this.options.lazyAttribute) || nextImg.src;
        new Image().src = nextSrc;
      }
    }
  }

  // 将 Lightbox 类添加到全局对象
  window.Lightbox = Lightbox;

  // 自动初始化
  document.addEventListener("DOMContentLoaded", () => {
    window.lightbox = new Lightbox();
  });
})();
