const axios = require("axios");
const { Network, Alchemy } = require("alchemy-sdk");

const settings = {
  apiKey: "KinoxPmmbfEPF81q83UIWQWrRRzVWABM",
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(settings);

const query = `
{
  user(id: "0x76c9985d294d9aeadd33f451bfb59bc69b20c474") {
    liquidityPositions {
      pair {
        id
        token0 {
          totalSupply
          symbol
          tradeVolume
          id
        }
        token0Price
        token1Price
        token1 {
          symbol
          totalSupply
          tradeVolume
          id
        }
        volumeUSD
        untrackedVolumeUSD
        totalSupply
        volumeToken0
        volumeToken1
      }
      liquidityTokenBalance
    }
  }
}
`;

async function getUserData() {
  // Make a request to the The Graph API to get the user's liquidity positions data
  const response = await axios.post(
    "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",
    {
      query,
    }
  );

  // Get the liquidity positions data
  const liquidityPositions = response.data.data.user.liquidityPositions;

  // Create a set to store unique transactions
  const uniqueTransactions = new Set();
  // Loop through each liquidity position
  liquidityPositions.forEach(async (position) => {
    // If the user has a non-zero balance in the liquidity token
    if (position.liquidityTokenBalance !== "0") {
      // Get the ID of the pool
      const id = position.pair.id;

      // Make a call to the Alchemy API to get the transactions data
      const res = await alchemy.core.getAssetTransfers({
        fromBlock: "0x0",
        fromAddress: "0x76c9985d294d9aeadd33f451bfb59bc69b20c474",
        // pass the id gotten from the liquidity position data and pass it as a parameter
        toAddress: id,
        excludeZeroValue: true,
        category: ["erc20", "erc1155", "external", "internal"],
      });

      // Loop through each transaction
      var bal = 0;
      var bal2 = 0;

      for (let i = 0; i < res.transfers.length; i++) {
        async function processTransactions() {
          let txn = res.transfers[i];
          // If the transaction is unique
          if (!uniqueTransactions.has(txn.hash)) {
            // Add the transaction hash to the set of unique transactions
            uniqueTransactions.add(txn.hash);
            const txnHash = txn.hash;
            const mintResponse = await axios.post(
              "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",
              {
                query: `{
              mint(
                id: "${txnHash}-0"
              ) {
                timestamp
                amount0
                amount1
              }
            }`,
              }
            );
            // Get the mint data
            const mint = mintResponse.data.data.mint;
            // If the mint data exists
            if (mint) {
              const timestamp = mint.timestamp;

              const day = Math.floor(timestamp / 86400);
              const response0 = await axios.post(
                "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",
                {
                  query: `{
                 tokenDayData(id: "${position.pair.token0.id}-${day}")  {
                  priceUSD
                }
                 
              }`,
                }
              );
              const response1 = await axios.post(
                "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",
                {
                  query: `{
                 tokenDayData(id: "${position.pair.token1.id}-${day}")  {
                  priceUSD
                }
                 
              }`,
                }
              );
                const priceUSD = response0.data.data.tokenDayData.priceUSD;
                const priceUSD1 = response1.data.data.tokenDayData.priceUSD;

              // Convert the timestamp to a human-readable date and time
              const currentTime = new Date();
              const timed = new Date(timestamp * 1000);
              const difference = currentTime - timed;
              const time = difference / (365.25 * 24 * 60 * 60 * 1000);
              // Calculate the final token0 price
              const token0price =
                position.pair.token1Price * position.pair.token0Price;

              function totalReturn(initialInvestment = (mint.amount0 * 1), initialPrice1 = priceUSD, initialPrice2 = priceUSD1, currentPrice1 = position.pair.token1Price, currentPrice2 = token0price.toFixed(), amount1 = mint.amount0, amount2 = mint.amount1, timeSinceInvestment = time) {
                const L = Math.sqrt(amount1 * amount2);
                const L_0 = Math.sqrt(position.pair.token0Price * position.pair.token1Price);
                const α = ((currentPrice1 * currentPrice2) / (initialPrice1 * initialPrice2))
                const C = initialInvestment;
                const tradingFeesReturn = Math.exp(α * timeSinceInvestment) - 1;
                const priceVariationReturn = Math.sqrt(currentPrice2 / initialPrice2) - 1;
                const impermanentLoss = 1 - L / (amount1 * currentPrice1 + amount2 * currentPrice2);

                return ((C) + (tradingFeesReturn * 1) + (priceVariationReturn * 1) - impermanentLoss)
              }
              bal += totalReturn();
              if (txn[i] == res.transfers[res.transfers.length]) {
                console.log(bal)
              }
              else {}

              function totalReturn2(initialInvestment = (mint.amount1 * 1), initialPrice1 = position.pair.token0Price, initialPrice2 = position.pair.token0Price, currentPrice1 = position.pair.token1Price, currentPrice2 = token0price.toFixed(), amount1 = mint.amount0, amount2 = mint.amount1, timeSinceInvestment = 1.5) {
                const L = Math.sqrt(amount1 * amount2);
                const L_0 = Math.sqrt(position.pair.token0Price * position.pair.token1Price);
                const α = ((currentPrice1 * currentPrice2) / (initialPrice1 * initialPrice2))
                const C = initialInvestment;
                const tradingFeesReturn = Math.exp(α * timeSinceInvestment) - 1;
                const priceVariationReturn = Math.sqrt(currentPrice2 / initialPrice2) - 1;
                const impermanentLoss = 1 - L / (amount1 * currentPrice1 + amount2 * currentPrice2);

                return ((C) + (tradingFeesReturn * 1) + (priceVariationReturn * 1) - impermanentLoss)
              }
              bal2 += totalReturn2();
              if (i = res.transfers.length) {
                console.log(bal2)
              }
              else {}
            }
          }
          return bal;
        }
        processTransactions()
      };
      console.log("Total balance of second Token " + bal2)
      console.log("Total balance of first Token " + bal)
    }
  });
}

getUserData();
