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
        reserve0
        reserve1
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
  const uniqueBalance = new Set();

  // Loop through each liquidity position
  liquidityPositions.forEach(async (position) => {
    // If the user has a non-zero balance in the liquidity token
    if (position.liquidityTokenBalance !== "0") {
      // Get the ID of the pool
      const id = position.pair.id;

      const response = await axios.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${position.pair.token0.symbol}`, {
        headers: {
          'X-CMC_Pro_API_Key': '66d708d2-ad5b-4032-9885-b23fb4c6d8d0'
        }
      });

      const token0price = response.data.data[position.pair.token0.symbol].quote.USD.price;

      const response1 = await axios.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${position.pair.token1.symbol}`, {
        headers: {
          'X-CMC_Pro_API_Key': '66d708d2-ad5b-4032-9885-b23fb4c6d8d0'
        }
      });

      const token1price = response1.data.data[position.pair.token1.symbol].quote.USD.price;
      // console.log(token0price)
      // console.log(token1price)

      // Make a call to the Alchemy API to get the transactions data
      const res = await alchemy.core.getAssetTransfers({
        fromBlock: "0x0",
        fromAddress: "0x76c9985d294d9aeadd33f451bfb59bc69b20c474",
        // pass the id gotten from the liquidity position data and pass it as a parameter
        toAddress: id,
        excludeZeroValue: true,
        category: ["erc20", "erc1155", "external", "internal"],
      });

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

              const priceratio = (1.172)

              function totalReturn(constantProduct = (position.pair.reserve0 * position.pair.reserve1), priceRatio = priceratio, currentPrice1 = position.pair.token0Price) {
                const impermanentLoss = (((2 * Math.sqrt(priceRatio)) / (1 + priceRatio)) - 1) / 100;
                const impermanentLoss2 = (priceRatio - 1) / 100;
                const balance1 = (Math.sqrt(constantProduct * currentPrice1))
                return (balance1 - (impermanentLoss2 * balance1))
              }
              if (!uniqueBalance.has(Math.ceil(totalReturn() / 1000000) * 1000000)) {
                uniqueBalance.add(Math.ceil(totalReturn() / 1000000) * 1000000)
                console.log(totalReturn())
              }


              function totalReturn2(constantProduct = (position.pair.reserve0 * position.pair.reserve1), priceRatio = priceratio, currentPrice1 = position.pair.token0Price) {
                const impermanentLoss = (priceRatio - 1) / 100;
                const balance2 = (Math.sqrt(constantProduct / currentPrice1))
                return (balance2 - (impermanentLoss * balance2))
              }
              if (!uniqueBalance.has(Math.ceil(totalReturn2() / 100000) * 100000)) {
                uniqueBalance.add(Math.ceil(totalReturn2() / 100000) * 100000)
                console.log(totalReturn2())
              }
            }
          }
        }
        processTransactions()
      };
    }
  });
}

getUserData();
