const Ending = (function() {
    const gameContainer = document.getElementById('game-container');
    const endingDiv = document.getElementById('ending');
    const menuDiv = document.getElementById('menu');
    const finalTitle = document.getElementById('finalTitle');
    const restartBtn = document.getElementById('restartBtn');

    function showWinScreen(message, score) {
        gameContainer.style.display = 'none';
        endingDiv.style.display = 'flex';
        finalTitle.textContent = message + ` Punti: ${score}`;
        // Qui puoi inserire la logica per mostrare l'immagine finale se necessario
    }
    
    function showLossScreen(message) {
         gameContainer.style.display = 'none';
         endingDiv.style.display = 'flex';
         finalTitle.textContent = `Game Over: ${message}`;
    }
    
    function restartGame() {
        endingDiv.style.display = 'none';
        menuDiv.style.display = 'flex';
        // Non avviare il gioco qui, lascia che Game.startNew() lo faccia dal menu
    }

    return {
        showWinScreen: showWinScreen,
        showLossScreen: showLossScreen,
        restartGame: restartGame
    };
})();

window.Ending = Ending;
