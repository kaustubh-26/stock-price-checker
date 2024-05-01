'use strict';

const StockModel = require('../models/Stock').Stock;
const fetch = require('node-fetch');

async function getStockDetails(stock) {
  const response = await fetch(
    `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`
  );
  const { symbol, latestPrice } = await response.json();
  return { symbol, latestPrice };
}

async function findRecord(stock) {
  return await StockModel.findOne({ symbol: stock }).exec();
}

async function createRecord(stock, like, ip) {
  const newStock = new StockModel({
    symbol: stock,
    likes: like ? [ip] : [],
  });
  const savedData = await newStock.save();
  return savedData;
}

async function saveStockData(stock, like, ip) {
  let savedData = {};
  const foundStock = await findRecord(stock);
  if (!foundStock) {
    const newStock = await createRecord(stock, like, ip);
    savedData = newStock;
    return savedData;
  } else {
    if (like && foundStock.likes.indexOf(ip) === -1) {
      foundStock.likes.push(ip);
    }
    savedData = await foundStock.save();
    return savedData;
  }
}

module.exports = function (app) {
  app.route('/api/stock-prices').get(async function (req, res) {
    const { stock, like } = req.query;
    if (Array.isArray(stock)) {
      console.log('Stocks:', stock);

      const { symbol, latestPrice } = await getStockDetails(stock[0]);
      const { symbol: symbol2, latestPrice: latestPrice2 } =
        await getStockDetails(stock[1]);

      const stockOneData = await saveStockData(
        stock[0].toUpperCase(),
        like,
        req.ip
      );
      const stockTwoData = await saveStockData(
        stock[1].toUpperCase(),
        like,
        req.ip
      );

      let stockData = [];
      if (!symbol) {
        stockData.push({
          rel_likes: stockOneData.likes.length - stockTwoData.likes.length,
        });
      } else {
        stockData.push({
          stock: symbol,
          price: latestPrice,
          rel_likes: stockOneData.likes.length - stockTwoData.likes.length,
        });
      }

      if (!symbol2) {
        stockData.push({
          rel_likes: stockTwoData.likes.length - stockOneData.likes.length,
        });
      } else {
        stockData.push({
          stock: symbol2,
          price: latestPrice2,
          rel_likes: stockTwoData.likes.length - stockOneData.likes.length,
        });
      }

      res.json({
        stockData,
      });
      return;
    }
    const { symbol, latestPrice } = await getStockDetails(stock);
    console.log('symbol:', symbol);
    if (!symbol) {
      res.json({ stockData: { likes: like ? 1 : 0 } });
      return;
    }

    const stockData = await saveStockData(symbol, like, req.ip);

    res.json({
      stockData: {
        stock: symbol,
        price: latestPrice,
        likes: stockData.likes.length,
      },
    });
  });
};
