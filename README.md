# Item Build builder 

This for the Riot API 2.0 Challenge (League of Legends). 

I chose the item set category. I went into it with 2 design goals:
- Item Sets are really In Game Item Builds
- These 'In Game Item Builds' should be accessible and sharable.

Unfortunately I discovered this challenge when it was already under way, so time was a limiting factor. I ended up stripping things and focusing more on what I needed to have a running demo.

The demo is running [here](http://league-asdf12.rhcloud.com/#/).

#### Item Sets as Item Builds
I wanted to turn Item Sets more into this idea of Item Builds, that is that they can become in game guides. I find when I am playing I will tab out often to look up a guide or item build. 

What if besides the common 'Starting Items' row, and 'Recommended', we added more to it. For instance 'Starting against AD bruiser' row with another 'Starting against non-bruiser'. Or a 'Mid-game if winning' row.

#### Sharable and Accessible
Having Item Sets be sharable and accessible outside of the game client unlocks a lot more features. This allows people to download them and share them like guides, as well as having a backed up in the cloud collection of guides they can sync into their game without manually finding and installing each single one. And most importantly for this point, is the ability to find other players Item Sets. For instance maybe Faker decided to make a Item Set online, other people then can grab it too.

## Setup / Install
Requirements:
- Postgresql database server ( 9.4+ )
- Node.js (or io.js) and npm

1) After cloning the respository, setup `settings.json`, the entries should be obvious, it is for setting up the postgresql database, and riot api key.

2. Run `node script/initDB.js` to setup and prefill the database.
3. Run `node build.js deploy` to build all the javascript src files.
4. Finally run `NODE_ENV=production node index.js` and point your browser to `http://localhost:3000`