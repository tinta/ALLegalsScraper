/* global angular, _ */
angular
  .module('Highlight', [
    // Dependencies
    'ngSanitize'
  ])
  .factory('Highlight', function (
    // Dependency Injections
    $sce
  ) {
    var re = {}
    re.yyyy = '\\d\\d\\d\\d'
    re.mmmm = 'January|February|March|April|May|June|July|August|September|October|November|December'
    re.dd = '[0123]\\d'
    re.mm = '[01]\\d'

    re.wrapInSpan = function (className) {
      return [
        '<span class="pad-lr text-white text-thin', className, '">',
        '$&',
        '</span>'
      ].join(' ')
    }

    var highlightMap = {
      'bg-red': [
        'alabama',
        '(?:\\s)al(?:\\s)',
        '(?:\\w*\\s)county'
      ],
      'bg-orange': [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
        '(?:\\s)' + re.yyyy + '(?:\\s|,)',
        '(' + re.mm + '\\/' + re.dd + '\\/\\d\\d)(?:\\s|,)'
      ],
      'bg-blue': [
        "attorney('?)(s?)",
        'courthouse',
        '((?:\\s)(\\S{4,30})(?:\\s)(inc)(\\s|,|\\.))',
        '((?:\\s)(\\S{4,30})(?:\\s)(bank)(\\s|,|\\.))'
      ],
      'bg-green': [
        '3(\\d{4})(?:\\s)'
      ],
      'bg-purple': [
        '(?:\\s)circle(?:\\s)',
        '(?:\\s)cir(?:\\s)',
        '(?:\\s)drive(?:\\s)',
        '(?:\\s)dr(?:\\s)',
        '(?:\\s)road(?:\\s)',
        '(?:\\s)rd(?:\\s)',
        '(?:\\s)avenue(?:\\s)',
        '(?:\\s)ave(?:\\s)',
        '(?:\\s)highway(?:\\s)',
        '(?:\\s)street(?:\\s)',
        '(?:\\s)st(?:\\s)',
        '(?:\\s)trail(?:\\s)'
      ]
    }

    var Highlight = function (text) {
      _.each(highlightMap, function (highlightList, key) {
        _.each(highlightList, function (patten) {
          var regex = new RegExp(patten, 'gi')
          text = text.replace(regex, re.wrapInSpan(key))
        })
      })

      text = '<span>' + text + '</span>'

      return $sce.trustAsHtml(text)
    }

    return Highlight
  })
