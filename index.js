const express = require("express");
var cors = require("cors");
const Moralis = require("moralis").default;
const { EvmChain } = require("@moralisweb3/common-evm-utils");
require("dotenv").config();
const {
  HealthcheckerSimpleCheck,
} = require("nodejs-health-checker/dist/healthchecker/healthchecker");
const abiTheGallerySales = require("./json/TheGallerySales.json");

Moralis.start({
  apiKey: process.env.REACT_APP_MORALIS_API_KEY,
});

const chain = EvmChain.MUMBAI;
const saleAddress = "0x7f427351a26BAE87680772049F697ebFA161C962";
const mintAddress = "0xcB45f1F29cA5bbCdbE297e072D99aFf6eC4F06D2";

const app = express();
const port = 3002;
const host = "0.0.0.0";

app.use(
  cors({
    origin: "*",
  })
);

app.listen(port, host, () =>
  console.log(`Listening on host ${host} and port ${port}`)
);

app.get("/", (req, res) => {
  res.send(`Server is ready and listening on port ${port}`);
});

app.get("/api/health-checker", (req, res) => {
  res.send(HealthcheckerSimpleCheck());
});

app.get("/api/getAllNFTs", async (req, res) => {
  try {
    const NFTs = await Moralis.EvmApi.nft.getContractNFTs({
      chain,
      address: mintAddress,
    });

    for (const NFT of NFTs?.result) {
      if (!NFT.tokenUri) {
        reSyncMetadata(NFT.tokenId);
      }
    }

    const result = NFTs?.result;

    return res.status(200).json({ result });
  } catch (e) {
    console.error(e);
    return res.status(400).json();
  }
});

app.get("/api/getNFTsByArtist", async (req, res) => {
  try {
    const { query } = req;

    const queryArtistId = query.artistId;

    const NFTs = await Moralis.EvmApi.nft.getContractNFTs({
      chain,
      address: mintAddress,
    });

    const NFTsByArtist = [];

    for (const NFT of NFTs?.result) {
      if (!NFT.tokenUri) {
        reSyncMetadata(NFT.tokenId);
      }

      const artistId =
        NFT.metadata.attributes[7].value +
        "-" +
        NFT.metadata.attributes[6].value;

      const artworkId = NFT.metadata["artwork-id"];

      if (artistId === queryArtistId && artworkId === 1) {
        NFTsByArtist.push(NFT);
      }
    }

    const result = NFTsByArtist;

    return res.status(200).json({ result });
  } catch (e) {
    console.error(e);
    return res.status(400).json();
  }
});

app.get("/api/getNftsByCollection", async (req, res) => {
  try {
    const { query } = req;

    const queryArtistId = query.artistId;

    const queryCollectionName = query.CollectionId;

    const NFTs = await Moralis.EvmApi.nft.getContractNFTs({
      chain,
      address: mintAddress,
    });

    const NFTSByCollection = [];

    for (const NFT of NFTs?.result) {
      if (!NFT.tokenUri) {
        reSyncMetadata(NFT.tokenId);
      }

      const artistId =
        NFT.metadata.attributes[7].value +
        "-" +
        NFT.metadata.attributes[6].value;

      const collectionName = NFT.metadata.attributes[8].value;

      if (
        artistId === queryArtistId &&
        collectionName === queryCollectionName
      ) {
        NFTSByCollection.push(NFT);
      }
    }

    const result = NFTSByCollection;

    return res.status(200).json({ result });
  } catch (e) {
    console.error(e);
    return res.status(400).json();
  }
});

app.get("/api/getNFTByArtwork", async (req, res) => {
  try {
    const { query } = req;
    const queryArtistId = query.artistId;
    const queryArtworkName = query.artworkName.replaceAll("-", " ");
    const NFTsByArtwork = [];
    var result;

    const NFTs = await Moralis.EvmApi.nft.getNFTOwners({
      chain,
      address: mintAddress,
    });

    for (const NFT of NFTs?.result) {
      const artistId =
        NFT.metadata.attributes[7].value +
        "-" +
        NFT.metadata.attributes[6].value;

      const artworkName = NFT.metadata.name;

      if (artistId === queryArtistId && artworkName === queryArtworkName) {
        NFTsByArtwork.push(NFT);
      }
    }

    NFTsByArtwork.sort((a, b) => {
      return a.metadata["artwork-id"] - b.metadata["artwork-id"];
    });

    for (let i = 0; i < NFTsByArtwork.length; i++) {
      const owner = NFTsByArtwork[i].ownerOf._value;

      if (owner === saleAddress) {
        result = NFTsByArtwork[i];
        break;
      } else if (i === NFTsByArtwork.length - 1 && owner !== saleAddress) {
        result = NFTsByArtwork[0];
        result._data.soldOut = true;
      }
    }

    return res.status(200).json({ result });
  } catch (e) {
    console.error(e);
    return res.status(400).json();
  }
});

app.get("/api/getNFTsByUser", async (req, res) => {
  try {
    const { query } = req;
    const walletAddress = query.walletAddress;
    const NFTsByUser = [];

    const NFTs = await Moralis.EvmApi.nft.getNFTOwners({
      address: mintAddress,
      chain,
    });

    for (const NFT of NFTs?.result) {
      if (!NFT.tokenUri) {
        reSyncMetadata(NFT.tokenId);
      }

      const owner = NFT.ownerOf._value;

      if (owner === walletAddress) {
        NFTsByUser.push(NFT);
      }
    }

    const result = NFTsByUser;

    return res.status(200).json({ result });
  } catch (e) {
    console.error(e);
    return res.status(400).json();
  }
});

async function reSyncMetadata(tokenId) {
  return await Moralis.EvmApi.nft
    .reSyncMetadata({
      address: mintAddress,
      chain,
      tokenId,
      mode: "sync",
    })
    .then(() => {})
    .catch((error) => console.log(error));
}
