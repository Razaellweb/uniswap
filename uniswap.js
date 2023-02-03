const axios = require("axios");
const { Network, Alchemy } = require("alchemy-sdk");

const settings = {
  apiKey: "",
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
        }
        token0Price
        token1Price
        token1 {
          symbol
          totalSupply
          tradeVolume
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
  const response = await axios.post(
    "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",
    {
      query,
    }
  );

  const liquidityPositions = response.data.data.user.liquidityPositions;
  const uniqueTransactions = new Set();
  liquidityPositions.forEach(async (position) => {
    if (position.liquidityTokenBalance !== "0") {
      const id = position.pair.id;

      const res = await alchemy.core.getAssetTransfers({
        fromBlock: "0x0",
        fromAddress: "0x76c9985d294d9aeadd33f451bfb59bc69b20c474",
        toAddress: id,
        excludeZeroValue: true,
        category: ["erc20", "erc1155", "external", "internal"],
      });
      res.transfers.forEach(async (txn) => {
        if (!uniqueTransactions.has(txn.hash)) {
          uniqueTransactions.add(txn.hash);
          const txnHash = txn.hash;
          const mintResponse = await axios.post(
            "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",
            {
              query: `{
            mint(
              id: "${txnHash}-0"
            ) {
              amount0
              amount1
            }
          }`,
            }
          );
          const mint = mintResponse.data.data.mint;
          if (mint) {
            console.log("Transaction hash: ", txnHash);
            console.log(
              "Token0 amount: ",
              mint.amount0,
              position.pair.token0.symbol
            );
            const token0price =
              position.pair.token1Price * position.pair.token0Price;
           
            console.log("initial token0Price:", position.pair.token0Price);
            console.log("final token0Price:", position.pair.token1Price);
            console.log(
              "Token1 amount: ",
              mint.amount1,
              position.pair.token1.symbol
            );
            console.log("initial token1Price:", position.pair.token1Price);
            console.log("final token1Price:", token0price.toFixed());
            console.log("pool address:", id);
            console.log(" ");
            console.log(" ");
          }
        }
      });
    }
  });
}

getUserData();
