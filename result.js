const theme = localStorage.getItem("selectedTheme") || "Adventure";
document.getElementById("theme-name").textContent = theme.toUpperCase();

const animeGrid = document.getElementById("anime-list");
animeGrid.innerHTML = "<p>Loading recommendations...</p>";

// Pagination buttons
const paginationDiv = document.createElement("div");
paginationDiv.style.marginTop = "20px";
paginationDiv.style.display = "flex";
paginationDiv.style.justifyContent = "center";
paginationDiv.style.gap = "15px";

const prevBtn = document.createElement("button");
prevBtn.textContent = "Previous";
prevBtn.style.padding = "10px 20px";
prevBtn.style.fontSize = "16px";
prevBtn.style.cursor = "pointer";

const nextBtn = document.createElement("button");
nextBtn.textContent = "Next";
nextBtn.style.padding = "10px 20px";
nextBtn.style.fontSize = "16px";
nextBtn.style.cursor = "pointer";

paginationDiv.appendChild(prevBtn);
paginationDiv.appendChild(nextBtn);
animeGrid.after(paginationDiv);

// Curated anime list fallback
const curatedList = {
  "Music": ["Kono Oto Tomare! Sounds of Life", "Forest Piano","Oshi no Ko"],
  "Sports": ["Haikyuu!!", "Kuroko's Basketball", "Blue Lock", "Yuri On Ice"],
  "Adventure": ["One Piece", "Hunter x Hunter", "Fullmetal Alchemist", "Frieren", "Dororo"],
  "Action": ["Attack on Titan", "Demon Slayer: Kimetsu no Yaiba", "Jujutsu Kaisen", "Black Clover", "Bleach: Thousand-Year Blood War", "Solo Leveling", "Naruto Shippuden", "Wind Breaker"],
  "Fantasy": ["Suzume", "That Time I Got Reincarnated as a Slime", "Welcome to Demon School Iruma-Kun", "Howl's Moving Castle", "To Your Eternity", "Castle In The Sky", "Kiki's Delivery Service", "Mary and The Witch's Flower", "Nausicaa of the Valley of the Wind"],
  "Romance": ["Your Name", "Horimiya", "Fruits Basket", "A Silent Voice", "Ao Haru Ride", "From Me to You", "To Every You I've Loved Before", "To Me, the One Who Loved You", "A Sign of Affection", "Whisper of the Heart", "From Up on Poppy Hill", "7th Time Loop"],
  "Sci-Fi": ["Summer Time Rendering", "Tokyo Revengers", "Dr. Stone", "Noragami"],
  "Comedy": ["Barakamon", "Gintama", "Daily Lives of High School Boys", "Spy x Family", "Ouran High School Host Club", "Mashle: Magic and Muscles"],
  "Mystery": ["Erased", "Hyouka", "The Apothecary Diaries", "Death Note", "Charlotte"]
};

let currentPage = 1;
const itemsPerPage = 9;
let allTitles = [];

// Load all titles from AniList API
async function loadAllTitles() {
  animeGrid.innerHTML = "<p>Loading recommendations...</p>";
  try {
    const anilistQuery = `
      query ($genre: String, $page: Int) {
        Page(page: $page, perPage: 50) {
          media(genre_in: [$genre], type: ANIME, sort: POPULARITY_DESC) {
            title {
              romaji
            }
          }
        }
      }
    `;

    const variables = { genre: theme, page: 1 };
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: anilistQuery, variables })
    });

    const data = await response.json();
    let fetchedTitles = data.data.Page.media.map(m => m.title.romaji);

    // Merge curated list 
    const customTitles = curatedList[theme] || [];
    allTitles = [...new Set([...customTitles, ...fetchedTitles])];

    if (allTitles.length === 0) {
      animeGrid.innerHTML = "<p>No anime found for the selected genre.</p>";
      paginationDiv.style.display = "none";
      return;
    }

    paginationDiv.style.display = "flex";
    renderPage(currentPage);
  } catch (error) {
      console.error("Error fetching titles:", error);
      animeGrid.innerHTML = "<p>Could not load recommendations.</p>";
      paginationDiv.style.display = "none";
    }
}

async function renderPage(page) {
  animeGrid.innerHTML = "<p>Loading page...</p>";
  const start = (page - 1) * itemsPerPage;
  const pageTitles = allTitles.slice(start, start + itemsPerPage);

  // get image and info from Kitsu API & Trailer from Jikan API
  const results = await Promise.all(
    pageTitles.map(async (title) => {
      try {
        const kitsuRes = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(title)}`);
        const kitsuData = await kitsuRes.json();
        const anime = kitsuData.data?.[0]?.attributes;
        const image = anime?.posterImage?.medium || "";
        const cleanDesc = (anime?.synopsis || "No description").replace(/\s+/g, " ").split(".")[0] + ".";

        const jikanRes = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`);
        const jikanData = await jikanRes.json();
        const trailer = jikanData.data?.[0]?.trailer?.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " anime trailer")}`;

        return { title, image, description: cleanDesc, trailer, episodeCount: anime?.episodeCount || "N/A" };
      } catch {
         return null;
        }
    })
  );

  animeGrid.innerHTML = "";

  results.forEach(anime => {
  if (!anime) return;

  // Create and fill the anime card
  const card = document.createElement("div");
  card.className = "anime-card";
  card.innerHTML = `
    <img src="${anime.image}" alt="${anime.title}">
    <h3>${anime.title}</h3>
    <p>${anime.description}</p>
     <p><strong>Episodes:</strong> ${anime.episodeCount || "N/A"}</p>
    <a href="${anime.trailer}" target="_blank" class="trailer-button">🎬 Watch Trailer</a>
  `;

  // Add Save button (watch later)
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "➕Add to playlist";
  saveBtn.className = "save-btn";
  saveBtn.style.marginTop = "8px";
  saveBtn.style.padding = "6px 12px";
  saveBtn.style.cursor = "pointer";

    // Check if Anime is already saved
  let watchLater = JSON.parse(localStorage.getItem("watchLaterList") || "[]");
  if (watchLater.includes(anime.title)) {
    saveBtn.textContent = "✅Saved";
  }
    // Button click Logic
  saveBtn.addEventListener("click", () => {
    watchLater = JSON.parse(localStorage.getItem("watchLaterList") || "[]");
    if (watchLater.includes(anime.title)) {
      watchLater = watchLater.filter(t => t !== anime.title);
      saveBtn.textContent = "➕Add to playlist";
    } else {
      watchLater.push(anime.title);
      saveBtn.textContent = "✅Saved";
    }
    localStorage.setItem("watchLaterList", JSON.stringify(watchLater));
     });

      //Add button to card
    card.appendChild(saveBtn);
    animeGrid.appendChild(card);
    });


  // Handle pagination buttons
  prevBtn.disabled = page === 1;
  nextBtn.disabled = (page * itemsPerPage) >= allTitles.length;
  }

// Pagination handlers
prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
  }
});

nextBtn.addEventListener("click", () => {
  if ((currentPage * itemsPerPage) < allTitles.length) {
    currentPage++;
    renderPage(currentPage);
  }
});

// Start loading the page
loadAllTitles();
