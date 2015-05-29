// A collection for regions
var _ = require('lodash')
var util = require('./../../common/util.js')

var regions = {}
regions.all = {}
regions.set = function (name, counties) {
  var region = {}
  region.name = name
  region.isCurrent = false
  region.counties = counties
  this.all[name] = region
  return this
}
regions.contains = function (region) {
  return util.isPresent(regions.all[region])
}
regions.setCurrent = function (name) {
  var current
  _.each(this.all, function (region) {
    if (region.name === name) {
      current = region
      region.isCurrent = true
    }

    region.isCurrent = false
  }).bind(this))
  return current
}

regions.set('northwest', [
  'colbert',
  'lauderdale',
  'franklin',
  'lawrence'
])
regions.set('northeast', [
  'limestone',
  'madison',
  'jackson',
  'morgan',
  'marshall',
  'dekalb'
])
regions.set('mid', [
  'cullman',
  'blount',
  'jefferson',
  'walker',
  'shelby'
])
regions.set('midwest', [
  'marion',
  'lamar',
  'fayette',
  'winston',
  'walker',
  'pickens',
  'tuscaloosa'
])
regions.set('mideast', [
  'cherokee',
  'etowah',
  'talladega',
  'calhoun',
  'clay',
  'randolph',
  'cleburne'
])

module.exports = regions
