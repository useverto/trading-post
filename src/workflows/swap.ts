async function ethSwap() {
  // AR Incoming
  //   Not recursive
  //   Save to DB
  //
  //
  // ETH Incoming
  //   Recursive
  //   Find first order in orderbook
  //   Calculate gas fee to send
  //   Subtract gas fee from incoming ETH amount (gETH)
  //   Match
  //     if gETH === order
  //       Remove order from DB
  //       Send ETH/AR in corresponding locations & confirmation transactions
  //       DONE
  //     if gETH < order
  //       Subtract gETH amount from order (AKA increment matched amount)
  //       Send ETH/AR in corresponding locations & confirmation transactions
  //       DONE
  //     if gETH > order
  //       Remove order from DB
  //       Send ETH/AR in corresponding locations & confirmation transactions
  //       Call function again with updated gETH amount
}
