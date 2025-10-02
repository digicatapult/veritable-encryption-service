# veritable-encryption-service

## Description

An API facilitating encryption and storage for Digital Catapult's [Veritable](https://github.com/digicatapult/veritable-documentation) SSI solution.

## Configuration

Use a `.env` at root of the repository to set values for the environment variables defined in `.env` file.

| variable  | required | default | description                                                                          |
| :-------- | :------: | :-----: | :----------------------------------------------------------------------------------- |
| PORT      |    N     | `3000`  | The port for the API to listen on                                                    |
| LOG_LEVEL |    N     | `info`  | Logging level. Valid values are [`trace`, `debug`, `info`, `warn`, `error`, `fatal`] |

## Getting started

```sh
# install packages
npm i
# start service in dev mode
npm run dev
```

View OpenAPI documentation for all routes with Swagger at http://localhost:3000/swagger/

## Tests

Unit tests are executed by calling:

```sh
npm run test:unit
```

Integration tests are executed by calling:

```sh
npm run tsoa:build
npm run test:integration
```
