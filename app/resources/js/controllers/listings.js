/* global angular, _, moment, $ */
angular.module('Controller:Listings', [
  // Dependencies
  'ngTable',
  'RowModel',
  'Highlight'
], function ($interpolateProvider) {
  $interpolateProvider.startSymbol('[[')
  $interpolateProvider.endSymbol(']]')
})
  .controller('Controller:Listings', function (
    // Dependency Injections
    $scope,
    $http,
    $timeout,
    $window,
    $filter,
    NgTableParams,
    RowModel,
    Highlight
  ) {
    // Format data
    var dateFormat = 'M/D/YYYY'

    // Timeframes
    $scope.timeframes = {}
    $scope.timeframes.all = window.timeframes
    $scope.timeframes.current = _.find(window.timeframes, {isCurrent: true})

    // Regions
    $scope.regions = {}
    $scope.regions.all = window.regions
    $scope.regions.current = _.find(window.regions, {isCurrent: true})

    // Listings
    $scope.listings = setAll($window.listings)

    function setAll (listings) {
      var _listings = []
      _.each(listings, function (listing, index) {
        _listings[index] = createRow(listing, index)
      })
      return _listings
    }

    function createRow (listing, index) {
      var row = _.merge({}, listing)
      row.pub_date = moment(listing.pub_date).utcOffset(0).format(dateFormat)
      row.sale_date = moment(listing.sale_date).utcOffset(0).format(dateFormat)
      row.sale_date_sort = moment(listing.sale_date).utcOffset(0).toDate()
      row.timestamp = moment(listing.timestamp).utcOffset(0).format(dateFormat)
      row.index = index
      return row
    }

    // `ng-table` config
    var initTableOptions = {}
    initTableOptions.page = 1      // Show first page
    initTableOptions.count = 15    // Amount of rows per page
    initTableOptions.sorting = {    // Initial sorting settings
      'sale_date_sort': 'asc'
    }
    initTableOptions.filter = {}

    $scope.tableParams = new NgTableParams(initTableOptions, {
      counts: [],
      total: $scope.listings.length, // length of data
      getData: function ($defer, params) {
        // Filter through the rows
        var filteredData = (function () {
          var filters = params.filter()
          if (filters) {
            if (filters['county']) {
              window.location.hash = '#/' + filters['county']
            }
            return $filter('filter')($scope.listings, filters)
          }
          return $scope.listings
        })()

        // Let pagination know what the new number of rows are
        params.total(filteredData.length)

        // Then sort the rows
        var orderedData = params.sorting() ?
          $filter('orderBy')(filteredData, params.orderBy()) :
          filteredData

        var data = orderedData.slice(
          (params.page() - 1) * params.count(),
          params.page() * params.count()
        )

        $defer.resolve(data)
      }
    })

    // Set `county` field to value of hash if hash argument exists
    var hash = window.location.hash
    if (hash.substring(0, 2) === '#/') {
      $scope.tableParams.filter()['county'] = hash.substring(2, hash.length)
    }

    // Detail modal
    var Modal = function () {
      var modal = {}
      modal.data = null
      modal.isOpen = false
      modal.saveSucceeded = null
      modal.open = function (listingIndex) {
        var listing = $scope.listings[listingIndex]

        // Work-around for text-highlighting in `body`
        var edit = _.omit(listing, ['body'])

        this.data = new RowModel(edit)
        this.data.initiateEdit()
        this.data.body = Highlight(listing.body)
        this.isOpen = true
      }
      modal.close = function () {
        this.data = null
        this.saveSucceeded = null
        this.isOpen = false
        this.remove.text = 'Delete'
        this.remove.action = this.remove.init
      }
      modal.abortEdit = function () {
        this.data.abortEdit()
        this.saveSucceeded = null
        this.data.initiateEdit()
      }
      modal.save = function () {
        var This = this
        var postBody

        if (!this.data.editForm.all.isUnchanged()) {
          this.data.attemptEdit()

          postBody = this.data.model

          postBody.pub_date = moment(this.data.model.pub_date, dateFormat).format()
          postBody.sale_date = moment(this.data.model.sale_date, dateFormat).format()

          // Angular's `$http` service isnt allowing us to post data to the express server for some reason...
          $.ajax({
            method: 'POST',
            url: '/update',
            data: postBody,
            success: function (data) {
              var oldRow = _.find($scope.listings, {case_id: data.case_id})
              var newRow = _.merge(oldRow, createRow(data, oldRow.index))
              $scope.listings[oldRow.index] = newRow
              This.open(newRow.index)
              This.saveSucceeded = true
              $scope.$apply()
            },
            error: function (err) {
              This.saveSucceeded = false
              console.log(err)
            }
          })
        }
      }
      modal.remove = {}
      modal.remove.text = 'Delete'
      modal.remove.init = function () {
        this.text = 'Positive?'
        this.action = this.remove
      }
      modal.remove.action = modal.remove.init
      modal.remove.remove = function () {
        var postBody = modal.data.model
        var uid = postBody.uid
        $.ajax({
          method: 'POST',
          url: '/delete',
          data: postBody,
          success: function (data) {
            var oldRow = _.find($scope.listings, {uid: uid})
            $scope.listings.splice(oldRow.index, 1)
            $scope.tableParams.reload()
            modal.close()
            $scope.$apply()
          },
          error: function (err) {
            console.log(err)
          }
        })
      }

      return modal
    }

    $scope.modal = new Modal()

    // Dev
    window.logScope = function () {
      window.$scope = $scope
      console.log($scope)
    }
  })
