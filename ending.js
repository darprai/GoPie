document.addEventListener('DOMContentLoaded', () => {
    const endingDiv = document.getElementById('ending');
    const finalImageContainer = document.getElementById('finalImage');
    const restartBtn = document.getElementById('restartBtn');

    // Funzione per mostrare l'immagine finale in modo automatico
    function showFinalImage() {
        // Carica l'immagine finale (Macchina.png, come richiesto nella sequenza di fine livello)
        const finalImage = new Image();
        finalImage.src = 'assets/sprites/macchina.png'; // L'immagine finale della sequenza
        finalImage.alt = 'Pie e la ragazza salgono in macchina';

        finalImage.onload = function() {
            finalImageContainer.innerHTML = ''; // Pulisce il contenitore
            finalImageContainer.appendChild(finalImage); // Mostra l'immagine
        };

        // Fallback per l'immagine non caricata (mostra un rettangolo blu)
        finalImage.onerror = function() {
            finalImageContainer.innerHTML = '<div style="width: 320px; height: 180px; background-color: #c0392b; margin: 12px auto; border-radius: 8px;">[Immagine Macchina Mancante]</div>';
        };
    }

    // Intercetta il momento in cui la schermata 'ending' viene visualizzata
    // Nota: Game.js gestisce il cambio di display
    // Poiché non abbiamo un evento diretto, ci affidiamo al click del restart per il riutilizzo,
    // e assumiamo che l'immagine venga mostrata al caricamento della pagina se siamo in quella schermata.
    
    // Per un'esecuzione immediata, chiamiamo la funzione qui.
    // In un ambiente di gioco reale, questa funzione verrebbe chiamata da game.js.
    showFinalImage(); 

    // Rimuoviamo l'evento listener per 'finalInput' che non è più necessario
    const inputElement = document.getElementById('finalInput');
    if (inputElement) {
        inputElement.style.display = 'none'; // Nasconde l'input
    }
    
    restartBtn.addEventListener('click', () => {
        endingDiv.style.display = 'none';
        document.getElementById('menu').style.display = 'block';
        // Assicurati che il gioco sia pronto a ripartire
        localStorage.setItem('pie_level', '0'); 
    });
});

// Aggiungi un metodo per Game.js per triggerare la visualizzazione
window.showFinalScreen = () => {
    // La logica di visualizzazione è gestita dal listener DOMContentLoaded (sopra)
    // ma la chiamata qui può assicurare che l'immagine sia aggiornata se il gioco lo richiede
    document.getElementById('ending').style.display = 'block';
    document.getElementById('game').style.display = 'none';
    window.showFinalImage();
};
