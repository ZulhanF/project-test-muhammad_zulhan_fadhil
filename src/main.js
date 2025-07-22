import "./style.css";

const API_URL = "https://suitmedia-backend.suitdev.com/api/ideas";  // Ubah ke URL absolut
const postList = document.getElementById("postList");
const showPerPage = document.getElementById("showPerPage");
const sortBy = document.getElementById("sortBy");
const pagination = document.getElementById("pagination");

let currentState = {
  page: 1,
  size: 10,
  sort: "-published_at",
};

function loadStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  currentState = {
    page: parseInt(params.get("page")) || 1,
    size: parseInt(params.get("size")) || 10,
    sort: params.get("sort") || "-published_at",
  };

  showPerPage.value = currentState.size;
  sortBy.value = currentState.sort;
}

function updateURL() {
  const params = new URLSearchParams();
  params.set("page", currentState.page);
  params.set("size", currentState.size);
  params.set("sort", currentState.sort);
  window.history.pushState({}, "", `${window.location.pathname}?${params}`);
}

async function fetchPosts() {
  try {
    const params = new URLSearchParams({
      "page[number]": currentState.page,
      "page[size]": currentState.size,
      sort: currentState.sort,
    });

    params.append("append[]", "small_image");
    params.append("append[]", "medium_image");

    const url = `${API_URL}?${params}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching posts:", error);
    return null;
  }
}

function createPostCard(post) {
  const getValidImageUrl = () => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = post.content;
    const firstImg = tempDiv.querySelector("img");
    return firstImg?.src || "/icon.png";
  };

  const imageUrl = getValidImageUrl();

  return `
    <div class="bg-white rounded-lg shadow p-4 flex flex-col">
      <div class="relative aspect-[16/9] mb-3 overflow-hidden bg-gray-100">
        <img
          src="${imageUrl}"
          alt="${post.title || "Post image"}"
          class="w-full h-full object-cover rounded"
          loading="lazy"
          onerror="this.src='/icon.png'"
        />
      </div>
      <div class="font-bold text-lg line-clamp-3 h-[4.5em] mb-2">
        ${post.title || "Untitled Post"}
      </div>
      <div class="text-sm text-gray-500 mb-1">
        Published: ${new Date(post.published_at).toLocaleDateString()}
      </div>
    </div>
  `;
}

function renderPagination(meta) {
  if (!meta) return;

  const { current_page, last_page } = meta;

  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= last_page; i++) {
      if (
        i === 1 ||
        i === last_page ||
        i >= current_page - delta && i <= current_page + delta
      ) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const pages = getPageNumbers();
  let paginationHTML = `
    <button class="px-2 py-1 rounded cursor-pointer text-black disabled:opacity-50 flex items-center hover:bg-orange-100" 
            ${current_page === 1 ? 'disabled' : ''} 
            data-page="1">
      <span class="material-icons text-lg">keyboard_double_arrow_left</span>
    </button>
    <button class="px-2 py-1 rounded cursor-pointer text-black disabled:opacity-50 flex items-center hover:bg-orange-100" 
            ${current_page === 1 ? 'disabled' : ''} 
            data-page="${current_page - 1}">
      <span class="material-icons text-lg">keyboard_arrow_left</span>
    </button>
  `;

  pages.forEach(page => {
    if (page === '...') {
      paginationHTML += `<span class="px-3 py-1">...</span>`;
    } else {
      paginationHTML += `
        <button class="min-w-[40px] px-3 py-1 rounded hover:bg-orange-100 ${
          current_page === page 
            ? 'bg-orange-500 text-white hover:bg-orange-600' 
            : 'text-gray-700'
        }" data-page="${page}">
          ${page}
        </button>
      `;
    }
  });

  paginationHTML += `
    <button class="px-2 py-1 rounded cursor-pointer text-black disabled:opacity-50 flex items-center hover:bg-orange-100" 
            ${current_page === last_page ? 'disabled' : ''} 
            data-page="${current_page + 1}">
      <span class="material-icons text-lg">keyboard_arrow_right</span>
    </button>
    <button class="px-2 py-1 rounded cursor-pointer text-black disabled:opacity-50 flex items-center hover:bg-orange-100" 
            ${current_page === last_page ? 'disabled' : ''} 
            data-page="${last_page}">
      <span class="material-icons text-lg">keyboard_double_arrow_right</span>
    </button>
  `;

  pagination.innerHTML = paginationHTML;
}

async function renderPosts() {
  postList.innerHTML = '<p class="col-span-full text-center">Loading posts...</p>';

  const data = await fetchPosts();
  if (!data) {
    postList.innerHTML = '<p class="col-span-full text-center text-red-500">Failed to load posts. Please try again later.</p>';
    return;
  }

  if (!data.data || !Array.isArray(data.data)) {
    postList.innerHTML = '<p class="col-span-full text-center text-red-500">Invalid data format received</p>';
    return;
  }

  postList.innerHTML = data.data.map(post => createPostCard(post)).join("");
  renderPagination(data.meta);
}

function initializeNavigation() {
  const navItems = document.querySelectorAll("nav ul li");
  const currentActive = localStorage.getItem("activeNav") || "Ideas";

  navItems.forEach((item) => {
    const link = item.querySelector("a");
    const text = link.textContent;

    item.classList.remove("border-b-5", "border-white", "pb-2");

    if (text === currentActive) {
      item.classList.add("border-b-5", "border-white", "pb-2");
    }

    link.addEventListener("click", (e) => {
      e.preventDefault();
      navItems.forEach((navItem) => {
        navItem.classList.remove("border-b-5", "border-white", "pb-2");
      });
      item.classList.add("border-b-5", "border-white", "pb-2");
      localStorage.setItem("activeNav", text);
    });
  });
}

function initializeHeader() {
  const header = document.querySelector("nav");
  let lastScroll = 0;

  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
      header.style.backgroundColor = "rgba(249, 115, 22, 0.8)";
    } else {
      header.style.backgroundColor = "rgb(249, 115, 22)";
    }

    if (currentScroll > lastScroll && currentScroll > 100) {
      header.style.transform = "translateY(-100%)";
    } else {
      header.style.transform = "translateY(0)";
    }

    lastScroll = currentScroll;
  });
}

function initializeParallax() {
  const banner = document.querySelector(".banner-section");
  const title = banner.querySelector("h1");
  const subtitle = banner.querySelector("p");

  window.addEventListener("scroll", () => {
    const scroll = window.pageYOffset;
    const bannerHeight = banner.offsetHeight;

    if (scroll <= bannerHeight) {
      banner.style.backgroundPositionY = `${scroll * 0.7}px`;
      title.style.transform = `translateY(${scroll * 0.5}px)`;
      subtitle.style.transform = `translateY(${scroll * 0.3}px)`;
      const opacity = 1 - scroll / bannerHeight;
      title.style.opacity = opacity;
      subtitle.style.opacity = opacity;
    }
  });
}

function addHeaderTransitions() {
  const header = document.querySelector("nav");
  header.style.transition = "all 0.3s ease-in-out";
}

showPerPage.addEventListener("change", (e) => {
  currentState.size = parseInt(e.target.value);
  currentState.page = 1;
  updateURL();
  renderPosts();
});

sortBy.addEventListener("change", (e) => {
  currentState.sort = e.target.value;
  currentState.page = 1;
  updateURL();
  renderPosts();
});

pagination.addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (!button || button.disabled) return;

  const newPage = parseInt(button.dataset.page);
  if (newPage && newPage !== currentState.page) {
    currentState.page = newPage;
    updateURL();
    renderPosts();
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadStateFromURL();
  renderPosts();
  initializeNavigation();
  initializeHeader();
  initializeParallax();
  addHeaderTransitions();
});
