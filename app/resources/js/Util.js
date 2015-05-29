/* global angular */
angular
  .module('Util', [
    // Dependencies
  ])
  .factory('Util', function (
    // Dependency Injections
  ) {
    var Util = {}

    Util.isDefined = function (val) {
      return (
        typeof (val) !== 'undefined' &&
        val !== null
      )
    }

    Util.isString = function (val) {
      return (
        Util.isDefined(val) &&
        typeof val === 'string'
      )
    }

    Util.isNumber = function (val) {
      if (!Util.isDefined(val)) return false
      if (typeof (val) === 'number') return true
      if ((typeof (val) === 'string') && (parseFloat(val) === val)) return true
      return false
    }

    Util.isPresent = function (val) {
      // `val` should be defined
      if (!Util.isDefined(val)) return false

      // Is `val` an Object or Array?
      var isObjectOrArray = (typeof (val) === 'object') || (val instanceof Object)
      if (isObjectOrArray) {
        // If length property exists and tells us at least one element or property is defined
        if (Util.isDefined(val.length)) return val.length > 0

        // If no length property (probably an Object) and at least one property is defined
        return (Object.keys(val).length > 0)
      }

      // All numbers are valid
      if (Util.isNumber(val)) return true

      // Any non-empty String is valid
      if (Util.isString(val) && (val.length > 0)) return true

      return false
    }

    return Util
  })
