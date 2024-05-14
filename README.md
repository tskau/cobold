# cobold

telegram bot for downloading video & audio files from 
[many services](https://github.com/imputnet/cobalt#supported-services), 
powered by [cobalt](https://github.com/imputnet/cobalt).

## running

- install dependencies using project's dependency manager - pnpm:
  ```bash
  pnpm install
  ```
- populate `.env` with required env variables based on `.env.example`
- build the code
  ```bash
  pnpm build
  ```
- start the bot
  ```bash
  pnpm start
  ```
  
> note: if you're using docker, don't forget to mount sqlite.db database file! 
  
## license

this project is licensed under the [mit license](LICENSE)
