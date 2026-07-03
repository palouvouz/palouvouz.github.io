document.addEventListener("DOMContentLoaded", () => {
    console.log("Palouvouz portfolio loaded");

    const cards = document.querySelectorAll(".card");

    cards.forEach(card => {
        card.addEventListener("mouseenter", () => {
            card.classList.add("card-hover");
        });

        card.addEventListener("mouseleave", () => {
            card.classList.remove("card-hover");
        });
    });
});