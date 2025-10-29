// Temporary example data (we’ll fetch from Firebase later)
const freeBooks = [
  { title: "Love, Rejoice", desc: "Healing poetry collection", img: "book1.jpg" },
  { title: "This Is Where", desc: "Short reflections and calm", img: "book2.jpg" }
];

const exclusiveBooks = [
  { title: "The Weight of Being", desc: "Poems of emotion and truth", img: "book3.jpg" }
];

const purchasedBooks = [
  { title: "Words of Insight", desc: "Wisdom in poetic form", img: "book4.jpg" }
];

function displayBooks(sectionId, books) {
  const container = document.getElementById(sectionId);
  books.forEach(book => {
    const card = document.createElement("div");
    card.classList.add("book-card");
    card.innerHTML = `
      <img src="${book.img}" alt="${book.title}" />
      <h3>${book.title}</h3>
      <p>${book.desc}</p>
      <a href="#">Read</a>
    `;
    container.appendChild(card);
  });
}

// Display mock data
displayBooks("free-books", freeBooks);
displayBooks("exclusive-books", exclusiveBooks);
displayBooks("purchased-books", purchasedBooks);
displayBooks("library-books", [...freeBooks, ...purchasedBooks]);
