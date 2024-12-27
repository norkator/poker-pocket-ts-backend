# ⚠️ WORK  IN PROGRESS ⚠️

![poker_pocket_promo](./poker_pocket.png)

# Poker Pocket Typescript Backend

Nitramite Poker Pocket back end server was developed to run poker games. It's powering
[Nitramite Poker Pocket game](https://pokerpocket.nitramite.com/). This back end is pretty lightweight
and can run thousands of rooms easily.

This ts version replaces old js version https://github.com/norkator/poker-pocket-backend.

### Testing it out

Todo...

[comment]: <> (Here's list of different front end clients. You may want to take a look at them to
[comment]: <> (see what it's all about.
[comment]: <> (
[comment]: <> (* React Web UI: https://pokerpocket.nitramite.com/
[comment]: <> (    * React Web UI source code: https://github.com/norkator/poker-pocket-react-client
[comment]: <> (        * Based on old UI https://github.com/norkator/poker-pocket-web-client
[comment]: <> (        * React version is originally developed by [linus2code](https://github.com/linus2code)

### Prerequisites

* Download handRanks.dat file
  from: [https://github.com/christophschmalhofer/poker/blob/master/XPokerEval/XPokerEval.TwoPlusTwo/HandRanks.dat](https://github.com/christophschmalhofer/poker/blob/master/XPokerEval/XPokerEval.TwoPlusTwo/HandRanks.dat)  
  and place it under `/src` folder.

### Basic setup

1. Run `npm install`
2. Run `npm run start:dev` on development environment (uses nodemon)
3. Backend is now running.
4. Set up frontend https://github.com/norkator/poker-pocket-react-client
    * Or open https://pokerpocket.nitramite.com/ and use connection switch set as `dev` to open connection
      to localhost web socket.

### Note

`.gitignore` file is set to ignore `HandRanks.dat` which is big file.

## Authors

* **Martin Kankaanranta** - *Initial work* - [norkator](https://github.com/norkator)

## Contributors

None for ts version.

For old js version which this repository is based:

### [shrpne](https://github.com/shrpne)

* [Commits](https://github.com/norkator/poker-pocket-backend/commits?author=shrpne)

### [linus2code](https://github.com/linus2code)

* [Commits](https://github.com/norkator/poker-pocket-backend/commits?author=linus2code)
* Created [React version](https://github.com/linus2code/poker-pocket-react-client) of Web UI

## License

MIT
