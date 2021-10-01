class GameState
{
    constructor(app)
    {
        this.app = app;
        this.game = app.game;
        this.room = app.io.in(app.game.id);
    }

    next()
    {

    }

    release()
    {

    }
}

module.exports = GameState;