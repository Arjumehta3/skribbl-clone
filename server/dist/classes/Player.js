export class Player {
    id; // socket.id
    name;
    score = 0;
    hasGuessed = false;
    isHost = false;
    isReady = false;
    constructor(id, name, isHost = false) {
        this.id = id;
        this.name = name.trim().slice(0, 20); // max 20 characters
        this.isHost = isHost;
    }
    addScore(points) {
        this.score += points;
    }
    // Har naye round se pehle call hoga
    resetForRound() {
        this.hasGuessed = false;
    }
    // Play again par call hoga
    resetForGame() {
        this.score = 0;
        this.hasGuessed = false;
        this.isReady = false;
    }
    // Client ko sirf safe data bhejo
    toDTO() {
        return {
            id: this.id,
            name: this.name,
            score: this.score,
            hasGuessed: this.hasGuessed,
            isHost: this.isHost,
            isReady: this.isHost || this.isReady, // host hamesha ready maana jata hai
        };
    }
}
