'use strict'
/**
 * Description:
 * Hubot Script to call / book an Uber
 */

var request, key, url, uber_server_token, uber_client_id, uber_client_secret, base_api

request = require('request')
key = '&key=AIzaSyBgswJA88oc-lWZvxThxQ1QUZ3uYi-gDJ0'
url = 'https://maps.googleapis.com/maps/api/geocode/json?address='
uber_server_token = process.env.UBER_SERVER_TOKEN
uber_client_id = process.env.UBER_CLIENT_ID
uber_client_secret = process.env.UBER_CLIENT_SECRET
base_api = 'https://api.uber.com/v1/'

module.exports = function (robot) {
  robot.respond(/products/i, function (res) {
    if (!uber_server_token) {
      res.send('Missing environment variable UBER_SERVER_TOKEN')
      return
    }

    res.reply('Checking with Uber for products in the location ...')

    var query = res.message.text.split(' ')
    var loc = query.indexOf('near')
    var location = query.slice(loc + 1)
    getLocation(location, function (err, coords) {
      var query = base_api + 'products?latitude=' + coords.lat + '&longitude=' + coords.lng
      request.get({
        url: query,
        headers: { 'Authorization': 'Token ' + uber_server_token },
        json: true
      }, function (err, resp, body) {
        var products = body.products
        products.forEach(function (product) {
          var price_details = product.price_details
          res.send('*' + product.display_name + '*, Capacity : ' + product.capacity)
          res.send('Minimum Fare : ' + price_details.currency_code + ' ' + price_details.minimum)
          res.send('Fare : ' + price_details.currency_code + ' ' + price_details.cost_per_distance + '/' + price_details.distance_unit)
        })
      })
    })
  })

  robot.respond(/calculate cost from (.*) to (.*)/i, function (res) {
    if (!uber_server_token) {
      res.send('Missing environment variable UBER_SERVER_TOKEN')
    }
    res.reply('Checking with Uber on prices ...')
    var fromL = res.match[1]
    var toL = res.match[2]
    getLocation(fromL, function (err, c1) {
      getLocation(toL, function (err, c2) {
        var query = base_api + 'estimates/price'
        var params = {
          start_latitude: c1.lat,
          start_longitude: c1.lng,
          end_latitude: c2.lat,
          end_longitude: c2.lng
        }
        request.get({
          url: query,
          qs: params,
          headers: { 'Authorization': 'Token ' + uber_server_token },
          json: true
        }, function (err, resp, body) {
          var prices = body.prices
          if (prices.length > 0) {
            prices.forEach(function (price) {
              res.send('*' + price.display_name + '* : ' + price.estimate + ' for the distance of ' + price.distance + ' KMs')
            })
          } else {
            res.send('Locations are a bit vague for Uber to understand. Can you ask again?')
          }
        })
      })
    })
  })
}

/**
 * function to get lat and long from text
 */
function getLocation (message, cb) {
  var query = url + encodeURIComponent(message) + key
  var results = ''
  request.get({url: query, json: true }, function (err, resp, body) {
    var coords = body.results[0].geometry.location
    cb(null, coords)
  })
}
