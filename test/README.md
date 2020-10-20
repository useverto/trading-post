## Verto Test Suite

Source inside this directory contains the test suite for Verto's trading post containing unit tests with Mocha & integration tests with Golang.

### Unit tests

Unit tests are for the testing the core functionality of the trading posts individually. It contains tests for database, logger, arweave handler and other internal utils.

### Integration tests

Designed to test the trading post by simulating a real-life non-node environment. It is automated via Go to avoid any kind of source manipulation and testing end-to-end. It _will_ contain tests for installers, CLI, starting the trading post, sending orders, retrieving order book and gracefully shutting down the trading post without data/db corruption.
